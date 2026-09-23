-- Agenda: turnos, disponibilidad y reservas (RF-80 y RF-81).
--
-- El entrenador declara en qué franjas atiende (lunes de 8 a 12, etc.) y el
-- cliente reserva adentro de esas franjas. La reserva queda pendiente hasta
-- que el entrenador la confirma; también puede cancelarla o moverla.
--
-- Las franjas se guardan como día de la semana y hora local, porque así las
-- piensa el entrenador ("los lunes a las 8"), y el turno como timestamptz,
-- que es un instante exacto. La zona horaria del entrenador es la que une
-- las dos cosas.

-- El nombre se valida en la app contra la lista del navegador: un CHECK no
-- puede consultar pg_timezone_names, y uno con now() no sería inmutable.
alter table public.entrenadores
  add column zona_horaria text not null default 'America/Montevideo'
    check (char_length(zona_horaria) between 1 and 60);

grant update (zona_horaria) on public.entrenadores to authenticated;

-- Franjas en las que el entrenador atiende. Se repiten todas las semanas.
create table public.disponibilidad (
  id uuid primary key default gen_random_uuid(),
  entrenador_id uuid not null default auth.uid() references public.entrenadores (id) on delete cascade,
  -- 1 = lunes … 7 = domingo, igual que en las rutinas.
  dia smallint not null check (dia between 1 and 7),
  desde time not null,
  hasta time not null,
  check (hasta > desde),
  unique (entrenador_id, dia, desde)
);

create index disponibilidad_entrenador_id_idx on public.disponibilidad (entrenador_id, dia);

-- Un turno. `cliente_id` en null es un bloqueo de agenda del entrenador
-- (vacaciones, un hueco que no quiere dar).
create table public.turnos (
  id uuid primary key default gen_random_uuid(),
  entrenador_id uuid not null default auth.uid() references public.entrenadores (id) on delete cascade,
  cliente_id uuid references public.clientes (id) on delete cascade,
  inicia_en timestamptz not null,
  -- Se guarda el fin, no la duración: `timestamptz + interval` depende de la
  -- zona horaria de la sesión, así que no se puede indexar ni chequear.
  termina_en timestamptz not null,
  check (termina_en - inicia_en between interval '5 minutes' and interval '8 hours'),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'confirmado', 'cancelado')),
  lugar text check (char_length(lugar) <= 200),
  nota text check (char_length(nota) <= 1000),
  pedido_por uuid default auth.uid() references public.perfiles (id) on delete set null,
  created_at timestamptz not null default now(),
  -- Un bloqueo de agenda no está "pendiente" de nadie.
  check (cliente_id is not null or estado <> 'pendiente')
);

create index turnos_entrenador_id_idx on public.turnos (entrenador_id, inicia_en);
create index turnos_cliente_id_idx on public.turnos (cliente_id, inicia_en);

-- Dos turnos del mismo entrenador no se pisan. Los cancelados no ocupan.
create extension if not exists btree_gist;

alter table public.turnos add constraint turnos_sin_solaparse
  exclude using gist (
    entrenador_id with =,
    tstzrange(inicia_en, termina_en) with &&
  ) where (estado <> 'cancelado');

-- ¿Ese rango cae entero dentro de una franja de disponibilidad? Se compara en
-- la hora local del entrenador, y en intervalos desde la medianoche, no en
-- `time`: sumarle una hora a las 23:30 daría las 00:30 y un turno que cruza
-- la medianoche entraría en una franja en la que no cabe.
create function privado.hay_disponibilidad(
  p_entrenador_id uuid, p_inicia_en timestamptz, p_termina_en timestamptz
) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with local as (
    select
      extract(isodow from p_inicia_en at time zone e.zona_horaria)::smallint as dia,
      (p_inicia_en at time zone e.zona_horaria)::time - time '00:00' as desde,
      (p_inicia_en at time zone e.zona_horaria)::time - time '00:00'
        + (p_termina_en - p_inicia_en) as hasta
    from public.entrenadores e
    where e.id = p_entrenador_id
  )
  select exists (
    select 1 from public.disponibilidad d, local l
    where d.entrenador_id = p_entrenador_id
      and d.dia = l.dia
      and l.desde >= d.desde - time '00:00'
      and l.hasta <= d.hasta - time '00:00'
  );
$$;

revoke execute on function privado.hay_disponibilidad(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function privado.hay_disponibilidad(uuid, timestamptz, timestamptz) to authenticated, service_role;

-- RLS -------------------------------------------------------------------------------

alter table public.disponibilidad enable row level security;
alter table public.turnos enable row level security;

revoke all on public.disponibilidad from anon, authenticated;
revoke all on public.turnos from anon, authenticated;

grant select, delete on public.disponibilidad to authenticated;
grant insert (dia, desde, hasta) on public.disponibilidad to authenticated;
grant update (dia, desde, hasta) on public.disponibilidad to authenticated;

grant select, delete on public.turnos to authenticated;
grant insert (entrenador_id, cliente_id, inicia_en, termina_en, estado, lugar, nota)
  on public.turnos to authenticated;
grant update (inicia_en, termina_en, estado, lugar, nota) on public.turnos to authenticated;

-- La disponibilidad la maneja el entrenador; la ven también sus clientes,
-- que necesitan saber qué horarios pedir.
create policy disponibilidad_select on public.disponibilidad for select to authenticated
  using (
    disponibilidad.entrenador_id = (select auth.uid())
    or disponibilidad.entrenador_id in (select privado.mis_entrenadores())
  );
create policy disponibilidad_insert on public.disponibilidad for insert to authenticated
  with check (disponibilidad.entrenador_id = (select auth.uid()) and (select privado.es_entrenador()));
create policy disponibilidad_update on public.disponibilidad for update to authenticated
  using (disponibilidad.entrenador_id = (select auth.uid()))
  with check (disponibilidad.entrenador_id = (select auth.uid()));
create policy disponibilidad_delete on public.disponibilidad for delete to authenticated
  using (disponibilidad.entrenador_id = (select auth.uid()));

-- El entrenador ve su agenda entera; el cliente, solo sus turnos.
create policy turnos_select on public.turnos for select to authenticated
  using (
    turnos.entrenador_id = (select auth.uid())
    or (turnos.cliente_id is not null and privado.soy_cliente(turnos.cliente_id))
  );
-- El entrenador agenda lo que quiera con sus clientes. El cliente reserva
-- para sí mismo, siempre pendiente y siempre dentro de una franja: la regla
-- vive acá, no en una función con permisos elevados ni en la pantalla. Que
-- dos turnos no se pisen lo garantiza turnos_sin_solaparse.
create policy turnos_insert on public.turnos for insert to authenticated
  with check (
    (
      turnos.entrenador_id = (select auth.uid())
      and (select privado.es_entrenador())
      and (turnos.cliente_id is null or privado.es_mi_cliente(turnos.cliente_id))
    )
    or (
      turnos.cliente_id is not null
      and privado.soy_cliente(turnos.cliente_id)
      and turnos.entrenador_id = privado.entrenador_de(turnos.cliente_id)
      and turnos.estado = 'pendiente'
      and privado.hay_disponibilidad(turnos.entrenador_id, turnos.inicia_en, turnos.termina_en)
    )
  );
create policy turnos_update on public.turnos for update to authenticated
  using (turnos.entrenador_id = (select auth.uid()))
  with check (
    turnos.entrenador_id = (select auth.uid())
    and (turnos.cliente_id is null or privado.es_mi_cliente(turnos.cliente_id))
  );
create policy turnos_delete on public.turnos for delete to authenticated
  using (turnos.entrenador_id = (select auth.uid()));

-- Lo único que el cliente cambia de un turno es cancelarlo, y una sola vez:
-- `using` deja afuera los ya cancelados, así no puede seguir tocándolos.
create policy turnos_cancela_cliente on public.turnos for update to authenticated
  using (
    turnos.cliente_id is not null
    and privado.soy_cliente(turnos.cliente_id)
    and turnos.estado <> 'cancelado'
  )
  with check (
    turnos.cliente_id is not null
    and privado.soy_cliente(turnos.cliente_id)
    and turnos.estado = 'cancelado'
  );
