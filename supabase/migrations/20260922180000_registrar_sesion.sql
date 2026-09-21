-- Modo entrenamiento (RF-41 a RF-45).
--
-- Mientras se entrena, la sesión vive en el teléfono (sobrevive a una
-- recarga o a quedarse sin señal). Al terminar se guarda de una vez con
-- registrar_sesion: la sesión y todas sus series, juntas o nada.
--
-- Las dos funciones son SECURITY INVOKER: corren con la RLS de quien llama,
-- así que el cliente solo registra sus sesiones y el entrenador las de sus
-- clientes (RF-45), igual que con un INSERT directo.

-- p_sesion: { id, cliente_id, rutina_id, rutina_nombre, iniciada_en,
--   finalizada_en, esfuerzo, comentario, series: [{ ejercicio_id,
--   rutina_ejercicio_id, orden_ejercicio, numero, peso_kg, reps, segundos, rpe }] }
--
-- El `id` lo genera la app al empezar. Si la sesión ya existe (un reintento
-- después de un corte), no se duplica: se devuelve la que está.
create function public.registrar_sesion(p_sesion jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := (p_sesion ->> 'id')::uuid;
  v_rutina uuid := (p_sesion ->> 'rutina_id')::uuid;
begin
  if v_id is null then
    raise exception 'Falta el id de la sesión.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.sesiones where id = v_id) then
    return v_id;
  end if;

  -- Si el entrenador borró la rutina mientras se entrenaba, la sesión se
  -- guarda igual, sin el vínculo.
  if v_rutina is not null and not exists (select 1 from public.rutinas where id = v_rutina) then
    v_rutina := null;
  end if;

  insert into public.sesiones (id, cliente_id, rutina_id, rutina_nombre, iniciada_en, finalizada_en, esfuerzo, comentario)
  values (
    v_id,
    (p_sesion ->> 'cliente_id')::uuid,
    v_rutina,
    p_sesion ->> 'rutina_nombre',
    coalesce((p_sesion ->> 'iniciada_en')::timestamptz, now()),
    coalesce((p_sesion ->> 'finalizada_en')::timestamptz, now()),
    (p_sesion ->> 'esfuerzo')::smallint,
    nullif(trim(p_sesion ->> 'comentario'), '')
  );

  insert into public.sesion_series (
    sesion_id, ejercicio_id, rutina_ejercicio_id, orden_ejercicio, numero, peso_kg, reps, segundos, rpe)
  select
    v_id,
    x.ejercicio_id,
    -- Igual que con la rutina: si ese ejercicio se quitó de la rutina, se
    -- guarda la serie sin el vínculo.
    case when exists (select 1 from public.rutina_ejercicios re where re.id = x.rutina_ejercicio_id)
      then x.rutina_ejercicio_id end,
    x.orden_ejercicio,
    x.numero,
    x.peso_kg,
    x.reps,
    x.segundos,
    x.rpe
  from jsonb_to_recordset(coalesce(p_sesion -> 'series', '[]'::jsonb)) as x(
    ejercicio_id uuid, rutina_ejercicio_id uuid, orden_ejercicio smallint, numero smallint,
    peso_kg numeric, reps smallint, segundos integer, rpe numeric
  );

  return v_id;
end;
$$;

-- "La última vez" (RF-43): para cada ejercicio pedido, las series de la
-- sesión más reciente del cliente en la que lo hizo.
create function public.ultima_vez(p_cliente_id uuid, p_ejercicio_ids uuid[])
returns table (
  ejercicio_id uuid, fecha timestamptz, numero smallint, peso_kg numeric,
  reps smallint, segundos integer, rpe numeric
)
language sql
stable
set search_path = ''
as $$
  with ultima as (
    select distinct on (ss.ejercicio_id) ss.ejercicio_id, s.id as sesion_id, s.iniciada_en
    from public.sesion_series ss
    join public.sesiones s on s.id = ss.sesion_id
    where s.cliente_id = p_cliente_id and ss.ejercicio_id = any (p_ejercicio_ids)
    order by ss.ejercicio_id, s.iniciada_en desc
  )
  select u.ejercicio_id, u.iniciada_en, ss.numero, ss.peso_kg, ss.reps, ss.segundos, ss.rpe
  from ultima u
  join public.sesion_series ss on ss.sesion_id = u.sesion_id and ss.ejercicio_id = u.ejercicio_id
  order by u.ejercicio_id, ss.numero;
$$;

revoke execute on function public.registrar_sesion(jsonb) from public, anon;
grant execute on function public.registrar_sesion(jsonb) to authenticated, service_role;
revoke execute on function public.ultima_vez(uuid, uuid[]) from public, anon;
grant execute on function public.ultima_vez(uuid, uuid[]) to authenticated, service_role;
