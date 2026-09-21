import type { ReactNode } from 'react'
import { Outlet } from 'react-router'
import { Marca } from '../components/Marca.tsx'
import styles from './AuthLayout.module.css'

// Marco de las pantallas sin sesión: logo arriba y una columna angosta.
export function AuthLayout({ children }: { children?: ReactNode }) {
  return (
    <div className={styles.fondo}>
      <main className={styles.columna}>
        <Marca />
        {children ?? <Outlet />}
      </main>
    </div>
  )
}
