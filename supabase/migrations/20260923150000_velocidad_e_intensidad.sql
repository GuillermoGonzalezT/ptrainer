-- Velocidad e intensidad en la prescripción (RF-35).
--
-- Para armar rutinas de entrenamiento deportivo y no solo de hipertrofia.
-- Son indicaciones del entrenador: el cliente las lee en la rutina y al
-- entrenar sigue anotando kilos y repeticiones como siempre.
--
--   velocidad_ms     velocidad objetivo de la barra, en metros por segundo
--                    (VBT). 0,80 m/s para fuerza, 1,00 y pico para potencia.
--   perdida_vel_pct  corte por pérdida de velocidad: "terminá la serie
--                    cuando bajes un 20% de la mejor repetición".
--   intensidad       esfuerzo en palabras, para lo que no tiene barra ni
--                    1RM: sprints, saltos, lanzamientos.

alter table public.rutina_ejercicios
  add column velocidad_ms numeric(3, 2) check (velocidad_ms > 0 and velocidad_ms <= 9),
  add column perdida_vel_pct smallint check (perdida_vel_pct between 1 and 90),
  add column intensidad text check (intensidad in ('suave', 'moderado', 'fuerte', 'maximo'));

grant insert (velocidad_ms, perdida_vel_pct, intensidad),
      update (velocidad_ms, perdida_vel_pct, intensidad)
  on public.rutina_ejercicios to authenticated;

-- items_de_rutina devuelve tres columnas más: hay que borrarla y crearla de
-- nuevo, y con ella guardar_ejercicios_rutina, que la usa.
drop function public.guardar_ejercicios_rutina(uuid, jsonb);
drop function privado.items_de_rutina(jsonb);

create function privado.items_de_rutina(p_ejercicios jsonb)
returns table (
  id uuid, ejercicio_id uuid, orden smallint, series smallint, reps_min smallint,
  reps_max smallint, segundos integer, carga_kg numeric, carga_pct_1rm numeric,
  descanso_s integer, rpe numeric, rir smallint, tempo text, pedir_rpe boolean, notas text,
  superserie smallint, velocidad_ms numeric, perdida_vel_pct smallint, intensidad text
)
language sql
immutable
set search_path = ''
as $$
  select x.id, x.ejercicio_id, (e.posicion - 1)::smallint,
    -- Las series son del bloque entero: manda la del primero.
    case
      when x.superserie is null then x.series
      else first_value(x.series) over (partition by x.superserie order by e.posicion)
    end,
    x.reps_min, x.reps_max,
    x.segundos, x.carga_kg, x.carga_pct_1rm, x.descanso_s, x.rpe, x.rir, x.tempo,
    coalesce(x.pedir_rpe, false), x.notas, x.superserie,
    x.velocidad_ms, x.perdida_vel_pct, x.intensidad
  from jsonb_array_elements(p_ejercicios) with ordinality as e(item, posicion)
  cross join lateral jsonb_to_record(e.item) as x(
    id uuid, ejercicio_id uuid, series smallint, reps_min smallint, reps_max smallint,
    segundos integer, carga_kg numeric, carga_pct_1rm numeric, descanso_s integer,
    rpe numeric, rir smallint, tempo text, pedir_rpe boolean, notas text, superserie smallint,
    velocidad_ms numeric, perdida_vel_pct smallint, intensidad text
  );
$$;

-- Igual que la de 20260923140000, más las tres columnas nuevas.
create function public.guardar_ejercicios_rutina(p_rutina_id uuid, p_ejercicios jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.rutinas
    where id = p_rutina_id and entrenador_id = (select auth.uid())
  ) then
    raise exception 'La rutina no existe o no es tuya.' using errcode = 'P0001';
  end if;

  if jsonb_typeof(p_ejercicios) is distinct from 'array' then
    raise exception 'Formato inválido.' using errcode = 'P0001';
  end if;

  delete from public.rutina_ejercicios re
  where re.rutina_id = p_rutina_id
    and not exists (select 1 from privado.items_de_rutina(p_ejercicios) i where i.id = re.id);

  update public.rutina_ejercicios re set
    ejercicio_id = i.ejercicio_id,
    orden = i.orden,
    series = i.series,
    reps_min = i.reps_min,
    reps_max = i.reps_max,
    segundos = i.segundos,
    carga_kg = i.carga_kg,
    carga_pct_1rm = i.carga_pct_1rm,
    descanso_s = i.descanso_s,
    rpe = i.rpe,
    rir = i.rir,
    tempo = i.tempo,
    pedir_rpe = i.pedir_rpe,
    notas = i.notas,
    superserie = i.superserie,
    velocidad_ms = i.velocidad_ms,
    perdida_vel_pct = i.perdida_vel_pct,
    intensidad = i.intensidad
  from privado.items_de_rutina(p_ejercicios) i
  where re.id = i.id and re.rutina_id = p_rutina_id;

  insert into public.rutina_ejercicios (
    rutina_id, ejercicio_id, orden, series, reps_min, reps_max, segundos, carga_kg,
    carga_pct_1rm, descanso_s, rpe, rir, tempo, pedir_rpe, notas, superserie,
    velocidad_ms, perdida_vel_pct, intensidad)
  select p_rutina_id, i.ejercicio_id, i.orden, i.series, i.reps_min, i.reps_max, i.segundos,
    i.carga_kg, i.carga_pct_1rm, i.descanso_s, i.rpe, i.rir, i.tempo, i.pedir_rpe, i.notas,
    i.superserie, i.velocidad_ms, i.perdida_vel_pct, i.intensidad
  from privado.items_de_rutina(p_ejercicios) i
  where i.id is null;
end;
$$;

revoke execute on function privado.items_de_rutina(jsonb) from public, anon;
grant execute on function privado.items_de_rutina(jsonb) to authenticated, service_role;
revoke execute on function public.guardar_ejercicios_rutina(uuid, jsonb) from public, anon;
grant execute on function public.guardar_ejercicios_rutina(uuid, jsonb) to authenticated, service_role;

-- asignar_plantilla también copia lo nuevo. CREATE OR REPLACE conserva los
-- permisos que ya tenía.
create or replace function public.asignar_plantilla(p_rutina_id uuid, p_cliente_ids uuid[])
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
      carga_pct_1rm, descanso_s, rpe, rir, tempo, pedir_rpe, notas, superserie,
      velocidad_ms, perdida_vel_pct, intensidad)
    select v_nueva, ejercicio_id, orden, series, reps_min, reps_max, segundos, carga_kg,
      carga_pct_1rm, descanso_s, rpe, rir, tempo, pedir_rpe, notas, superserie,
      velocidad_ms, perdida_vel_pct, intensidad
    from public.rutina_ejercicios
    where rutina_id = v_origen.id;

    return next v_nueva;
  end loop;
end;
$$;
