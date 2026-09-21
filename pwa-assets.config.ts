import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Genera los íconos de la PWA a partir de public/logo.svg: npm run icons
export default defineConfig({
  preset: minimal2023Preset,
  images: ['public/logo.svg'],
})
