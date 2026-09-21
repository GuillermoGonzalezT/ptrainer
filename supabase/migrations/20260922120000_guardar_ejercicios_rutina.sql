-- Guarda de una vez la lista de ejercicios de una rutina (RF-30), tal como
-- quedó en el editor: borra los que se quitaron, actualiza los que siguen y
-- agrega los nuevos. Todo en una transacción, para que un corte a mitad de
-- camino no deje la rutina a medio guardar.
--
-- p_ejercicios es un array JSON; cada elemento trae `id` si ya existía (sin
-- `id` es nuevo) y las columnas de rutina_ejercicios. El orden lo define la
-- posición en el array.

-- Convierte el array JSON en filas. Va en `privado` (fuera de la API).
create function privado.items_de_rutina(p_ejercicios jsonb)
returns table (
  id uuid, ejercicio_id uuid, orden smallint, series smallint, reps_min smallint,
  reps_max smallint, segundos integer, carga_kg numeric, carga_pct_1rm numeric,
  descanso_s integer, rpe numeric, rir smallint, tempo text, pedir_rpe boolean, notas text
)
language sql
immutable
set search_path = ''
as $$
  select x.id, x.ejercicio_id, (e.posicion - 1)::smallint, x.series, x.reps_min, x.reps_max,
    x.segundos, x.carga_kg, x.carga_pct_1rm, x.descanso_s, x.rpe, x.rir, x.tempo,
    coalesce(x.pedir_rpe, false), x.notas
  from jsonb_array_elements(p_ejercicios) with ordinality as e(item, posicion)
  cross join lateral jsonb_to_record(e.item) as x(
    id uuid, ejercicio_id uuid, series smallint, reps_min smallint, reps_max smallint,
    segundos integer, carga_kg numeric, carga_pct_1rm numeric, descanso_s integer,
    rpe numeric, rir smallint, tempo text, pedir_rpe boolean, notas text
  );
$$;

-- SECURITY INVOKER: corre con los permisos y la RLS de quien llama. El
-- chequeo del principio es para dar un mensaje claro; aunque no estuviera,
-- la RLS no dejaría tocar rutinas ajenas.
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
    notas = i.notas
  from privado.items_de_rutina(p_ejercicios) i
  where re.id = i.id and re.rutina_id = p_rutina_id;

  -- Un `id` que no es de esta rutina no se actualiza (el UPDATE lo filtra) y
  -- tampoco se inserta: se ignora.
  insert into public.rutina_ejercicios (
    rutina_id, ejercicio_id, orden, series, reps_min, reps_max, segundos, carga_kg,
    carga_pct_1rm, descanso_s, rpe, rir, tempo, pedir_rpe, notas)
  select p_rutina_id, i.ejercicio_id, i.orden, i.series, i.reps_min, i.reps_max, i.segundos,
    i.carga_kg, i.carga_pct_1rm, i.descanso_s, i.rpe, i.rir, i.tempo, i.pedir_rpe, i.notas
  from privado.items_de_rutina(p_ejercicios) i
  where i.id is null;
end;
$$;

revoke execute on function privado.items_de_rutina(jsonb) from public, anon;
grant execute on function privado.items_de_rutina(jsonb) to authenticated, service_role;
revoke execute on function public.guardar_ejercicios_rutina(uuid, jsonb) from public, anon;
grant execute on function public.guardar_ejercicios_rutina(uuid, jsonb) to authenticated, service_role;
