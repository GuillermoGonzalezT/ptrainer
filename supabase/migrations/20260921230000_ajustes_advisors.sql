-- Ajustes que marcó `supabase db advisors` después de la fase 1.
--
-- 1. Las funciones de permisos que usan las policies eran SECURITY DEFINER y
--    estaban en `public`, así que también se podían llamar desde la API
--    (/rest/v1/rpc/...). No filtraban nada, porque solo responden sobre quien
--    llama, pero no tienen por qué estar expuestas. Pasan a `privado`, que la
--    API no publica. Las policies las siguen encontrando: guardan la
--    referencia a la función, no su nombre.
--    `aceptar_invitacion` queda en `public` a propósito: la app la llama.
--
-- 2. Índices para claves foráneas que no tenían. Sin ellos, borrar una cuenta
--    o una plantilla recorre la tabla entera buscando referencias.

create schema privado;
revoke all on schema privado from public;
grant usage on schema privado to authenticated, service_role;

alter function public.es_entrenador() set schema privado;
alter function public.es_mi_cliente(uuid) set schema privado;
alter function public.soy_cliente(uuid) set schema privado;
alter function public.mis_entrenadores() set schema privado;
alter function public.soy_cliente_texto(text) set schema privado;

create index sesiones_registrada_por_idx on public.sesiones (registrada_por);
create index mediciones_registrada_por_idx on public.mediciones (registrada_por);
create index invitaciones_usada_por_idx on public.invitaciones (usada_por);
create index rutinas_plantilla_id_idx on public.rutinas (plantilla_id);
