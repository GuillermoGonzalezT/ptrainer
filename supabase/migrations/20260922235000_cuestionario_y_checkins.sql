-- Cuestionario inicial (RF-13) y check-in semanal (RF-65).

-- ─────────────────────────────────────────────────────────────────────────────
-- Cuestionario inicial (RF-13)
-- ─────────────────────────────────────────────────────────────────────────────
-- Uno por cliente. Las respuestas van en jsonb: son un formulario fijo que
-- puede cambiar con el tiempo, y no se consultan por campo.

create table public.cuestionarios (
  cliente_id uuid primary key references public.clientes (id) on delete cascade,
  respuestas jsonb not null default '{}'::jsonb
    check (jsonb_typeof(respuestas) = 'object' and pg_column_size(respuestas) < 20000),
  completado_en timestamptz,
  updated_at timestamptz not null default now()
);

create trigger cuestionarios_updated_at before update on public.cuestionarios
  for each row execute function public.tocar_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Check-in semanal (RF-65)
-- ─────────────────────────────────────────────────────────────────────────────
-- Uno por cliente y semana. `semana` es el lunes de esa semana, así no se
-- duplican.

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  semana date not null,
  -- Escalas de 1 a 5. Qué significa cada punta lo dice la app.
  sueno smallint check (sueno between 1 and 5),
  estres smallint check (estres between 1 and 5),
  energia smallint check (energia between 1 and 5),
  cumplimiento smallint check (cumplimiento between 1 and 5),
  comentario text check (char_length(comentario) <= 2000),
  registrado_por uuid default auth.uid() references public.perfiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cliente_id, semana)
);

create index checkins_cliente_id_idx on public.checkins (cliente_id, semana desc);
create index checkins_registrado_por_idx on public.checkins (registrado_por);

create trigger checkins_updated_at before update on public.checkins
  for each row execute function public.tocar_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Permisos
-- ─────────────────────────────────────────────────────────────────────────────
-- Los dos los completan el cliente o su entrenador, y nadie más los ve.

alter table public.cuestionarios enable row level security;
alter table public.checkins enable row level security;

create policy cuestionarios_todo on public.cuestionarios for all to authenticated
  using (privado.es_mi_cliente(cuestionarios.cliente_id) or privado.soy_cliente(cuestionarios.cliente_id))
  with check (privado.es_mi_cliente(cuestionarios.cliente_id) or privado.soy_cliente(cuestionarios.cliente_id));

create policy checkins_todo on public.checkins for all to authenticated
  using (privado.es_mi_cliente(checkins.cliente_id) or privado.soy_cliente(checkins.cliente_id))
  with check (
    (privado.es_mi_cliente(checkins.cliente_id) or privado.soy_cliente(checkins.cliente_id))
    and checkins.registrado_por = (select auth.uid())
  );

revoke all on public.cuestionarios, public.checkins from anon, authenticated;
grant all on public.cuestionarios, public.checkins to service_role;

grant select, delete on public.cuestionarios to authenticated;
grant insert (cliente_id, respuestas, completado_en) on public.cuestionarios to authenticated;
grant update (respuestas, completado_en) on public.cuestionarios to authenticated;

grant select, delete on public.checkins to authenticated;
grant insert (cliente_id, semana, sueno, estres, energia, cumplimiento, comentario, registrado_por)
  on public.checkins to authenticated;
grant update (sueno, estres, energia, cumplimiento, comentario) on public.checkins to authenticated;
