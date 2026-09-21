-- Buckets de la fase 1. Los dos son privados: se leen con URLs firmadas
-- (RNF-02), y cada uno limita tamaño y tipo desde el primer día (RNF-03).
--
-- Rutas:
--   videos:   {entrenador_id}/ejercicios/{ejercicio_id}/{archivo}   (RF-22)
--             {entrenador_id}/metricas/{metrica_id}/{archivo}       (RF-50)
--   imagenes: {entrenador_id}/clientes/{cliente_id}/{archivo}       (RF-11)
--
-- Solo el entrenador sube, y solo dentro de su carpeta. Los videos los ven
-- todos sus clientes; la foto de un cliente, solo ese cliente.
--
-- En las policies, `objects.name` va siempre calificado: sin calificar, dentro
-- de una subconsulta Postgres lo resuelve contra la otra tabla.

-- 50 MB es el máximo por archivo del plan gratis de Supabase. Ver P-01 y P-02
-- en los requisitos: el tamaño final depende de si se comprime en el teléfono.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('videos', 'videos', false, 52428800, array['video/mp4', 'video/quicktime']),
  ('imagenes', 'imagenes', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ¿Soy el cliente con este id? Recibe texto porque sale de la ruta del
-- archivo: castear a uuid algo que no lo es tiraría error dentro de la policy.
create function public.soy_cliente_texto(p_cliente_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.clientes
    where id::text = p_cliente_id and usuario_id = (select auth.uid()) and estado <> 'baja'
  );
$$;

revoke execute on function public.soy_cliente_texto(text) from public, anon;
grant execute on function public.soy_cliente_texto(text) to authenticated, service_role;

-- videos
create policy videos_select on storage.objects for select to authenticated
  using (
    objects.bucket_id = 'videos'
    and (
      (storage.foldername(objects.name))[1] = (select auth.uid())::text
      or (storage.foldername(objects.name))[1] in (select e::text from public.mis_entrenadores() as e)
    )
  );
create policy videos_insert on storage.objects for insert to authenticated
  with check (
    objects.bucket_id = 'videos'
    and (storage.foldername(objects.name))[1] = (select auth.uid())::text
    and (select public.es_entrenador())
  );
create policy videos_update on storage.objects for update to authenticated
  using (
    objects.bucket_id = 'videos'
    and (storage.foldername(objects.name))[1] = (select auth.uid())::text
  )
  with check (
    objects.bucket_id = 'videos'
    and (storage.foldername(objects.name))[1] = (select auth.uid())::text
    and (select public.es_entrenador())
  );
create policy videos_delete on storage.objects for delete to authenticated
  using (
    objects.bucket_id = 'videos'
    and (storage.foldername(objects.name))[1] = (select auth.uid())::text
  );

-- imagenes
create policy imagenes_select on storage.objects for select to authenticated
  using (
    objects.bucket_id = 'imagenes'
    and (
      (storage.foldername(objects.name))[1] = (select auth.uid())::text
      or (
        (storage.foldername(objects.name))[2] = 'clientes'
        and public.soy_cliente_texto((storage.foldername(objects.name))[3])
      )
    )
  );
create policy imagenes_insert on storage.objects for insert to authenticated
  with check (
    objects.bucket_id = 'imagenes'
    and (storage.foldername(objects.name))[1] = (select auth.uid())::text
    and (select public.es_entrenador())
  );
create policy imagenes_update on storage.objects for update to authenticated
  using (
    objects.bucket_id = 'imagenes'
    and (storage.foldername(objects.name))[1] = (select auth.uid())::text
  )
  with check (
    objects.bucket_id = 'imagenes'
    and (storage.foldername(objects.name))[1] = (select auth.uid())::text
    and (select public.es_entrenador())
  );
create policy imagenes_delete on storage.objects for delete to authenticated
  using (
    objects.bucket_id = 'imagenes'
    and (storage.foldername(objects.name))[1] = (select auth.uid())::text
  );
