-- Fotos de progreso (RF-64): frente, perfil y espalda con fecha, para
-- comparar dos momentos. Las ven solo el cliente y su entrenador.
--
-- Los archivos van al bucket privado `imagenes`, en
-- {entrenador_id}/clientes/{cliente_id}/progreso/{archivo}, para que valgan
-- las policies que ya existen: el entrenador ve su carpeta y cada cliente,
-- solo la suya.

-- Quién es el entrenador de un cliente. SECURITY DEFINER para poder usarla
-- en la policy sin chocar con la RLS de `clientes`.
create function privado.entrenador_de(p_cliente_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select entrenador_id from public.clientes where id = p_cliente_id;
$$;

revoke execute on function privado.entrenador_de(uuid) from public, anon;
grant execute on function privado.entrenador_de(uuid) to authenticated, service_role;

create table public.fotos_progreso (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  fecha date not null default current_date,
  vista text not null check (vista in ('frente', 'perfil', 'espalda')),
  storage_path text not null unique check (char_length(storage_path) <= 300),
  nota text check (char_length(nota) <= 500),
  subida_por uuid default auth.uid() references public.perfiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index fotos_progreso_cliente_id_idx on public.fotos_progreso (cliente_id, fecha desc);
create index fotos_progreso_subida_por_idx on public.fotos_progreso (subida_por);

alter table public.fotos_progreso enable row level security;

create policy fotos_progreso_select on public.fotos_progreso for select to authenticated
  using (privado.es_mi_cliente(fotos_progreso.cliente_id) or privado.soy_cliente(fotos_progreso.cliente_id));

-- Al registrar la foto se controla que el archivo esté en la carpeta del
-- entrenador de ese cliente, que es la que las policies de Storage dejan ver.
create policy fotos_progreso_insert on public.fotos_progreso for insert to authenticated
  with check (
    (privado.es_mi_cliente(fotos_progreso.cliente_id) or privado.soy_cliente(fotos_progreso.cliente_id))
    and fotos_progreso.subida_por = (select auth.uid())
    and split_part(fotos_progreso.storage_path, '/', 1) = privado.entrenador_de(fotos_progreso.cliente_id)::text
    and split_part(fotos_progreso.storage_path, '/', 4) = 'progreso'
  );

create policy fotos_progreso_update on public.fotos_progreso for update to authenticated
  using (privado.es_mi_cliente(fotos_progreso.cliente_id) or privado.soy_cliente(fotos_progreso.cliente_id))
  with check (privado.es_mi_cliente(fotos_progreso.cliente_id) or privado.soy_cliente(fotos_progreso.cliente_id));

create policy fotos_progreso_delete on public.fotos_progreso for delete to authenticated
  using (privado.es_mi_cliente(fotos_progreso.cliente_id) or privado.soy_cliente(fotos_progreso.cliente_id));

revoke all on public.fotos_progreso from anon, authenticated;
grant all on public.fotos_progreso to service_role;
grant select, delete on public.fotos_progreso to authenticated;
grant insert (cliente_id, fecha, vista, storage_path, nota, subida_por) on public.fotos_progreso to authenticated;
grant update (fecha, vista, nota) on public.fotos_progreso to authenticated;

-- Hasta ahora, en `imagenes` solo subía el entrenador (la foto de la ficha).
-- El cliente puede subir y borrar, pero solo sus fotos de progreso.
create policy imagenes_progreso_insert on storage.objects for insert to authenticated
  with check (
    objects.bucket_id = 'imagenes'
    and (storage.foldername(objects.name))[2] = 'clientes'
    and (storage.foldername(objects.name))[4] = 'progreso'
    and privado.soy_cliente_texto((storage.foldername(objects.name))[3])
  );

create policy imagenes_progreso_delete on storage.objects for delete to authenticated
  using (
    objects.bucket_id = 'imagenes'
    and (storage.foldername(objects.name))[2] = 'clientes'
    and (storage.foldername(objects.name))[4] = 'progreso'
    and privado.soy_cliente_texto((storage.foldername(objects.name))[3])
  );
