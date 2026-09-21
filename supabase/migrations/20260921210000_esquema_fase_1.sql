-- Esquema de la fase 1 (docs/requisitos-funcionales.md).
--
-- Reglas que sigue todo el archivo:
-- * Multi-entrenador desde el día uno (RNF-01): todo dato cuelga de un
--   entrenador, directamente o a través de un cliente. Aunque hoy haya uno solo,
--   nada supone que es el único.
-- * El rol no es un campo: alguien es entrenador si tiene fila en
--   `entrenadores`, y es cliente si una fila de `clientes` lo tiene como
--   `usuario_id`. En la fase 3 un cliente puede tener varios entrenadores: una
--   fila de `clientes` por cada uno.
-- * Supabase les da ALL sobre toda tabla nueva de `public` a anon,
--   authenticated y service_role. Por eso cada tabla hace REVOKE ALL y después
--   GRANT solo de lo necesario (por columna donde hace falta), y tiene RLS.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Utilidades
-- ─────────────────────────────────────────────────────────────────────────────

create function public.tocar_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Personas: perfiles, entrenadores, clientes
-- ─────────────────────────────────────────────────────────────────────────────

-- Un perfil por cuenta de auth. Lo crea el trigger del bloque 6.
create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null default '' check (char_length(nombre) <= 100),
  created_at timestamptz not null default now()
);

-- Quién es entrenador. Solo se da de alta a mano (SQL) en la fase 1; en la
-- fase 3 lo hará el registro de entrenadores (RF-06).
create table public.entrenadores (
  id uuid primary key references public.perfiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- La ficha del cliente (RF-11). El entrenador la crea antes de que el cliente
-- tenga cuenta; `usuario_id` se completa cuando acepta la invitación (RF-02).
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  entrenador_id uuid not null references public.entrenadores (id) on delete cascade,
  usuario_id uuid references public.perfiles (id) on delete set null,
  nombre text not null check (char_length(nombre) between 1 and 100),
  email text check (char_length(email) <= 254),
  telefono text check (char_length(telefono) <= 30),
  fecha_nacimiento date,
  foto_path text,
  objetivos text check (char_length(objetivos) <= 2000),
  nivel text check (nivel in ('principiante', 'intermedio', 'avanzado')),
  lesiones text check (char_length(lesiones) <= 2000),
  modalidad text not null default 'presencial'
    check (modalidad in ('presencial', 'online', 'mixta')),
  -- RF-14: en 'baja' el cliente ya no ve nada (ver soy_cliente), pero su
  -- historial queda.
  estado text not null default 'activo' check (estado in ('activo', 'pausado', 'baja')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entrenador_id, usuario_id)
);

create index clientes_usuario_id_idx on public.clientes (usuario_id);

create trigger clientes_updated_at before update on public.clientes
  for each row execute function public.tocar_updated_at();

-- Notas privadas del entrenador (RF-12). Tabla aparte para que el cliente,
-- que sí lee su ficha, no pueda leerlas.
create table public.notas_cliente (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index notas_cliente_cliente_id_idx on public.notas_cliente (cliente_id, created_at desc);

-- Invitaciones (RF-02). El código sirve para escribirlo o para armar el link.
-- Son 10 caracteres hexadecimales al azar (40 bits), de un solo uso y con
-- vencimiento.
create table public.invitaciones (
  codigo text primary key
    default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  created_at timestamptz not null default now(),
  expira_en timestamptz not null default now() + interval '7 days',
  usada_en timestamptz,
  usada_por uuid references public.perfiles (id) on delete set null
);

create index invitaciones_cliente_id_idx on public.invitaciones (cliente_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Ejercicios, rutinas y sesiones
-- ─────────────────────────────────────────────────────────────────────────────

-- Biblioteca de ejercicios (RF-20, RF-21). entrenador_id null queda reservado
-- para la biblioteca base de la fase 2 (RF-24): la ven todos.
create table public.ejercicios (
  id uuid primary key default gen_random_uuid(),
  entrenador_id uuid references public.entrenadores (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 120),
  grupo_muscular text check (char_length(grupo_muscular) <= 60),
  equipamiento text check (char_length(equipamiento) <= 60),
  descripcion text check (char_length(descripcion) <= 5000),
  consejos text check (char_length(consejos) <= 5000),
  archivado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ejercicios_entrenador_id_idx on public.ejercicios (entrenador_id);

create trigger ejercicios_updated_at before update on public.ejercicios
  for each row execute function public.tocar_updated_at();

-- Videos propios del entrenador (RF-22). El archivo vive en el bucket
-- `videos`, bajo la carpeta del entrenador: {entrenador_id}/...
create table public.ejercicio_videos (
  id uuid primary key default gen_random_uuid(),
  ejercicio_id uuid not null references public.ejercicios (id) on delete cascade,
  storage_path text not null unique check (char_length(storage_path) <= 300),
  duracion_s numeric(6, 1) check (duracion_s > 0),
  orden smallint not null default 0,
  principal boolean not null default false,
  created_at timestamptz not null default now()
);

create index ejercicio_videos_ejercicio_id_idx on public.ejercicio_videos (ejercicio_id, orden);
create unique index ejercicio_videos_un_principal on public.ejercicio_videos (ejercicio_id) where principal;

-- Rutinas (RF-30 a RF-32). Sin cliente es una plantilla; al asignarla a un
-- cliente se copia (ver asignar_plantilla) y `plantilla_id` recuerda de dónde
-- salió.
create table public.rutinas (
  id uuid primary key default gen_random_uuid(),
  entrenador_id uuid not null references public.entrenadores (id) on delete cascade,
  cliente_id uuid references public.clientes (id) on delete cascade,
  plantilla_id uuid references public.rutinas (id) on delete set null,
  nombre text not null check (char_length(nombre) between 1 and 120),
  descripcion text check (char_length(descripcion) <= 2000),
  -- 1 = lunes … 7 = domingo. Vacío: sin días fijos, el cliente elige.
  dias_semana smallint[] not null default '{}' check (dias_semana <@ '{1,2,3,4,5,6,7}'),
  archivada boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index rutinas_entrenador_id_idx on public.rutinas (entrenador_id);
create index rutinas_cliente_id_idx on public.rutinas (cliente_id);

create trigger rutinas_updated_at before update on public.rutinas
  for each row execute function public.tocar_updated_at();

-- Cada ejercicio de una rutina con su prescripción (RF-30). Además de
-- repeticiones admite `segundos`, para ejercicios por tiempo (plancha).
create table public.rutina_ejercicios (
  id uuid primary key default gen_random_uuid(),
  rutina_id uuid not null references public.rutinas (id) on delete cascade,
  ejercicio_id uuid not null references public.ejercicios (id) on delete restrict,
  orden smallint not null,
  series smallint not null check (series between 1 and 20),
  reps_min smallint check (reps_min > 0),
  reps_max smallint check (reps_max >= reps_min),
  segundos integer check (segundos > 0),
  carga_kg numeric(6, 2) check (carga_kg >= 0),
  carga_pct_1rm numeric(5, 2) check (carga_pct_1rm > 0 and carga_pct_1rm <= 150),
  descanso_s integer check (descanso_s between 0 and 3600),
  rpe numeric(3, 1) check (rpe between 1 and 10),
  rir smallint check (rir between 0 and 10),
  tempo text check (char_length(tempo) <= 20),
  pedir_rpe boolean not null default false,
  notas text check (char_length(notas) <= 1000),
  check (carga_kg is null or carga_pct_1rm is null)
);

create index rutina_ejercicios_rutina_id_idx on public.rutina_ejercicios (rutina_id, orden);
create index rutina_ejercicios_ejercicio_id_idx on public.rutina_ejercicios (ejercicio_id);

-- Sesión registrada (RF-41, RF-44, RF-45). La registra el cliente o el
-- entrenador en su nombre; `registrada_por` dice quién. `rutina_nombre` guarda
-- el nombre de ese momento, porque la rutina se puede editar o borrar.
create table public.sesiones (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  rutina_id uuid references public.rutinas (id) on delete set null,
  rutina_nombre text not null check (char_length(rutina_nombre) <= 120),
  registrada_por uuid default auth.uid() references public.perfiles (id) on delete set null,
  iniciada_en timestamptz not null default now(),
  finalizada_en timestamptz check (finalizada_en >= iniciada_en),
  esfuerzo smallint check (esfuerzo between 1 and 10),
  comentario text check (char_length(comentario) <= 2000),
  created_at timestamptz not null default now()
);

create index sesiones_cliente_id_idx on public.sesiones (cliente_id, iniciada_en desc);
create index sesiones_rutina_id_idx on public.sesiones (rutina_id);

-- Lo que se hizo realmente, serie por serie (RF-41). `ejercicio_id` se guarda
-- aunque exista `rutina_ejercicio_id`, para "la última vez" (RF-43) y las
-- gráficas (RF-60) aunque la rutina cambie.
create table public.sesion_series (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references public.sesiones (id) on delete cascade,
  ejercicio_id uuid not null references public.ejercicios (id) on delete restrict,
  rutina_ejercicio_id uuid references public.rutina_ejercicios (id) on delete set null,
  orden_ejercicio smallint not null,
  numero smallint not null check (numero between 1 and 50),
  peso_kg numeric(6, 2) check (peso_kg >= 0),
  reps smallint check (reps >= 0),
  segundos integer check (segundos >= 0),
  rpe numeric(3, 1) check (rpe between 1 and 10),
  completada boolean not null default true,
  created_at timestamptz not null default now(),
  unique (sesion_id, orden_ejercicio, numero)
);

create index sesion_series_ejercicio_id_idx on public.sesion_series (ejercicio_id);
create index sesion_series_rutina_ejercicio_id_idx on public.sesion_series (rutina_ejercicio_id);

-- Devolución del entrenador sobre una sesión (RF-61): una por sesión, sin
-- respuestas. Tabla aparte para que el cliente no pueda pisarla al editar su
-- propio comentario.
create table public.sesion_comentarios (
  sesion_id uuid primary key references public.sesiones (id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger sesion_comentarios_updated_at before update on public.sesion_comentarios
  for each row execute function public.tocar_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Métricas (RF-50 a RF-55)
-- ─────────────────────────────────────────────────────────────────────────────

-- entrenador_id null: métrica predefinida (peso, perímetros, grasa; RF-55),
-- visible para todos y de solo lectura.
create table public.metricas (
  id uuid primary key default gen_random_uuid(),
  entrenador_id uuid references public.entrenadores (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 80),
  unidad text not null check (char_length(unidad) between 1 and 20),
  -- Qué valor es mejor. 'ninguno' para las que dependen del objetivo (peso).
  mejor text not null default 'mayor' check (mejor in ('mayor', 'menor', 'ninguno')),
  protocolo text check (char_length(protocolo) <= 2000),
  video_path text check (char_length(video_path) <= 300),
  archivada boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index metricas_entrenador_id_idx on public.metricas (entrenador_id);

create trigger metricas_updated_at before update on public.metricas
  for each row execute function public.tocar_updated_at();

-- Métrica asignada a un cliente (RF-51). Si el cliente puede cargar sus
-- propias mediciones (RF-53) se decide acá, por cliente: así también se
-- puede habilitar en las predefinidas.
create table public.cliente_metricas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  metrica_id uuid not null references public.metricas (id) on delete cascade,
  cliente_puede_cargar boolean not null default false,
  created_at timestamptz not null default now(),
  unique (cliente_id, metrica_id)
);

create index cliente_metricas_metrica_id_idx on public.cliente_metricas (metrica_id);

-- Una toma (RF-52). Si hubo varios intentos se guardan todos, y `valor` es el
-- mejor según la métrica. Lo calcula el trigger; lo que mande el cliente se
-- ignora.
create table public.mediciones (
  id uuid primary key default gen_random_uuid(),
  cliente_metrica_id uuid not null references public.cliente_metricas (id) on delete cascade,
  fecha date not null default current_date,
  intentos numeric(10, 3)[] not null
    check (cardinality(intentos) between 1 and 10 and array_position(intentos, null) is null),
  valor numeric(10, 3) not null,
  nota text check (char_length(nota) <= 1000),
  registrada_por uuid default auth.uid() references public.perfiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index mediciones_cliente_metrica_id_idx on public.mediciones (cliente_metrica_id, fecha desc);

create function public.calcular_valor_medicion()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_mejor text;
begin
  select m.mejor into v_mejor
  from public.cliente_metricas cm
  join public.metricas m on m.id = cm.metrica_id
  where cm.id = new.cliente_metrica_id;

  new.valor := case v_mejor
    when 'mayor' then (select max(i) from unnest(new.intentos) as i)
    when 'menor' then (select min(i) from unnest(new.intentos) as i)
    -- Sin sentido de "mejor", vale el último intento.
    else new.intentos[cardinality(new.intentos)]
  end;
  return new;
end;
$$;

create trigger mediciones_valor before insert or update of intentos, cliente_metrica_id
  on public.mediciones
  for each row execute function public.calcular_valor_medicion();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Funciones de permisos
-- ─────────────────────────────────────────────────────────────────────────────
-- SECURITY DEFINER para que las policies puedan consultar `clientes` sin
-- entrar en recursión con su propia RLS. Solo responden sobre el usuario
-- que llama.

create function public.es_entrenador()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.entrenadores where id = (select auth.uid()));
$$;

-- ¿Este cliente es mío, como entrenador?
create function public.es_mi_cliente(p_cliente_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.clientes
    where id = p_cliente_id and entrenador_id = (select auth.uid())
  );
$$;

-- ¿Soy yo este cliente, y no estoy dado de baja? (RF-14)
create function public.soy_cliente(p_cliente_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.clientes
    where id = p_cliente_id and usuario_id = (select auth.uid()) and estado <> 'baja'
  );
$$;

-- Los entrenadores de los que soy cliente activo o pausado.
create function public.mis_entrenadores()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select entrenador_id from public.clientes
  where usuario_id = (select auth.uid()) and estado <> 'baja';
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Alta de perfil, invitaciones y plantillas
-- ─────────────────────────────────────────────────────────────────────────────

create function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'nombre', ''), 100));
  return new;
end;
$$;

create trigger crear_perfil after insert on auth.users
  for each row execute function public.crear_perfil();

-- El usuario logueado acepta una invitación y queda vinculado a la ficha que
-- armó el entrenador. Devuelve el id de esa ficha.
create function public.aceptar_invitacion(p_codigo text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.invitaciones;
  v_entrenador uuid;
begin
  if v_uid is null then
    raise exception 'Hay que iniciar sesión para aceptar la invitación.' using errcode = '28000';
  end if;

  select * into v_inv
  from public.invitaciones
  where codigo = upper(trim(p_codigo))
  for update;

  if not found or v_inv.usada_en is not null or v_inv.expira_en < now() then
    raise exception 'La invitación no existe, ya se usó o venció.' using errcode = 'P0001';
  end if;

  select entrenador_id into v_entrenador from public.clientes where id = v_inv.cliente_id;
  if v_entrenador = v_uid then
    raise exception 'No podés aceptar una invitación tuya.' using errcode = 'P0001';
  end if;

  begin
    update public.clientes
    set usuario_id = v_uid
    where id = v_inv.cliente_id and usuario_id is null;
  exception when unique_violation then
    raise exception 'Ya sos cliente de este entrenador.' using errcode = 'P0001';
  end;

  if not found then
    raise exception 'Esta ficha ya tiene una cuenta vinculada.' using errcode = 'P0001';
  end if;

  update public.invitaciones
  set usada_en = now(), usada_por = v_uid
  where codigo = v_inv.codigo;

  return v_inv.cliente_id;
end;
$$;

-- Copia una rutina (normalmente una plantilla) a uno o varios clientes (RF-31).
-- SECURITY INVOKER: corre con la RLS de quien llama, así que solo funciona
-- sobre rutinas y clientes propios. Devuelve los ids de las copias.
create function public.asignar_plantilla(p_rutina_id uuid, p_cliente_ids uuid[])
returns setof uuid
language plpgsql
set search_path = ''
as $$
declare
  v_origen public.rutinas;
  v_cliente uuid;
  v_nueva uuid;
begin
  select * into v_origen
  from public.rutinas
  where id = p_rutina_id and entrenador_id = (select auth.uid());

  if not found then
    raise exception 'La rutina no existe o no es tuya.' using errcode = 'P0001';
  end if;

  foreach v_cliente in array p_cliente_ids loop
    insert into public.rutinas (entrenador_id, cliente_id, plantilla_id, nombre, descripcion, dias_semana)
    values (v_origen.entrenador_id, v_cliente, v_origen.id, v_origen.nombre, v_origen.descripcion,
            v_origen.dias_semana)
    returning id into v_nueva;

    insert into public.rutina_ejercicios (
      rutina_id, ejercicio_id, orden, series, reps_min, reps_max, segundos, carga_kg,
      carga_pct_1rm, descanso_s, rpe, rir, tempo, pedir_rpe, notas)
    select v_nueva, ejercicio_id, orden, series, reps_min, reps_max, segundos, carga_kg,
      carga_pct_1rm, descanso_s, rpe, rir, tempo, pedir_rpe, notas
    from public.rutina_ejercicios
    where rutina_id = v_origen.id;

    return next v_nueva;
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
-- En las subconsultas, la columna de la fila evaluada va siempre calificada
-- con el nombre de la tabla (p. ej. `rutina_ejercicios.rutina_id`): sin
-- calificar, Postgres puede resolverla contra la tabla de la subconsulta.
-- Varias policies usan `exists (select … from otra_tabla …)` a secas: esa
-- subconsulta ya pasa por la RLS de la otra tabla, que es justo lo que se
-- quiere ("veo esto si veo su padre").

alter table public.perfiles enable row level security;
alter table public.entrenadores enable row level security;
alter table public.clientes enable row level security;
alter table public.notas_cliente enable row level security;
alter table public.invitaciones enable row level security;
alter table public.ejercicios enable row level security;
alter table public.ejercicio_videos enable row level security;
alter table public.rutinas enable row level security;
alter table public.rutina_ejercicios enable row level security;
alter table public.sesiones enable row level security;
alter table public.sesion_series enable row level security;
alter table public.sesion_comentarios enable row level security;
alter table public.metricas enable row level security;
alter table public.cliente_metricas enable row level security;
alter table public.mediciones enable row level security;

-- perfiles: el propio, los de mis clientes y los de mis entrenadores.
create policy perfiles_select on public.perfiles for select to authenticated
  using (
    perfiles.id = (select auth.uid())
    or perfiles.id in (select c.usuario_id from public.clientes c where c.entrenador_id = (select auth.uid()))
    or perfiles.id in (select public.mis_entrenadores())
  );
create policy perfiles_update on public.perfiles for update to authenticated
  using (perfiles.id = (select auth.uid()))
  with check (perfiles.id = (select auth.uid()));

-- entrenadores: solo lectura desde la app.
create policy entrenadores_select on public.entrenadores for select to authenticated
  using (
    entrenadores.id = (select auth.uid())
    or entrenadores.id in (select public.mis_entrenadores())
  );

-- clientes: el entrenador maneja sus fichas; el cliente lee la suya (aunque
-- esté de baja, para que la app pueda avisarle).
create policy clientes_select on public.clientes for select to authenticated
  using (clientes.entrenador_id = (select auth.uid()) or clientes.usuario_id = (select auth.uid()));
create policy clientes_insert on public.clientes for insert to authenticated
  with check (clientes.entrenador_id = (select auth.uid()) and (select public.es_entrenador()));
create policy clientes_update on public.clientes for update to authenticated
  using (clientes.entrenador_id = (select auth.uid()))
  with check (clientes.entrenador_id = (select auth.uid()));
create policy clientes_delete on public.clientes for delete to authenticated
  using (clientes.entrenador_id = (select auth.uid()));

-- notas_cliente e invitaciones: solo el entrenador.
create policy notas_cliente_todo on public.notas_cliente for all to authenticated
  using (public.es_mi_cliente(notas_cliente.cliente_id))
  with check (public.es_mi_cliente(notas_cliente.cliente_id));

create policy invitaciones_todo on public.invitaciones for all to authenticated
  using (public.es_mi_cliente(invitaciones.cliente_id))
  with check (public.es_mi_cliente(invitaciones.cliente_id));

-- ejercicios: los propios, los de la biblioteca base y los de mis entrenadores.
create policy ejercicios_select on public.ejercicios for select to authenticated
  using (
    ejercicios.entrenador_id is null
    or ejercicios.entrenador_id = (select auth.uid())
    or ejercicios.entrenador_id in (select public.mis_entrenadores())
  );
create policy ejercicios_insert on public.ejercicios for insert to authenticated
  with check (ejercicios.entrenador_id = (select auth.uid()) and (select public.es_entrenador()));
create policy ejercicios_update on public.ejercicios for update to authenticated
  using (ejercicios.entrenador_id = (select auth.uid()))
  with check (ejercicios.entrenador_id = (select auth.uid()));
create policy ejercicios_delete on public.ejercicios for delete to authenticated
  using (ejercicios.entrenador_id = (select auth.uid()));

-- ejercicio_videos: se ven si se ve el ejercicio; los maneja su dueño, y el
-- archivo tiene que estar en su carpeta.
create policy ejercicio_videos_select on public.ejercicio_videos for select to authenticated
  using (exists (select 1 from public.ejercicios e where e.id = ejercicio_videos.ejercicio_id));
create policy ejercicio_videos_insert on public.ejercicio_videos for insert to authenticated
  with check (
    exists (
      select 1 from public.ejercicios e
      where e.id = ejercicio_videos.ejercicio_id and e.entrenador_id = (select auth.uid())
    )
    and split_part(ejercicio_videos.storage_path, '/', 1) = (select auth.uid())::text
  );
create policy ejercicio_videos_update on public.ejercicio_videos for update to authenticated
  using (
    exists (
      select 1 from public.ejercicios e
      where e.id = ejercicio_videos.ejercicio_id and e.entrenador_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.ejercicios e
      where e.id = ejercicio_videos.ejercicio_id and e.entrenador_id = (select auth.uid())
    )
  );
create policy ejercicio_videos_delete on public.ejercicio_videos for delete to authenticated
  using (
    exists (
      select 1 from public.ejercicios e
      where e.id = ejercicio_videos.ejercicio_id and e.entrenador_id = (select auth.uid())
    )
  );

-- rutinas: el entrenador las suyas (plantillas o de sus clientes); el cliente
-- lee las asignadas a él.
create policy rutinas_select on public.rutinas for select to authenticated
  using (
    rutinas.entrenador_id = (select auth.uid())
    or (rutinas.cliente_id is not null and public.soy_cliente(rutinas.cliente_id))
  );
create policy rutinas_insert on public.rutinas for insert to authenticated
  with check (
    rutinas.entrenador_id = (select auth.uid())
    and (select public.es_entrenador())
    and (rutinas.cliente_id is null or public.es_mi_cliente(rutinas.cliente_id))
  );
create policy rutinas_update on public.rutinas for update to authenticated
  using (rutinas.entrenador_id = (select auth.uid()))
  with check (
    rutinas.entrenador_id = (select auth.uid())
    and (rutinas.cliente_id is null or public.es_mi_cliente(rutinas.cliente_id))
  );
create policy rutinas_delete on public.rutinas for delete to authenticated
  using (rutinas.entrenador_id = (select auth.uid()));

-- rutina_ejercicios: se ven si se ve la rutina; los escribe el dueño de la
-- rutina, y solo con ejercicios propios o de la biblioteca base.
create policy rutina_ejercicios_select on public.rutina_ejercicios for select to authenticated
  using (exists (select 1 from public.rutinas r where r.id = rutina_ejercicios.rutina_id));
create policy rutina_ejercicios_insert on public.rutina_ejercicios for insert to authenticated
  with check (
    exists (
      select 1 from public.rutinas r
      where r.id = rutina_ejercicios.rutina_id and r.entrenador_id = (select auth.uid())
    )
    and exists (
      select 1 from public.ejercicios e
      where e.id = rutina_ejercicios.ejercicio_id
        and (e.entrenador_id is null or e.entrenador_id = (select auth.uid()))
    )
  );
create policy rutina_ejercicios_update on public.rutina_ejercicios for update to authenticated
  using (
    exists (
      select 1 from public.rutinas r
      where r.id = rutina_ejercicios.rutina_id and r.entrenador_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.rutinas r
      where r.id = rutina_ejercicios.rutina_id and r.entrenador_id = (select auth.uid())
    )
    and exists (
      select 1 from public.ejercicios e
      where e.id = rutina_ejercicios.ejercicio_id
        and (e.entrenador_id is null or e.entrenador_id = (select auth.uid()))
    )
  );
create policy rutina_ejercicios_delete on public.rutina_ejercicios for delete to authenticated
  using (
    exists (
      select 1 from public.rutinas r
      where r.id = rutina_ejercicios.rutina_id and r.entrenador_id = (select auth.uid())
    )
  );

-- sesiones: las maneja el cliente o su entrenador (RF-45). Quien la crea
-- queda como `registrada_por`, y la rutina tiene que ser de ese cliente.
create policy sesiones_select on public.sesiones for select to authenticated
  using (public.es_mi_cliente(sesiones.cliente_id) or public.soy_cliente(sesiones.cliente_id));
create policy sesiones_insert on public.sesiones for insert to authenticated
  with check (
    (public.es_mi_cliente(sesiones.cliente_id) or public.soy_cliente(sesiones.cliente_id))
    and sesiones.registrada_por = (select auth.uid())
    and (
      sesiones.rutina_id is null
      or exists (
        select 1 from public.rutinas r
        where r.id = sesiones.rutina_id and r.cliente_id = sesiones.cliente_id
      )
    )
  );
create policy sesiones_update on public.sesiones for update to authenticated
  using (public.es_mi_cliente(sesiones.cliente_id) or public.soy_cliente(sesiones.cliente_id))
  with check (public.es_mi_cliente(sesiones.cliente_id) or public.soy_cliente(sesiones.cliente_id));
create policy sesiones_delete on public.sesiones for delete to authenticated
  using (public.es_mi_cliente(sesiones.cliente_id) or public.soy_cliente(sesiones.cliente_id));

-- sesion_series: siguen a su sesión, y el ejercicio tiene que ser visible.
create policy sesion_series_select on public.sesion_series for select to authenticated
  using (exists (select 1 from public.sesiones s where s.id = sesion_series.sesion_id));
create policy sesion_series_insert on public.sesion_series for insert to authenticated
  with check (
    exists (select 1 from public.sesiones s where s.id = sesion_series.sesion_id)
    and exists (select 1 from public.ejercicios e where e.id = sesion_series.ejercicio_id)
  );
create policy sesion_series_update on public.sesion_series for update to authenticated
  using (exists (select 1 from public.sesiones s where s.id = sesion_series.sesion_id))
  with check (
    exists (select 1 from public.sesiones s where s.id = sesion_series.sesion_id)
    and exists (select 1 from public.ejercicios e where e.id = sesion_series.ejercicio_id)
  );
create policy sesion_series_delete on public.sesion_series for delete to authenticated
  using (exists (select 1 from public.sesiones s where s.id = sesion_series.sesion_id));

-- sesion_comentarios: los lee quien ve la sesión; los escribe el entrenador.
create policy sesion_comentarios_select on public.sesion_comentarios for select to authenticated
  using (exists (select 1 from public.sesiones s where s.id = sesion_comentarios.sesion_id));
create policy sesion_comentarios_insert on public.sesion_comentarios for insert to authenticated
  with check (
    exists (
      select 1 from public.sesiones s
      where s.id = sesion_comentarios.sesion_id and public.es_mi_cliente(s.cliente_id)
    )
  );
create policy sesion_comentarios_update on public.sesion_comentarios for update to authenticated
  using (
    exists (
      select 1 from public.sesiones s
      where s.id = sesion_comentarios.sesion_id and public.es_mi_cliente(s.cliente_id)
    )
  )
  with check (
    exists (
      select 1 from public.sesiones s
      where s.id = sesion_comentarios.sesion_id and public.es_mi_cliente(s.cliente_id)
    )
  );
create policy sesion_comentarios_delete on public.sesion_comentarios for delete to authenticated
  using (
    exists (
      select 1 from public.sesiones s
      where s.id = sesion_comentarios.sesion_id and public.es_mi_cliente(s.cliente_id)
    )
  );

-- metricas: las predefinidas, las propias y las de mis entrenadores.
create policy metricas_select on public.metricas for select to authenticated
  using (
    metricas.entrenador_id is null
    or metricas.entrenador_id = (select auth.uid())
    or metricas.entrenador_id in (select public.mis_entrenadores())
  );
create policy metricas_insert on public.metricas for insert to authenticated
  with check (metricas.entrenador_id = (select auth.uid()) and (select public.es_entrenador()));
create policy metricas_update on public.metricas for update to authenticated
  using (metricas.entrenador_id = (select auth.uid()))
  with check (metricas.entrenador_id = (select auth.uid()));
create policy metricas_delete on public.metricas for delete to authenticated
  using (metricas.entrenador_id = (select auth.uid()));

-- cliente_metricas: las asigna el entrenador, con métricas propias o
-- predefinidas; el cliente lee las suyas.
create policy cliente_metricas_select on public.cliente_metricas for select to authenticated
  using (public.es_mi_cliente(cliente_metricas.cliente_id) or public.soy_cliente(cliente_metricas.cliente_id));
create policy cliente_metricas_insert on public.cliente_metricas for insert to authenticated
  with check (
    public.es_mi_cliente(cliente_metricas.cliente_id)
    and exists (
      select 1 from public.metricas m
      where m.id = cliente_metricas.metrica_id
        and (m.entrenador_id is null or m.entrenador_id = (select auth.uid()))
    )
  );
create policy cliente_metricas_update on public.cliente_metricas for update to authenticated
  using (public.es_mi_cliente(cliente_metricas.cliente_id))
  with check (public.es_mi_cliente(cliente_metricas.cliente_id));
create policy cliente_metricas_delete on public.cliente_metricas for delete to authenticated
  using (public.es_mi_cliente(cliente_metricas.cliente_id));

-- mediciones: las carga el entrenador, o el cliente si esa métrica se lo
-- permite. El cliente solo edita o borra las que cargó él.
create policy mediciones_select on public.mediciones for select to authenticated
  using (exists (select 1 from public.cliente_metricas cm where cm.id = mediciones.cliente_metrica_id));
create policy mediciones_insert on public.mediciones for insert to authenticated
  with check (
    mediciones.registrada_por = (select auth.uid())
    and exists (
      select 1 from public.cliente_metricas cm
      where cm.id = mediciones.cliente_metrica_id
        and (
          public.es_mi_cliente(cm.cliente_id)
          or (cm.cliente_puede_cargar and public.soy_cliente(cm.cliente_id))
        )
    )
  );
create policy mediciones_update on public.mediciones for update to authenticated
  using (
    exists (
      select 1 from public.cliente_metricas cm
      where cm.id = mediciones.cliente_metrica_id
        and (
          public.es_mi_cliente(cm.cliente_id)
          or (
            cm.cliente_puede_cargar and public.soy_cliente(cm.cliente_id)
            and mediciones.registrada_por = (select auth.uid())
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.cliente_metricas cm
      where cm.id = mediciones.cliente_metrica_id
        and (
          public.es_mi_cliente(cm.cliente_id)
          or (
            cm.cliente_puede_cargar and public.soy_cliente(cm.cliente_id)
            and mediciones.registrada_por = (select auth.uid())
          )
        )
    )
  );
create policy mediciones_delete on public.mediciones for delete to authenticated
  using (
    exists (
      select 1 from public.cliente_metricas cm
      where cm.id = mediciones.cliente_metrica_id
        and (
          public.es_mi_cliente(cm.cliente_id)
          or (
            cm.cliente_puede_cargar and public.soy_cliente(cm.cliente_id)
            and mediciones.registrada_por = (select auth.uid())
          )
        )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Permisos de tabla y columna
-- ─────────────────────────────────────────────────────────────────────────────
-- Primero se saca todo lo que Supabase da por defecto; después se da lo justo.
-- Donde hay GRANT por columna es para que nadie pueda reescribir claves que
-- definen de quién es la fila (entrenador_id, usuario_id, cliente_id,
-- registrada_por) ni campos que calcula la base.

revoke all on
  public.perfiles, public.entrenadores, public.clientes, public.notas_cliente,
  public.invitaciones, public.ejercicios, public.ejercicio_videos, public.rutinas,
  public.rutina_ejercicios, public.sesiones, public.sesion_series,
  public.sesion_comentarios, public.metricas, public.cliente_metricas, public.mediciones
from anon, authenticated;

grant all on
  public.perfiles, public.entrenadores, public.clientes, public.notas_cliente,
  public.invitaciones, public.ejercicios, public.ejercicio_videos, public.rutinas,
  public.rutina_ejercicios, public.sesiones, public.sesion_series,
  public.sesion_comentarios, public.metricas, public.cliente_metricas, public.mediciones
to service_role;

grant select on public.perfiles to authenticated;
grant update (nombre) on public.perfiles to authenticated;

grant select on public.entrenadores to authenticated;

grant select, delete on public.clientes to authenticated;
grant insert (entrenador_id, nombre, email, telefono, fecha_nacimiento, foto_path, objetivos,
  nivel, lesiones, modalidad, estado) on public.clientes to authenticated;
grant update (nombre, email, telefono, fecha_nacimiento, foto_path, objetivos, nivel, lesiones,
  modalidad, estado) on public.clientes to authenticated;

grant select, delete on public.notas_cliente to authenticated;
grant insert (cliente_id, texto) on public.notas_cliente to authenticated;
grant update (texto) on public.notas_cliente to authenticated;

-- El código lo genera la base y la invitación no se edita: se borra y se hace otra.
grant select, delete on public.invitaciones to authenticated;
grant insert (cliente_id, expira_en) on public.invitaciones to authenticated;

grant select, delete on public.ejercicios to authenticated;
grant insert (entrenador_id, nombre, grupo_muscular, equipamiento, descripcion, consejos, archivado)
  on public.ejercicios to authenticated;
grant update (nombre, grupo_muscular, equipamiento, descripcion, consejos, archivado)
  on public.ejercicios to authenticated;

grant select, delete on public.ejercicio_videos to authenticated;
grant insert (ejercicio_id, storage_path, duracion_s, orden, principal)
  on public.ejercicio_videos to authenticated;
grant update (orden, principal) on public.ejercicio_videos to authenticated;

grant select, delete on public.rutinas to authenticated;
grant insert (entrenador_id, cliente_id, plantilla_id, nombre, descripcion, dias_semana, archivada)
  on public.rutinas to authenticated;
grant update (nombre, descripcion, dias_semana, archivada) on public.rutinas to authenticated;

grant select, delete on public.rutina_ejercicios to authenticated;
grant insert (rutina_id, ejercicio_id, orden, series, reps_min, reps_max, segundos, carga_kg,
  carga_pct_1rm, descanso_s, rpe, rir, tempo, pedir_rpe, notas)
  on public.rutina_ejercicios to authenticated;
grant update (ejercicio_id, orden, series, reps_min, reps_max, segundos, carga_kg, carga_pct_1rm,
  descanso_s, rpe, rir, tempo, pedir_rpe, notas)
  on public.rutina_ejercicios to authenticated;

grant select, delete on public.sesiones to authenticated;
grant insert (id, cliente_id, rutina_id, rutina_nombre, registrada_por, iniciada_en,
  finalizada_en, esfuerzo, comentario) on public.sesiones to authenticated;
grant update (finalizada_en, esfuerzo, comentario) on public.sesiones to authenticated;

-- `id` se puede mandar desde el cliente para poder registrar sin conexión (RF-47).
grant select, delete on public.sesion_series to authenticated;
grant insert (id, sesion_id, ejercicio_id, rutina_ejercicio_id, orden_ejercicio, numero, peso_kg,
  reps, segundos, rpe, completada) on public.sesion_series to authenticated;
grant update (peso_kg, reps, segundos, rpe, completada) on public.sesion_series to authenticated;

grant select, delete on public.sesion_comentarios to authenticated;
grant insert (sesion_id, texto) on public.sesion_comentarios to authenticated;
grant update (texto) on public.sesion_comentarios to authenticated;

grant select, delete on public.metricas to authenticated;
grant insert (entrenador_id, nombre, unidad, mejor, protocolo, video_path, archivada)
  on public.metricas to authenticated;
grant update (nombre, unidad, mejor, protocolo, video_path, archivada)
  on public.metricas to authenticated;

grant select, delete on public.cliente_metricas to authenticated;
grant insert (cliente_id, metrica_id, cliente_puede_cargar) on public.cliente_metricas to authenticated;
grant update (cliente_puede_cargar) on public.cliente_metricas to authenticated;

grant select, delete on public.mediciones to authenticated;
grant insert (cliente_metrica_id, fecha, intentos, nota, registrada_por)
  on public.mediciones to authenticated;
grant update (fecha, intentos, nota) on public.mediciones to authenticated;

-- Funciones: nada para anon. Las de trigger no se llaman desde la API.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.es_entrenador(), public.es_mi_cliente(uuid), public.soy_cliente(uuid),
  public.mis_entrenadores(), public.aceptar_invitacion(text), public.asignar_plantilla(uuid, uuid[])
to authenticated;
grant execute on all functions in schema public to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Métricas predefinidas (RF-55)
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.metricas (entrenador_id, nombre, unidad, mejor) values
  (null, 'Peso corporal', 'kg', 'ninguno'),
  (null, 'Grasa corporal', '%', 'ninguno'),
  (null, 'Perímetro de cintura', 'cm', 'ninguno'),
  (null, 'Perímetro de cadera', 'cm', 'ninguno'),
  (null, 'Perímetro de pecho', 'cm', 'ninguno'),
  (null, 'Perímetro de brazo', 'cm', 'ninguno'),
  (null, 'Perímetro de muslo', 'cm', 'ninguno');
