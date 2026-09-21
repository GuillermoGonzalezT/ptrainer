# PTrainer

Webapp mobile-first para personal trainers y sus clientes: rutinas, registro de sesiones, métricas y progreso. Los requisitos están en [docs/requisitos-funcionales.md](docs/requisitos-funcionales.md).

## Stack

- Vite + React + TypeScript
- React Router con rutas por hash, para que funcione en GitHub Pages sin servidor
- Supabase: autenticación, base de datos y Storage
- PWA instalable con `vite-plugin-pwa`
- Fase 3: apps de Android e iOS con Capacitor sobre este mismo código

## Desarrollo

Requiere Node 22.22 o superior.

```bash
npm install
cp .env.example .env.local   # completar con los datos de Supabase
npm run dev
```

La app abre en `http://localhost:5173/ptrainer/`. Sin `.env.local` arranca igual, pero sin datos.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Chequea tipos y compila a `dist/` |
| `npm run preview` | Sirve la build de `dist/` |
| `npm run lint` | Lint con oxlint |
| `npm run icons` | Regenera los íconos de la PWA a partir de `public/logo.svg` |

## Base de datos

El esquema vive en [supabase/migrations](supabase/migrations). Nada se cambia desde el panel de Supabase: todo cambio es una migración nueva, así queda registrado cómo llegó la base a su estado.

```bash
npx supabase migration new nombre_del_cambio   # crea el .sql vacío
bash scripts/probar-rls.sh                     # prueba todo en un Postgres local
npx supabase db push                           # lo aplica al proyecto
```

[scripts/probar-rls.sh](scripts/probar-rls.sh) no necesita Docker: usa el Postgres instalado en la máquina (por defecto `C:\Program Files\PostgreSQL\18`; se cambia con `PG_BIN`). Crea una base descartable, le aplica [un simulador de Supabase](supabase/tests/stub_supabase.sql) y todas las migraciones, y corre [las pruebas de permisos](supabase/tests/rls_fase_1.sql).

Reglas para toda migración nueva:

- **Supabase les da todos los permisos sobre toda tabla nueva a `anon` y `authenticated`.** Cada tabla nueva lleva RLS, `REVOKE ALL … FROM anon, authenticated` y después los `GRANT` justos. `service_role` necesita su `GRANT` explícito.
- **Las claves de pertenencia no se pueden escribir desde la API** (`entrenador_id` al editar, `usuario_id`, `registrada_por`): se controlan con `GRANT` por columna.
- **En las policies con subconsultas, calificar las columnas** de la fila evaluada (`objects.name`, `rutinas.cliente_id`). Sin calificar, Postgres puede tomar la de la otra tabla.
- **Cada bucket nuevo nace con límite de tamaño y de tipos.**
- **Toda tabla o policy nueva suma sus casos a las pruebas.**

## Publicación

Cada push a `main` compila y publica en <https://guillermogonzalezt.github.io/ptrainer/> con el workflow [deploy.yml](.github/workflows/deploy.yml).

Las credenciales de Supabase para la build van en **Settings → Secrets and variables → Actions → Variables** del repo: `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.
