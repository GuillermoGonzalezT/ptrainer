import type { ReactNode } from 'react'
import { Outlet } from 'react-router'
import styles from './AuthLayout.module.css'

// Marco de las pantallas sin sesión: logo arriba y una columna angosta.
export function AuthLayout({ children }: { children?: ReactNode }) {
  return (
    <div className={styles.fondo}>
      <main className={styles.columna}>
        <div className={styles.marca}>
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" width={40} height={40} />
          <span>PTrainer</span>
        </div>
        {children ?? <Outlet />}
      </main>
    </div>
  )
}
