import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { Avatar } from '../components/Avatar.tsx'
import { Boton } from '../components/Formulario.tsx'
import { Segmentos } from '../components/Segmentos.tsx'
import { obtenerCliente } from '../datos/clientes.ts'
import { urlsDeFotos } from '../datos/fotos.ts'
import { cerrarSesion } from '../lib/sesion.ts'
import { guardarTema, TEMAS, temaGuardado, type Tema } from '../lib/tema.ts'
import { useConsulta } from '../lib/useConsulta.ts'
import styles from './Perfil.module.css'

export function Perfil() {
  const { session, rol, tipo } = useAuth()
  // Un cliente ve la foto que le puso su entrenador en la ficha.
  const ficha = tipo === 'cliente' ? rol?.fichas.find((f) => f.estado !== 'baja') : undefined
  const { datos: foto } = useConsulta(async () => {
    const cliente = ficha ? await obtenerCliente(ficha.id) : null
    if (!cliente?.foto_path) return null
    return (await urlsDeFotos([cliente.foto_path])).get(cliente.foto_path) ?? null
  }, [ficha?.id])

  const nombre = rol?.nombre || 'Tu perfil'

  return (
    <section className={styles.perfil}>
      <div className={styles.cabecera}>
        <Avatar key={foto ?? 'sin-foto'} nombre={nombre} url={foto} tamano={64} />
        <h1>{nombre}</h1>
      </div>
      <dl className={styles.datos}>
        <dt>Correo</dt>
        <dd>{session?.user.email}</dd>
        <dt>Cuenta</dt>
        <dd>{tipo === 'entrenador' ? 'Entrenador' : 'Cliente'}</dd>
      </dl>
      <ElegirTema />
      <Link to="/calculadoras">Calculadoras: 1RM, porcentajes y discos</Link>
      <Boton type="button" variante="secundario" onClick={cerrarSesion}>
        Cerrar sesión
      </Boton>
    </section>
  )
}

// RF-05: por defecto sigue al sistema; acá se puede forzar uno.
function ElegirTema() {
  const [tema, setTema] = useState<Tema>(temaGuardado)

  function cambiar(nuevo: Tema) {
    setTema(nuevo)
    guardarTema(nuevo)
  }

  return (
    <div className={styles.tema}>
      <Segmentos etiqueta="Tema" opciones={[...TEMAS]} valor={tema} onCambio={cambiar} />
      <p className={styles.temaAyuda}>
        {tema === 'auto'
          ? 'Sigue al de tu teléfono: se pone oscuro cuando el sistema lo está.'
          : 'Queda guardado en este teléfono.'}
      </p>
    </div>
  )
}
