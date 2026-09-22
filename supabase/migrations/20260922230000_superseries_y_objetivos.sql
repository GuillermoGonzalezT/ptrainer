-- Fase 2, mejoras rápidas: superseries (RF-33) y objetivo por métrica (RF-56).

-- ─────────────────────────────────────────────────────────────────────────────
-- Superseries y circuitos (RF-33)
-- ─────────────────────────────────────────────────────────────────────────────
-- Los ejercicios seguidos de una rutina con el mismo número de superserie se
-- hacen uno atrás del otro, y el descanso va después del último. null = el
-- ejercicio va solo.

alter table public.rutina_ejercicios
  add column superserie smallint check (superserie between 1 and 50);

grant insert (superserie), update (superserie) on public.rutina_ejercicios to authenticated;

-- items_de_rutina cambia lo que devuelve: hay que borrarla y crearla de
-- nuevo, y con ella guardar_ejercicios_rutina, que la usa.
drop function public.guardar_ejercicios_rutina(uuid, jsonb);
drop function privado.items_de_rutina(jsonb);

create function privado.items_de_rutina(p_ejercicios jsonb)
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
  select x.id, x.ejercicio_id, (e.posicion - 1)::smallint, x.series, x.reps_min, x.reps_max,
    x.segundos, x.carga_kg, x.carga_pct_1rm, x.descanso_s, x.rpe, x.rir, x.tempo,
    coalesce(x.pedir_rpe, false), x.notas, x.superserie
  from jsonb_array_elements(p_ejercicios) with ordinality as e(item, posicion)
  cross join lateral jsonb_to_record(e.item) as x(
    id uuid, ejercicio_id uuid, series smallint, reps_min smallint, reps_max smallint,
    segundos integer, carga_kg numeric, carga_pct_1rm numeric, descanso_s integer,
    rpe numeric, rir smallint, tempo text, pedir_rpe boolean, notas text, superserie smallint
  );
$$;

-- Igual que la de 20260922120000, más la columna superserie.
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
    superserie = i.superserie
  from privado.items_de_rutina(p_ejercicios) i
  where re.id = i.id and re.rutina_id = p_rutina_id;

  insert into public.rutina_ejercicios (
    rutina_id, ejercicio_id, orden, series, reps_min, reps_max, segundos, carga_kg,
    carga_pct_1rm, descanso_s, rpe, rir, tempo, pedir_rpe, notas, superserie)
  select p_rutina_id, i.ejercicio_id, i.orden, i.series, i.reps_min, i.reps_max, i.segundos,
    i.carga_kg, i.carga_pct_1rm, i.descanso_s, i.rpe, i.rir, i.tempo, i.pedir_rpe, i.notas,
    i.superserie
  from privado.items_de_rutina(p_ejercicios) i
  where i.id is null;
end;
$$;

revoke execute on function privado.items_de_rutina(jsonb) from public, anon;
grant execute on function privado.items_de_rutina(jsonb) to authenticated, service_role;
revoke execute on function public.guardar_ejercicios_rutina(uuid, jsonb) from public, anon;
grant execute on function public.guardar_ejercicios_rutina(uuid, jsonb) to authenticated, service_role;

-- asignar_plantilla también copia la superserie. CREATE OR REPLACE conserva
-- los permisos que ya tenía.
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
      carga_pct_1rm, descanso_s, rpe, rir, tempo, pedir_rpe, notas, superserie)
    select v_nueva, ejercicio_id, orden, series, reps_min, reps_max, segundos, carga_kg,
      carga_pct_1rm, descanso_s, rpe, rir, tempo, pedir_rpe, notas, superserie
    from public.rutina_ejercicios
    where rutina_id = v_origen.id;

    return next v_nueva;
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Objetivo por métrica (RF-56)
-- ─────────────────────────────────────────────────────────────────────────────
-- Lo fija el entrenador para cada cliente; se muestra en la gráfica. La RLS
-- de update de cliente_metricas ya limita a los clientes del entrenador.

alter table public.cliente_metricas add column objetivo numeric(10, 3);
grant update (objetivo) on public.cliente_metricas to authenticated;
