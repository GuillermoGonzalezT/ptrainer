-- Progreso por ejercicio (RF-60), calculado en la base a partir de las
-- series registradas, para no traer cada serie al teléfono.
--
-- Las dos funciones son SECURITY INVOKER: el entrenador ve el progreso de
-- sus clientes y el cliente, el suyo; a cualquier otro le devuelven vacío.

-- Los ejercicios que hizo un cliente, del más reciente al más viejo.
create function public.ejercicios_realizados(p_cliente_id uuid)
returns table (ejercicio_id uuid, nombre text, sesiones bigint, ultima timestamptz, carga_max numeric)
language sql
stable
set search_path = ''
as $$
  select ss.ejercicio_id, e.nombre, count(distinct s.id), max(s.iniciada_en), max(ss.peso_kg)
  from public.sesion_series ss
  join public.sesiones s on s.id = ss.sesion_id
  join public.ejercicios e on e.id = ss.ejercicio_id
  where s.cliente_id = p_cliente_id
  group by ss.ejercicio_id, e.nombre
  order by max(s.iniciada_en) desc;
$$;

-- Un ejercicio de un cliente, sesión por sesión, de la más vieja a la más
-- nueva. Volumen = suma de kilos × repeticiones de cada serie.
create function public.progreso_ejercicio(p_cliente_id uuid, p_ejercicio_id uuid)
returns table (
  sesion_id uuid, fecha timestamptz, series bigint, carga_max numeric, volumen numeric,
  reps_max smallint, reps_total bigint, segundos_max integer
)
language sql
stable
set search_path = ''
as $$
  select s.id, s.iniciada_en, count(*), max(ss.peso_kg),
    sum(coalesce(ss.peso_kg, 0) * coalesce(ss.reps, 0)),
    max(ss.reps), sum(ss.reps), max(ss.segundos)
  from public.sesion_series ss
  join public.sesiones s on s.id = ss.sesion_id
  where s.cliente_id = p_cliente_id and ss.ejercicio_id = p_ejercicio_id
  group by s.id, s.iniciada_en
  order by s.iniciada_en;
$$;

revoke execute on function public.ejercicios_realizados(uuid) from public, anon;
grant execute on function public.ejercicios_realizados(uuid) to authenticated, service_role;
revoke execute on function public.progreso_ejercicio(uuid, uuid) from public, anon;
grant execute on function public.progreso_ejercicio(uuid, uuid) to authenticated, service_role;
