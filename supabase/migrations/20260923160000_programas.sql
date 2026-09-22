-- Programas por semanas (RF-34).
--
-- Un programa es una plantilla larga: dice qué rutina va en qué semana y con
-- cuánto ajuste de carga respecto de la plantilla original ("la semana 3 va
-- 5% más pesada"). Al asignarlo a un cliente se copian todas las rutinas de
-- todas las semanas, ya ajustadas, igual que al asignar una plantilla suelta.
-- Se copian porque así el entrenador puede retocarle una semana a un cliente
-- sin tocar a los demás, y porque las sesiones ya registradas siguen
-- apuntando a la rutina que se entrenó.
--
-- La semana en la que está el cliente sale de la fecha de inicio, no de un
-- contador: no hay nada que "avanzar" ni que se pueda desincronizar.

create table public.programas (
  id uuid primary key default gen_random_uuid(),
  entrenador_id uuid not null default auth.uid() references public.entrenadores (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 120),
  descripcion text check (char_length(descripcion) <= 2000),
  semanas smallint not null check (semanas between 1 and 52),
  archivado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index programas_entrenador_id_idx on public.programas (entrenador_id, nombre);

-- Qué rutina va en qué semana. `plantilla_id` apunta a una rutina plantilla
-- (sin cliente). Una misma plantilla puede repetirse en varias semanas con
-- distinto ajuste: así se arma la progresión.
create table public.programa_rutinas (
  id uuid primary key default gen_random_uuid(),
  programa_id uuid not null references public.programas (id) on delete cascade,
  semana smallint not null check (semana between 1 and 52),
  plantilla_id uuid not null references public.rutinas (id) on delete restrict,
  -- 1 = lunes … 7 = domingo. Vacío: sin días fijos, el cliente elige.
  dias_semana smallint[] not null default '{}' check (dias_semana <@ '{1,2,3,4,5,6,7}'),
  -- Porcentaje sobre la carga de la plantilla: 2,5 sube un 2,5%.
  ajuste_carga_pct numeric(5, 2) not null default 0 check (ajuste_carga_pct between -50 and 100),
  unique (programa_id, semana, plantilla_id)
);

create index programa_rutinas_programa_id_idx on public.programa_rutinas (programa_id, semana);
create index programa_rutinas_plantilla_id_idx on public.programa_rutinas (plantilla_id);

-- El programa asignado a un cliente, con el día en que arranca. Guarda el
-- nombre y las semanas de ese momento: el programa se puede editar después.
create table public.programa_asignaciones (
  id uuid primary key default gen_random_uuid(),
  programa_id uuid not null references public.programas (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 120),
  semanas smallint not null check (semanas between 1 and 52),
  inicia_el date not null,
  created_at timestamptz not null default now()
);

create index programa_asignaciones_cliente_id_idx on public.programa_asignaciones (cliente_id, inicia_el desc);
create index programa_asignaciones_programa_id_idx on public.programa_asignaciones (programa_id);

-- Las rutinas copiadas saben de qué asignación y de qué semana salieron.
alter table public.rutinas
  add column asignacion_id uuid references public.programa_asignaciones (id) on delete cascade,
  add column semana smallint check (semana between 1 and 52),
  add check ((asignacion_id is null) = (semana is null));

create index rutinas_asignacion_id_idx on public.rutinas (asignacion_id, semana);

-- En qué semana está hoy una asignación. null si todavía no arrancó o si ya
-- terminó.
create function public.semana_actual(p_inicia_el date, p_semanas smallint, p_hoy date default current_date)
returns smallint
language sql
immutable
set search_path = ''
as $$
  select case
    when p_hoy < p_inicia_el then null
    when (p_hoy - p_inicia_el) / 7 + 1 > p_semanas then null
    else ((p_hoy - p_inicia_el) / 7 + 1)::smallint
  end;
$$;

-- RLS -------------------------------------------------------------------------------

alter table public.programas enable row level security;
alter table public.programa_rutinas enable row level security;
alter table public.programa_asignaciones enable row level security;

revoke all on public.programas from anon, authenticated;
revoke all on public.programa_rutinas from anon, authenticated;
revoke all on public.programa_asignaciones from anon, authenticated;

grant select, delete on public.programas to authenticated;
grant insert (nombre, descripcion, semanas, archivado) on public.programas to authenticated;
grant update (nombre, descripcion, semanas, archivado) on public.programas to authenticated;

grant select, delete on public.programa_rutinas to authenticated;
grant insert (programa_id, semana, plantilla_id, dias_semana, ajuste_carga_pct)
  on public.programa_rutinas to authenticated;
grant update (semana, plantilla_id, dias_semana, ajuste_carga_pct)
  on public.programa_rutinas to authenticated;

grant select, delete on public.programa_asignaciones to authenticated;
grant insert (programa_id, cliente_id, nombre, semanas, inicia_el)
  on public.programa_asignaciones to authenticated;

grant insert (asignacion_id, semana), update (asignacion_id, semana)
  on public.rutinas to authenticated;

-- El entrenador ve y maneja sus programas. El cliente no ve el programa en
-- sí: ve sus rutinas y su asignación.
create policy programas_select on public.programas for select to authenticated
  using (programas.entrenador_id = (select auth.uid()));
create policy programas_insert on public.programas for insert to authenticated
  with check (programas.entrenador_id = (select auth.uid()) and (select privado.es_entrenador()));
create policy programas_update on public.programas for update to authenticated
  using (programas.entrenador_id = (select auth.uid()))
  with check (programas.entrenador_id = (select auth.uid()));
create policy programas_delete on public.programas for delete to authenticated
  using (programas.entrenador_id = (select auth.uid()));

create function privado.mi_programa(p_programa_id uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.programas p
    where p.id = p_programa_id and p.entrenador_id = (select auth.uid())
  );
$$;

revoke execute on function privado.mi_programa(uuid) from public, anon;
grant execute on function privado.mi_programa(uuid) to authenticated, service_role;

-- Solo plantillas propias: una rutina de otro entrenador, o una ya asignada a
-- un cliente, no entran en un programa.
create function privado.mi_plantilla(p_rutina_id uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.rutinas r
    where r.id = p_rutina_id and r.cliente_id is null
      and r.entrenador_id = (select auth.uid())
  );
$$;

revoke execute on function privado.mi_plantilla(uuid) from public, anon;
grant execute on function privado.mi_plantilla(uuid) to authenticated, service_role;

create policy programa_rutinas_select on public.programa_rutinas for select to authenticated
  using (privado.mi_programa(programa_rutinas.programa_id));
create policy programa_rutinas_insert on public.programa_rutinas for insert to authenticated
  with check (
    privado.mi_programa(programa_rutinas.programa_id)
    and privado.mi_plantilla(programa_rutinas.plantilla_id)
  );
create policy programa_rutinas_update on public.programa_rutinas for update to authenticated
  using (privado.mi_programa(programa_rutinas.programa_id))
  with check (
    privado.mi_programa(programa_rutinas.programa_id)
    and privado.mi_plantilla(programa_rutinas.plantilla_id)
  );
create policy programa_rutinas_delete on public.programa_rutinas for delete to authenticated
  using (privado.mi_programa(programa_rutinas.programa_id));

-- La asignación la ven el entrenador dueño del programa y el cliente, que
-- necesita saber en qué semana está.
create policy programa_asignaciones_select on public.programa_asignaciones for select to authenticated
  using (
    privado.mi_programa(programa_asignaciones.programa_id)
    or privado.soy_cliente(programa_asignaciones.cliente_id)
  );
create policy programa_asignaciones_insert on public.programa_asignaciones for insert to authenticated
  with check (
    privado.mi_programa(programa_asignaciones.programa_id)
    and privado.es_mi_cliente(programa_asignaciones.cliente_id)
  );
create policy programa_asignaciones_delete on public.programa_asignaciones for delete to authenticated
  using (privado.mi_programa(programa_asignaciones.programa_id));

-- Una rutina solo se puede colgar de una asignación propia.
create function privado.mi_asignacion(p_asignacion_id uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.programa_asignaciones a
    join public.programas p on p.id = a.programa_id
    where a.id = p_asignacion_id and p.entrenador_id = (select auth.uid())
  );
$$;

revoke execute on function privado.mi_asignacion(uuid) from public, anon;
grant execute on function privado.mi_asignacion(uuid) to authenticated, service_role;

drop policy rutinas_insert on public.rutinas;
create policy rutinas_insert on public.rutinas for insert to authenticated
  with check (
    rutinas.entrenador_id = (select auth.uid())
    and (select privado.es_entrenador())
    and (rutinas.cliente_id is null or privado.es_mi_cliente(rutinas.cliente_id))
    and (rutinas.asignacion_id is null or privado.mi_asignacion(rutinas.asignacion_id))
  );

drop policy rutinas_update on public.rutinas;
create policy rutinas_update on public.rutinas for update to authenticated
  using (rutinas.entrenador_id = (select auth.uid()))
  with check (
    rutinas.entrenador_id = (select auth.uid())
    and (rutinas.cliente_id is null or privado.es_mi_cliente(rutinas.cliente_id))
    and (rutinas.asignacion_id is null or privado.mi_asignacion(rutinas.asignacion_id))
  );

-- asignar_programa: copia todas las rutinas de todas las semanas al cliente,
-- con la carga ya ajustada. SECURITY INVOKER: corre con los permisos del
-- entrenador y cada INSERT pasa por las policies de siempre.
create function public.asignar_programa(p_programa_id uuid, p_cliente_ids uuid[], p_inicia_el date)
returns setof uuid
language plpgsql
set search_path = ''
as $$
declare
  v_programa public.programas;
  v_cliente uuid;
  v_asignacion uuid;
  v_fila record;
  v_nueva uuid;
begin
  select * into v_programa
  from public.programas
  where id = p_programa_id and entrenador_id = (select auth.uid());

  if not found then
    raise exception 'El programa no existe o no es tuyo.' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.programa_rutinas where programa_id = p_programa_id) then
    raise exception 'El programa no tiene ninguna rutina.' using errcode = 'P0001';
  end if;

  foreach v_cliente in array p_cliente_ids loop
    insert into public.programa_asignaciones (programa_id, cliente_id, nombre, semanas, inicia_el)
    values (p_programa_id, v_cliente, v_programa.nombre, v_programa.semanas, p_inicia_el)
    returning id into v_asignacion;

    for v_fila in
      select pr.semana, pr.dias_semana, pr.ajuste_carga_pct, r.nombre, r.descripcion, r.id as plantilla_id
      from public.programa_rutinas pr
      join public.rutinas r on r.id = pr.plantilla_id
      where pr.programa_id = p_programa_id
      order by pr.semana
    loop
      insert into public.rutinas (
        entrenador_id, cliente_id, plantilla_id, nombre, descripcion, dias_semana,
        asignacion_id, semana)
      values (
        v_programa.entrenador_id, v_cliente, v_fila.plantilla_id, v_fila.nombre, v_fila.descripcion,
        v_fila.dias_semana, v_asignacion, v_fila.semana)
      returning id into v_nueva;

      -- La carga sube o baja el porcentaje de la semana; el resto de la
      -- prescripción se copia tal cual. Los topes son los de las columnas, y
      -- el ejercicio sin carga sigue sin carga: least() ignora los nulos, así
      -- que sin el case un nulo se convertiría en el tope.
      insert into public.rutina_ejercicios (
        rutina_id, ejercicio_id, orden, series, reps_min, reps_max, segundos, carga_kg,
        carga_pct_1rm, descanso_s, rpe, rir, tempo, pedir_rpe, notas, superserie,
        velocidad_ms, perdida_vel_pct, intensidad)
      select v_nueva, ejercicio_id, orden, series, reps_min, reps_max, segundos,
        case when carga_kg is null then null
          else least(round(carga_kg * (1 + v_fila.ajuste_carga_pct / 100), 2), 9999.99) end,
        case when carga_pct_1rm is null then null
          else least(round(carga_pct_1rm * (1 + v_fila.ajuste_carga_pct / 100), 2), 150) end,
        descanso_s, rpe, rir, tempo, pedir_rpe, notas, superserie,
        velocidad_ms, perdida_vel_pct, intensidad
      from public.rutina_ejercicios
      where rutina_id = v_fila.plantilla_id;
    end loop;

    return next v_asignacion;
  end loop;
end;
$$;

revoke execute on function public.asignar_programa(uuid, uuid[], date) from public, anon;
grant execute on function public.asignar_programa(uuid, uuid[], date) to authenticated, service_role;
