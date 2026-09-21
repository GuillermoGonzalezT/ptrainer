-- Pruebas de permisos de la fase 1. Corre sobre una base con
-- stub_supabase.sql y las migraciones aplicadas (ver scripts/probar-rls.sh).
-- Cada chequeo imprime "ok: …" o corta con "FALLA: …".
--
-- Personajes:
--   E1, E2  entrenadores
--   U1      cliente de E1 (acepta una invitación)
--   U2      cliente de E1 (otro)
--   U3      cuenta sin relación con nadie

\set ON_ERROR_STOP on
\set QUIET on

\set E1 '11111111-1111-1111-1111-111111111111'
\set E2 '22222222-2222-2222-2222-222222222222'
\set U1 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
\set U2 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
\set U3 'cccccccc-cccc-cccc-cccc-cccccccccccc'

-- Ayudantes ------------------------------------------------------------------

create schema prueba;
grant usage on schema prueba to anon, authenticated, service_role;

create function prueba.como(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid)::text, false);
$$;

create function prueba.ok(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if p_cond is distinct from true then
    raise exception 'FALLA: %', p_msg;
  end if;
  raise notice 'ok: %', p_msg;
end;
$$;

-- Cuántas filas devuelve una consulta.
create function prueba.filas(p_sql text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute format('select count(*) from (%s) q', p_sql) into n;
  return n;
end;
$$;

-- Cuántas filas toca un INSERT/UPDATE/DELETE.
create function prueba.afectadas(p_sql text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Que una sentencia falle.
create function prueba.falla(p_sql text, p_msg text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    raise notice 'ok: % (%)', p_msg, sqlerrm;
    return;
  end;
  raise exception 'FALLA: % — la sentencia no dio error', p_msg;
end;
$$;

grant execute on all functions in schema prueba to anon, authenticated, service_role;

-- Datos base (como postgres) ---------------------------------------------------

insert into auth.users (id, email, raw_user_meta_data) values
  (:'E1', 'e1@prueba', '{"nombre":"Entrenador Uno"}'),
  (:'E2', 'e2@prueba', '{"nombre":"Entrenador Dos"}'),
  (:'U1', 'u1@prueba', '{"nombre":"Ana"}'),
  (:'U2', 'u2@prueba', '{"nombre":"Beto"}'),
  (:'U3', 'u3@prueba', '{}');

select prueba.ok((select count(*) from public.perfiles) = 5, 'el trigger crea un perfil por cuenta');
select prueba.ok((select nombre from public.perfiles where id = :'U1') = 'Ana', 'el perfil toma el nombre del registro');

insert into public.entrenadores (id) values (:'E1'), (:'E2');

-- E1 arma su mundo -------------------------------------------------------------

select prueba.como(:'E1');
set role authenticated;

insert into public.clientes (entrenador_id, nombre, modalidad) values (:'E1', 'Ana', 'mixta') returning id as c1 \gset
insert into public.clientes (entrenador_id, nombre) values (:'E1', 'Beto') returning id as c2 \gset
select prueba.falla(format($q$insert into public.clientes (entrenador_id, usuario_id, nombre) values (%L, %L, 'X')$q$, :'E1', :'U3'),
  'el entrenador no puede vincular una cuenta a mano');
select prueba.falla(format($q$insert into public.clientes (entrenador_id, nombre) values (%L, 'X')$q$, :'E2'),
  'no se puede crear un cliente a nombre de otro entrenador');

insert into public.invitaciones (cliente_id) values (:'c1') returning codigo as inv1 \gset
insert into public.invitaciones (cliente_id) values (:'c2') returning codigo as inv2 \gset
select prueba.ok(length(:'inv1') = 10 and :'inv1' = upper(:'inv1'), 'el código de invitación tiene 10 caracteres en mayúscula');

insert into public.notas_cliente (cliente_id, texto) values (:'c1', 'Rodilla izquierda sensible');

insert into public.ejercicios (entrenador_id, nombre, grupo_muscular) values (:'E1', 'Sentadilla', 'Piernas') returning id as ej1 \gset
select prueba.ok(prueba.afectadas(format($q$insert into public.ejercicio_videos (ejercicio_id, storage_path, principal) values (%L, %L, true)$q$,
  :'ej1', :'E1' || '/ejercicios/' || :'ej1' || '/v1.mp4')) = 1, 'el entrenador agrega un video en su carpeta');
select prueba.falla(format($q$insert into public.ejercicio_videos (ejercicio_id, storage_path) values (%L, %L)$q$,
  :'ej1', :'E2' || '/ejercicios/v2.mp4'), 'un video fuera de su carpeta se rechaza');
select prueba.falla(format($q$insert into public.ejercicio_videos (ejercicio_id, storage_path, principal) values (%L, %L, true)$q$,
  :'ej1', :'E1' || '/ejercicios/v3.mp4'), 'no puede haber dos videos principales');

insert into public.rutinas (entrenador_id, nombre, dias_semana) values (:'E1', 'Fuerza A', '{1,4}') returning id as plantilla \gset
insert into public.rutina_ejercicios (rutina_id, ejercicio_id, orden, series, reps_min, reps_max, descanso_s)
  values (:'plantilla', :'ej1', 1, 4, 6, 8, 120) returning id as re1 \gset
select count(*) as copias from public.asignar_plantilla(:'plantilla', array[:'c1', :'c2']::uuid[]) \gset
select id as r1 from public.rutinas where cliente_id = :'c1' \gset
select prueba.ok(prueba.filas(format('select 1 from public.rutina_ejercicios where rutina_id = %L', :'r1')) = 1,
  'asignar_plantilla copia los ejercicios');
select prueba.ok(prueba.filas(format('select 1 from public.rutinas where plantilla_id = %L', :'plantilla')) = 2,
  'asignar_plantilla crea una copia por cliente');

insert into public.metricas (entrenador_id, nombre, unidad, mejor) values (:'E1', 'Salto vertical', 'cm', 'mayor') returning id as m1 \gset
insert into public.metricas (entrenador_id, nombre, unidad, mejor) values (:'E1', '5 km', 's', 'menor') returning id as m2 \gset
insert into public.cliente_metricas (cliente_id, metrica_id, cliente_puede_cargar) values (:'c1', :'m1', true) returning id as cm1 \gset
insert into public.cliente_metricas (cliente_id, metrica_id) values (:'c1', :'m2') returning id as cm2 \gset
select id as peso from public.metricas where entrenador_id is null and nombre = 'Peso corporal' \gset
insert into public.cliente_metricas (cliente_id, metrica_id) values (:'c1', :'peso') returning id as cm_peso \gset

insert into public.mediciones (cliente_metrica_id, intentos) values (:'cm1', '{40,45,42}') returning valor as v \gset
select prueba.ok(:'v'::numeric = 45, 'salto vertical: vale el mejor intento (mayor)');
insert into public.mediciones (cliente_metrica_id, intentos) values (:'cm2', '{1500,1480}') returning valor as v \gset
select prueba.ok(:'v'::numeric = 1480, '5 km: vale el mejor intento (menor)');
insert into public.mediciones (cliente_metrica_id, intentos) values (:'cm_peso', '{80.5,80.2}') returning valor as v \gset
select prueba.ok(:'v'::numeric = 80.2, 'peso: sin "mejor", vale el último intento');

select prueba.ok(prueba.afectadas(format($q$update public.metricas set nombre = 'X' where id = %L$q$, :'peso')) = 0,
  'la métrica predefinida no se toca');

-- Storage de E1
select prueba.ok(prueba.afectadas(format($q$insert into storage.objects (bucket_id, name) values ('videos', %L)$q$,
  :'E1' || '/ejercicios/' || :'ej1' || '/v1.mp4')) = 1, 'storage: el entrenador sube un video a su carpeta');
select prueba.falla(format($q$insert into storage.objects (bucket_id, name) values ('videos', %L)$q$,
  :'E2' || '/ejercicios/x.mp4'), 'storage: no puede subir a la carpeta de otro');
select prueba.ok(prueba.afectadas(format($q$insert into storage.objects (bucket_id, name) values ('imagenes', %L)$q$,
  :'E1' || '/clientes/' || :'c1' || '/foto.jpg')) = 1, 'storage: el entrenador sube la foto de un cliente');
select prueba.ok(prueba.afectadas(format($q$insert into storage.objects (bucket_id, name) values ('imagenes', %L)$q$,
  :'E1' || '/clientes/no-es-un-uuid/foto.jpg')) = 1, 'storage: una ruta rara no rompe la policy');

-- U1 antes de aceptar -------------------------------------------------------------

reset role;
select prueba.como(:'U1');
set role authenticated;

select prueba.ok(prueba.filas('select 1 from public.clientes') = 0, 'U1 sin invitar no ve ninguna ficha');
select prueba.ok(prueba.filas('select 1 from public.ejercicios') = 0, 'U1 sin invitar no ve ejercicios');
select prueba.ok(prueba.filas('select 1 from public.metricas') = 7, 'U1 sin invitar solo ve las 7 predefinidas');
select prueba.falla($q$select public.aceptar_invitacion('NOEXISTE00')$q$, 'un código inventado se rechaza');

select public.aceptar_invitacion(lower(:'inv1')) as aceptada \gset
select prueba.ok(:'aceptada' = :'c1', 'U1 acepta la invitación (sin importar mayúsculas)');
select prueba.falla(format('select public.aceptar_invitacion(%L)', :'inv1'), 'la invitación no se puede usar dos veces');
select prueba.falla(format('select public.aceptar_invitacion(%L)', :'inv2'), 'U1 no puede quedarse también con la ficha de Beto');

-- U1 como cliente ---------------------------------------------------------------

select prueba.ok(prueba.filas('select 1 from public.clientes') = 1, 'U1 ve su ficha');
select prueba.ok(prueba.filas('select 1 from public.notas_cliente') = 0, 'U1 no ve las notas privadas');
select prueba.ok(prueba.filas('select 1 from public.invitaciones') = 0, 'U1 no ve invitaciones');
select prueba.ok(prueba.filas('select 1 from public.rutinas') = 1, 'U1 ve solo su rutina (ni la plantilla ni la de Beto)');
select prueba.ok(prueba.filas('select 1 from public.rutina_ejercicios') = 1, 'U1 ve los ejercicios de su rutina');
select prueba.ok(prueba.filas('select 1 from public.ejercicios') = 1, 'U1 ve la biblioteca de su entrenador');
select prueba.ok(prueba.filas('select 1 from public.ejercicio_videos') = 1, 'U1 ve los videos de su entrenador');
select prueba.ok(prueba.filas('select 1 from public.perfiles') = 2, 'U1 ve su perfil y el de su entrenador');
select prueba.ok(prueba.filas('select 1 from public.entrenadores') = 1, 'U1 ve a su entrenador');
select prueba.ok(prueba.filas('select 1 from public.metricas') = 9, 'U1 ve las predefinidas y las de su entrenador');
select prueba.ok(prueba.filas('select 1 from public.mediciones') = 3, 'U1 ve sus mediciones');

select prueba.ok(prueba.afectadas($q$update public.clientes set nombre = 'Hackeado'$q$) = 0, 'U1 no puede editar su ficha');
select prueba.ok(prueba.afectadas($q$update public.perfiles set nombre = 'Otro'$q$) = 1, 'U1 edita solo su propio perfil');
select prueba.falla($q$update public.clientes set estado = 'activo', entrenador_id = entrenador_id$q$, 'nadie puede cambiar el entrenador de una ficha');
select prueba.falla(format($q$insert into public.ejercicios (entrenador_id, nombre) values (%L, 'X')$q$, :'U1'), 'un cliente no crea ejercicios');
select prueba.falla(format($q$insert into public.rutinas (entrenador_id, nombre) values (%L, 'X')$q$, :'E1'), 'un cliente no crea rutinas a nombre del entrenador');

insert into public.sesiones (cliente_id, rutina_id, rutina_nombre) values (:'c1', :'r1', 'Fuerza A') returning id as s1 \gset
select prueba.ok((select registrada_por from public.sesiones where id = :'s1') = :'U1', 'la sesión queda registrada por U1');
select prueba.ok(prueba.afectadas(format($q$insert into public.sesion_series (sesion_id, ejercicio_id, orden_ejercicio, numero, peso_kg, reps) values (%L, %L, 1, 1, 60, 8)$q$,
  :'s1', :'ej1')) = 1, 'U1 registra una serie');
select prueba.falla(format($q$insert into public.sesiones (cliente_id, rutina_nombre) values (%L, 'X')$q$, :'c2'),
  'U1 no registra sesiones de otro cliente');
select prueba.falla(format($q$insert into public.sesiones (cliente_id, rutina_id, rutina_nombre) values (%L, %L, 'X')$q$, :'c1', :'plantilla'),
  'la rutina de la sesión tiene que ser del cliente');
select prueba.falla(format($q$insert into public.sesiones (cliente_id, rutina_nombre, registrada_por) values (%L, 'X', %L)$q$, :'c1', :'E1'),
  'no se puede registrar a nombre de otro');
select prueba.falla(format($q$insert into public.sesion_comentarios (sesion_id, texto) values (%L, 'Genial')$q$, :'s1'),
  'el cliente no escribe la devolución del entrenador');

select prueba.falla(format($q$insert into public.mediciones (cliente_metrica_id, intentos, valor) values (%L, '{50}', 999)$q$, :'cm1'),
  'nadie manda el valor: lo calcula la base');
insert into public.mediciones (cliente_metrica_id, intentos) values (:'cm1', '{50,48}') returning valor as v \gset
select prueba.ok(:'v'::numeric = 50, 'U1 carga su propio salto');
select prueba.falla(format($q$insert into public.mediciones (cliente_metrica_id, intentos) values (%L, '{10}')$q$, :'cm2'),
  'U1 no carga una métrica que no lo tiene habilitado');
select prueba.ok(prueba.afectadas(format($q$update public.mediciones set nota = 'x' where cliente_metrica_id = %L and registrada_por = %L$q$, :'cm1', :'E1')) = 0,
  'U1 no edita mediciones que cargó el entrenador');

select prueba.ok(prueba.filas('select 1 from storage.objects where bucket_id = ''videos''') = 1, 'storage: U1 ve el video de su entrenador');
select prueba.ok(prueba.filas('select 1 from storage.objects where bucket_id = ''imagenes''') = 1, 'storage: U1 ve solo su propia foto');
select prueba.falla(format($q$insert into storage.objects (bucket_id, name) values ('videos', %L)$q$, :'U1' || '/x.mp4'),
  'storage: un cliente no sube videos, ni a su propia carpeta');

-- E1 sobre lo que hizo U1 ------------------------------------------------------------

reset role;
select prueba.como(:'E1');
set role authenticated;

select prueba.ok(prueba.filas('select 1 from public.sesiones') = 1, 'E1 ve la sesión de su cliente');
select prueba.ok(prueba.afectadas(format($q$insert into public.sesion_comentarios (sesion_id, texto) values (%L, 'Bien la técnica')$q$, :'s1')) = 1,
  'E1 deja su devolución');
insert into public.sesiones (cliente_id, rutina_id, rutina_nombre) values (:'c1', :'r1', 'Fuerza A') returning registrada_por as rp \gset
select prueba.ok(:'rp' = :'E1', 'E1 registra una sesión presencial en nombre de U1');
select prueba.ok(prueba.filas('select 1 from public.perfiles') = 2, 'E1 ve su perfil y el de su cliente vinculado');

-- E2 no ve nada de E1 --------------------------------------------------------------

reset role;
select prueba.como(:'E2');
set role authenticated;

select prueba.ok(prueba.filas('select 1 from public.clientes') = 0, 'E2 no ve clientes de E1');
select prueba.ok(prueba.filas('select 1 from public.notas_cliente') = 0, 'E2 no ve notas de E1');
select prueba.ok(prueba.filas('select 1 from public.invitaciones') = 0, 'E2 no ve invitaciones de E1');
select prueba.ok(prueba.filas('select 1 from public.ejercicios') = 0, 'E2 no ve ejercicios de E1');
select prueba.ok(prueba.filas('select 1 from public.ejercicio_videos') = 0, 'E2 no ve videos de E1');
select prueba.ok(prueba.filas('select 1 from public.rutinas') = 0, 'E2 no ve rutinas de E1');
select prueba.ok(prueba.filas('select 1 from public.sesiones') = 0, 'E2 no ve sesiones de E1');
select prueba.ok(prueba.filas('select 1 from public.sesion_series') = 0, 'E2 no ve series de E1');
select prueba.ok(prueba.filas('select 1 from public.mediciones') = 0, 'E2 no ve mediciones de E1');
select prueba.ok(prueba.filas('select 1 from public.metricas') = 7, 'E2 solo ve las predefinidas');
select prueba.ok(prueba.filas('select 1 from public.perfiles') = 1, 'E2 solo ve su perfil');
select prueba.ok(prueba.filas('select 1 from storage.objects') = 0, 'storage: E2 no ve archivos de E1');
select prueba.falla(format($q$insert into public.rutinas (entrenador_id, cliente_id, nombre) values (%L, %L, 'X')$q$, :'E2', :'c1'),
  'E2 no asigna rutinas a clientes de E1');
select prueba.falla(format('select public.asignar_plantilla(%L, array[]::uuid[])', :'plantilla'), 'E2 no copia plantillas de E1');
insert into public.rutinas (entrenador_id, nombre) values (:'E2', 'Propia') returning id as r_e2 \gset
select prueba.falla(format($q$insert into public.rutina_ejercicios (rutina_id, ejercicio_id, orden, series) values (%L, %L, 1, 3)$q$, :'r_e2', :'ej1'),
  'E2 no usa ejercicios de E1');
select prueba.falla(format($q$insert into public.notas_cliente (cliente_id, texto) values (%L, 'x')$q$, :'c1'), 'E2 no escribe notas sobre clientes de E1');
select prueba.ok(prueba.afectadas(format($q$update public.clientes set estado = 'baja' where id = %L$q$, :'c1')) = 0, 'E2 no da de baja clientes de E1');
select prueba.ok(prueba.afectadas(format($q$delete from storage.objects where name like %L$q$, :'E1' || '%')) = 0, 'storage: E2 no borra archivos de E1');

-- U2 (otro cliente de E1) y U3 (nadie) ---------------------------------------------------

reset role;
select prueba.como(:'U2');
set role authenticated;
select public.aceptar_invitacion(:'inv2') as aceptada2 \gset
select prueba.ok(prueba.filas('select 1 from public.sesiones') = 0, 'U2 no ve las sesiones de U1');
select prueba.ok(prueba.filas('select 1 from public.mediciones') = 0, 'U2 no ve las mediciones de U1');
select prueba.ok(prueba.filas('select 1 from public.perfiles') = 2, 'U2 no ve el perfil de U1');
select prueba.ok(prueba.filas('select 1 from storage.objects where bucket_id = ''videos''') = 1, 'storage: U2 ve los videos de su entrenador');
select prueba.ok(prueba.filas('select 1 from storage.objects where bucket_id = ''imagenes''') = 0, 'storage: U2 no ve la foto de U1');

reset role;
select prueba.como(:'U3');
set role authenticated;
select prueba.ok(prueba.filas('select 1 from public.clientes') + prueba.filas('select 1 from public.rutinas')
  + prueba.filas('select 1 from public.sesiones') + prueba.filas('select 1 from public.ejercicios') = 0, 'U3 no ve nada');
select prueba.falla(format('select public.aceptar_invitacion(%L)', :'inv1'), 'U3 no reutiliza la invitación de U1');

-- Baja (RF-14) ----------------------------------------------------------------------

reset role;
select prueba.como(:'E1');
set role authenticated;
update public.clientes set estado = 'baja' where id = :'c1';

reset role;
select prueba.como(:'U1');
set role authenticated;
select prueba.ok(prueba.filas('select 1 from public.clientes') = 1, 'U1 de baja todavía ve su ficha (para que la app avise)');
select prueba.ok(prueba.filas('select 1 from public.rutinas') = 0, 'U1 de baja no ve rutinas');
select prueba.ok(prueba.filas('select 1 from public.ejercicios') = 0, 'U1 de baja no ve ejercicios');
select prueba.ok(prueba.filas('select 1 from public.sesiones') = 0, 'U1 de baja no ve sesiones');
select prueba.ok(prueba.filas('select 1 from storage.objects') = 0, 'storage: U1 de baja no ve archivos');
select prueba.falla(format($q$insert into public.sesiones (cliente_id, rutina_nombre) values (%L, 'X')$q$, :'c1'), 'U1 de baja no registra sesiones');

reset role;
select prueba.ok((select count(*) from public.sesiones where cliente_id = :'c1') = 2, 'la baja conserva el historial');

-- Sin sesión iniciada (anon) -----------------------------------------------------------

select set_config('request.jwt.claims', '', false);
set role anon;
select prueba.falla('select 1 from public.clientes', 'anon no lee clientes');
select prueba.falla('select 1 from public.metricas', 'anon no lee métricas');
select prueba.falla($q$select public.aceptar_invitacion('X')$q$, 'anon no llama funciones');
reset role;

-- Estructura ------------------------------------------------------------------------

select prueba.ok(not exists (
  select 1 from pg_tables where schemaname = 'public' and not rowsecurity
), 'todas las tablas de public tienen RLS');
select prueba.ok(not exists (
  select 1 from information_schema.role_table_grants
  where table_schema = 'public' and grantee = 'anon'
), 'anon no tiene ningún permiso de tabla');

select prueba.ok((
  select array_agg(p.proname::text order by p.proname)
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef and has_function_privilege('authenticated', p.oid, 'execute')
) = array['aceptar_invitacion'], 'la única función con permisos elevados expuesta en la API es aceptar_invitacion');

\echo 'Todas las pruebas pasaron.'
