-- Las series de un bloque se emparejan al guardar (RF-33).
--
-- En una superserie o un circuito se hace una vuelta de todos los ejercicios,
-- así que no puede haber uno con 3 series y otro con 4. El editor ya lo
-- emparejaba, pero era una regla que vivía solo en la pantalla: cualquier
-- cliente futuro (las apps nativas) podía dejar el bloque disparejo. Ahora
-- manda la base: cada bloque toma las series de su primer ejercicio.

create or replace function privado.items_de_rutina(p_ejercicios jsonb)
returns table (
  id uuid, ejercicio_id uuid, orden smallint, series smallint, reps_min smallint,
  reps_max smallint, segundos integer, carga_kg numeric, carga_pct_1rm numeric,
  descanso_s integer, rpe numeric, rir smallint, tempo text, pedir_rpe boolean, notas text,
  superserie smallint
)
language sql
immutable
set search_path = ''
as $$
  select x.id, x.ejercicio_id, (e.posicion - 1)::smallint,
    case
      when x.superserie is null then x.series
      else first_value(x.series) over (partition by x.superserie order by e.posicion)
    end,
    x.reps_min, x.reps_max,
    x.segundos, x.carga_kg, x.carga_pct_1rm, x.descanso_s, x.rpe, x.rir, x.tempo,
    coalesce(x.pedir_rpe, false), x.notas, x.superserie
  from jsonb_array_elements(p_ejercicios) with ordinality as e(item, posicion)
  cross join lateral jsonb_to_record(e.item) as x(
    id uuid, ejercicio_id uuid, series smallint, reps_min smallint, reps_max smallint,
    segundos integer, carga_kg numeric, carga_pct_1rm numeric, descanso_s integer,
    rpe numeric, rir smallint, tempo text, pedir_rpe boolean, notas text, superserie smallint
  );
$$;
