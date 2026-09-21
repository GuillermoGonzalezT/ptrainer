// Regenera src/datos/database.types.ts desde el proyecto de Supabase vinculado.
// Escribe el archivo solo si la generación salió bien: con un `>` directo, un
// error lo dejaría vacío.
import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const destino = new URL('../src/datos/database.types.ts', import.meta.url)

try {
  const tipos = execSync('npx supabase gen types typescript --linked --schema public', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  if (!tipos.includes('export type Database')) throw new Error('La salida no parece un archivo de tipos.')
  writeFileSync(destino, tipos)
  console.log('Tipos actualizados.')
} catch (e) {
  console.error(`No se pudieron generar los tipos: ${e.message}`)
  process.exit(1)
}
