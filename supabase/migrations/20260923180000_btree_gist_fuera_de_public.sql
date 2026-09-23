-- btree_gist va en `extensions`, no en `public`.
--
-- La migración de la agenda la creó sin esquema, así que cayó en public, y el
-- linter de Supabase lo marca: las extensiones en public quedan expuestas en
-- la API y se mezclan con las tablas propias. El resto de las extensiones del
-- proyecto (pgcrypto, pg_stat_statements) ya están en `extensions`.
--
-- El índice de turnos_sin_solaparse guarda el opclass por OID, así que sigue
-- funcionando después de mudarla.

do $$
begin
  if exists (
    select 1 from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'btree_gist' and n.nspname = 'public'
  ) then
    alter extension btree_gist set schema extensions;
  end if;
end;
$$;
