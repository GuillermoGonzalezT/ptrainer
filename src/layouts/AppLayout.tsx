import { Link, NavLink, Outlet } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { Marca } from '../components/Marca.tsx'
import styles from './AppLayout.module.css'

type Pestana = { to: string; label: string; end?: boolean }

const pestanas: Record<'entrenador' | 'cliente', Pestana[]> = {
  entrenador: [
    { to: '/', label: 'Inicio', end: true },
    { to: '/clientes', label: 'Clientes' },
    { to: '/ejercicios', label: 'Ejercicios' },
    { to: '/rutinas', label: 'Rutinas' },
    { to: '/metricas', label: 'Métricas' },
  ],
  cliente: [
    { to: '/', label: 'Hoy', end: true },
    { to: '/historial', label: 'Historial' },
    { to: '/progreso', label: 'Progreso' },
  ],
}

export function AppLayout({ tipo }: { tipo: 'entrenador' | 'cliente' }) {
  const { rol } = useAuth()
  const tabs = pestanas[tipo]
  const inicial = (rol?.nombre.trim()[0] ?? '?').toUpperCase()

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/" className={styles.inicio} aria-label="Ir al inicio">
          <Marca tamano="chica" />
        </Link>
        <Link to="/perfil" className={styles.perfil} aria-label="Tu perfil">
          <span className={styles.avatar} aria-hidden="true">
            {inicial}
          </span>
        </Link>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <nav
        className={styles.tabbar}
        style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
        aria-label="Secciones"
      >
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
