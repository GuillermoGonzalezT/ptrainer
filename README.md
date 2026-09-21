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

## Publicación

Cada push a `main` compila y publica en <https://guillermogonzalezt.github.io/ptrainer/> con el workflow [deploy.yml](.github/workflows/deploy.yml).

Las credenciales de Supabase para la build van en **Settings → Secrets and variables → Actions → Variables** del repo: `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.
