-- Panel de inicio del entrenador (RF-70).

-- A partir de cuántos días sin entrenar un cliente aparece en el panel. Lo
-- elige cada entrenador; queda en la base para que valga en cualquier
-- dispositivo.
alter table public.entrenadores
  add column dias_sin_entrenar smallint not null default 7 check (dias_sin_entrenar between 1 and 60);

-- Hasta ahora `entrenadores` era de solo lectura desde la app. Ahora cada
-- entrenador edita su fila, y solo esa columna.
create policy entrenadores_update on public.entrenadores for update to authenticated
  using (entrenadores.id = (select auth.uid()))
  with check (entrenadores.id = (select auth.uid()));
grant update (dias_sin_entrenar) on public.entrenadores to authenticated;

-- La fecha del último entrenamiento de cada cliente. SECURITY INVOKER: el
-- entrenador ve la de sus clientes y un cliente, la suya.
create function public.ultimo_entrenamiento()
returns table (cliente_id uuid, ultima timestamptz)
language sql
stable
set search_path = ''
as $$
  select s.cliente_id, max(s.iniciada_en)
  from public.sesiones s
  group by s.cliente_id;
$$;

revoke execute on function public.ultimo_entrenamiento() from public, anon;
grant execute on function public.ultimo_entrenamiento() to authenticated, service_role;
