import { NavLink, Outlet } from 'react-router'
import styles from './AppLayout.module.css'

const tabs = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/clientes', label: 'Clientes' },
  { to: '/ejercicios', label: 'Ejercicios' },
  { to: '/rutinas', label: 'Rutinas' },
]

export function AppLayout() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.brand}>PTrainer</span>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <nav className={styles.tabbar} aria-label="Secciones">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => (isActive ? `${styles.tab} ${styles.active}` : styles.tab)}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
