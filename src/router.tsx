import { createHashRouter } from 'react-router'
import { ConSesion, SoloCliente, SoloEntrenador, SoloSinSesion } from './auth/Guardias.tsx'
import { DetalleSesion } from './entrenamiento/DetalleSesion.tsx'
import { Entrenar } from './entrenamiento/Entrenar.tsx'
import { Historial } from './entrenamiento/Historial.tsx'
import { AuthLayout } from './layouts/AuthLayout.tsx'
import { Calculadoras } from './pages/Calculadoras.tsx'
import { Inicio } from './pages/Inicio.tsx'
import { NoEncontrada } from './pages/NoEncontrada.tsx'
import { Perfil } from './pages/Perfil.tsx'
import { Progreso } from './pages/Progreso.tsx'
import { VistaRutina } from './pages/VistaRutina.tsx'
import { Ingresar } from './pages/auth/Ingresar.tsx'
import { Invitacion } from './pages/auth/Invitacion.tsx'
import { NuevaContrasena } from './pages/auth/NuevaContrasena.tsx'
import { Recuperar } from './pages/auth/Recuperar.tsx'
import { Registrarse } from './pages/auth/Registrarse.tsx'
import { FichaCliente } from './pages/clientes/FichaCliente.tsx'
import { FormularioCliente } from './pages/clientes/FormularioCliente.tsx'
import { ListaClientes } from './pages/clientes/ListaClientes.tsx'
import { DetalleEjercicio } from './pages/ejercicios/DetalleEjercicio.tsx'
import { FormularioEjercicio } from './pages/ejercicios/FormularioEjercicio.tsx'
import { ListaEjercicios } from './pages/ejercicios/ListaEjercicios.tsx'
import { AsignarMetrica } from './pages/metricas/AsignarMetrica.tsx'
import { DetalleMetrica } from './pages/metricas/DetalleMetrica.tsx'
import { FormularioMetrica } from './pages/metricas/FormularioMetrica.tsx'
import { ListaMetricas } from './pages/metricas/ListaMetricas.tsx'
import { Seguimiento } from './pages/metricas/Seguimiento.tsx'
import { CheckinSemanal } from './pages/seguimiento/CheckinSemanal.tsx'
import { Checkins } from './pages/seguimiento/Checkins.tsx'
import { Cuestionario } from './pages/seguimiento/Cuestionario.tsx'
import { FotosProgreso } from './pages/seguimiento/FotosProgreso.tsx'
import { ProgresoCliente } from './pages/progreso/ProgresoCliente.tsx'
import { ProgresoEjercicio } from './pages/progreso/ProgresoEjercicio.tsx'
import { AsignarPlantilla } from './pages/rutinas/AsignarPlantilla.tsx'
import { EditorRutina } from './pages/rutinas/EditorRutina.tsx'
import { ListaRutinas } from './pages/rutinas/ListaRutinas.tsx'

// Rutas por hash (#/clientes): funcionan en GitHub Pages y en Capacitor sin
// configurar el servidor.
export const router = createHashRouter([
  {
    element: <SoloSinSesion />,
    children: [
      { path: 'ingresar', element: <Ingresar /> },
      { path: 'registrarse', element: <Registrarse /> },
      { path: 'recuperar', element: <Recuperar /> },
    ],
  },
  // Estas dos funcionan con y sin sesión.
  {
    element: <AuthLayout />,
    children: [
      { path: 'nueva-contrasena', element: <NuevaContrasena /> },
      { path: 'invitacion/:codigo', element: <Invitacion /> },
    ],
  },
  {
    element: <ConSesion />,
    children: [
      { index: true, element: <Inicio /> },
      { path: 'perfil', element: <Perfil /> },
      { path: 'calculadoras', element: <Calculadoras /> },
      // El entrenador lo edita; el cliente lo ve desde su rutina (RF-23).
      { path: 'ejercicios/:id', element: <DetalleEjercicio /> },
      // La rutina como la ve el cliente (RF-40); el entrenador también puede abrirla.
      { path: 'rutina/:id', element: <VistaRutina /> },
      // Modo entrenamiento: el cliente, o el entrenador en su nombre (RF-45).
      { path: 'entrenar/:id', element: <Entrenar /> },
      { path: 'sesion/:id', element: <DetalleSesion /> },
      // Cómo se mide (el cliente también lo ve) y el seguimiento de una
      // métrica de un cliente (RF-50 a RF-54).
      { path: 'metricas/:id', element: <DetalleMetrica /> },
      { path: 'seguimiento/:id', element: <Seguimiento /> },
      // Progreso de un ejercicio de un cliente (RF-60): lo ven los dos.
      { path: 'progreso/:clienteId/:ejercicioId', element: <ProgresoEjercicio /> },
      // Cuestionario inicial (RF-13) y check-ins (RF-65): los ven el cliente
      // y su entrenador.
      { path: 'cuestionario/:clienteId', element: <Cuestionario /> },
      { path: 'checkins/:clienteId', element: <Checkins /> },
      { path: 'checkin/:clienteId', element: <CheckinSemanal /> },
      { path: 'fotos/:clienteId', element: <FotosProgreso /> },
      {
        element: <SoloEntrenador />,
        children: [
          { path: 'clientes', element: <ListaClientes /> },
          { path: 'clientes/nuevo', element: <FormularioCliente /> },
          { path: 'clientes/:id', element: <FichaCliente /> },
          { path: 'clientes/:id/editar', element: <FormularioCliente /> },
          { path: 'clientes/:id/sesiones', element: <Historial /> },
          { path: 'clientes/:id/progreso', element: <ProgresoCliente /> },
          { path: 'ejercicios', element: <ListaEjercicios /> },
          { path: 'ejercicios/nuevo', element: <FormularioEjercicio /> },
          { path: 'ejercicios/:id/editar', element: <FormularioEjercicio /> },
          { path: 'rutinas', element: <ListaRutinas /> },
          { path: 'rutinas/nueva', element: <EditorRutina /> },
          { path: 'rutinas/:id', element: <EditorRutina /> },
          { path: 'rutinas/:id/asignar', element: <AsignarPlantilla /> },
          { path: 'metricas', element: <ListaMetricas /> },
          { path: 'metricas/nueva', element: <FormularioMetrica /> },
          { path: 'metricas/:id/editar', element: <FormularioMetrica /> },
          { path: 'metricas/:id/asignar', element: <AsignarMetrica /> },
        ],
      },
      {
        element: <SoloCliente />,
        children: [
          { path: 'historial', element: <Historial /> },
          { path: 'progreso', element: <Progreso /> },
        ],
      },
      { path: '*', element: <NoEncontrada /> },
    ],
  },
])
