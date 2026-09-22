import { supabase } from '../lib/supabase.ts'
import { listarClientes, type Cliente } from './clientes.ts'

// Datos del panel de inicio del entrenador (RF-70). RLS ya limita todo a sus
// clientes.

// Cuántos días hacia atrás mira el panel para sesiones y mediciones.
export const DIAS_RECIENTES = 14

export type SesionParaRevisar = {
  id: string
  cliente: string
  rutina_nombre: string
  iniciada_en: string
  esfuerzo: number | null
  comentario: string | null
  series: number
}

export type ClienteSinEntrenar = {
  cliente: Pick<Cliente, 'id' | 'nombre' | 'usuario_id'>
  // null si nunca registró una sesión.
  ultima: string | null
  dias: number | null
}

export type MedicionNueva = {
  id: string
  asignacionId: string
  cliente: string
  metrica: string
  unidad: string
  valor: number
  fecha: string
}

export type Panel = {
  umbral: number
  sesionesSemana: number
  clientesActivos: number
  paraRevisar: SesionParaRevisar[]
  sinEntrenar: ClienteSinEntrenar[]
  mediciones: MedicionNueva[]
}

function db() {
  if (!supabase) throw new Error('Supabase no está configurado')
  return supabase
}

const haceDias = (dias: number) => new Date(Date.now() - dias * 86_400_000).toISOString()

function diasDesde(fecha: string): number {
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000)
}

export async function cargarPanel(entrenadorId: string): Promise<Panel> {
  const [entrenador, sesiones, clientes, ultimos, mediciones] = await Promise.all([
    db().from('entrenadores').select('dias_sin_entrenar').eq('id', entrenadorId).single(),
    db()
      .from('sesiones')
      .select('id, rutina_nombre, iniciada_en, esfuerzo, comentario, registrada_por, clientes(nombre), sesion_comentarios(sesion_id), sesion_series(count)')
      .gte('iniciada_en', haceDias(DIAS_RECIENTES))
      .order('iniciada_en', { ascending: false }),
    listarClientes(),
    db().rpc('ultimo_entrenamiento'),
    db()
      .from('mediciones')
      .select('id, fecha, valor, registrada_por, created_at, cliente_metricas(id, clientes(nombre), metricas(nombre, unidad))')
      .gte('created_at', haceDias(DIAS_RECIENTES))
      .neq('registrada_por', entrenadorId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])
  if (entrenador.error) throw entrenador.error
  if (sesiones.error) throw sesiones.error
  if (ultimos.error) throw ultimos.error
  if (mediciones.error) throw mediciones.error

  const umbral = entrenador.data.dias_sin_entrenar
  const activos = clientes.filter((c) => c.estado === 'activo')
  const ultimaPorCliente = new Map(ultimos.data.map((u) => [u.cliente_id, u.ultima]))

  return {
    umbral,
    sesionesSemana: sesiones.data.filter((s) => diasDesde(s.iniciada_en) < 7).length,
    clientesActivos: activos.length,
    // Las que registró el cliente y todavía no tienen devolución. Las que
    // registró el entrenador en una clase presencial no hace falta revisarlas.
    paraRevisar: sesiones.data
      .filter((s) => s.sesion_comentarios === null && s.registrada_por !== entrenadorId)
      .map((s) => ({
        id: s.id,
        cliente: s.clientes.nombre,
        rutina_nombre: s.rutina_nombre,
        iniciada_en: s.iniciada_en,
        esfuerzo: s.esfuerzo,
        comentario: s.comentario,
        series: s.sesion_series[0]?.count ?? 0,
      })),
    sinEntrenar: activos
      .map((c) => {
        const ultima = ultimaPorCliente.get(c.id) ?? null
        return { cliente: { id: c.id, nombre: c.nombre, usuario_id: c.usuario_id }, ultima, dias: ultima ? diasDesde(ultima) : null }
      })
      .filter((c) => c.dias === null || c.dias >= umbral)
      // Primero los que hace más que no entrenan; los que nunca, al final.
      .sort((a, b) => (b.dias ?? -1) - (a.dias ?? -1)),
    mediciones: mediciones.data.map((m) => ({
      id: m.id,
      asignacionId: m.cliente_metricas.id,
      cliente: m.cliente_metricas.clientes.nombre,
      metrica: m.cliente_metricas.metricas.nombre,
      unidad: m.cliente_metricas.metricas.unidad,
      valor: m.valor,
      fecha: m.fecha,
    })),
  }
}

export async function guardarUmbral(entrenadorId: string, dias: number): Promise<void> {
  const { error } = await db().from('entrenadores').update({ dias_sin_entrenar: dias }).eq('id', entrenadorId)
  if (error) throw error
}
