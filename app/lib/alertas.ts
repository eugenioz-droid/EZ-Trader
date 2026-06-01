import { supabaseAdmin } from './supabase'

interface Condicion {
  operador: 'variacion_pct' | 'variacion_pct_abs'
  umbral: number
  ventana: string
}

interface Regla {
  id: number
  codigo: string
  nombre: string
  descripcion: string | null
  serie_id: number | null
  condicion: Condicion
  severidad: string
}

// Convierte '1d', '6h' a milisegundos
function ventanaMs(ventana: string): number {
  const m = ventana.match(/^(\d+)([hd])$/)
  if (!m) return 24 * 3600 * 1000
  const n = parseInt(m[1])
  return m[2] === 'h' ? n * 3600 * 1000 : n * 24 * 3600 * 1000
}

// Evalúa todas las reglas activas y dispara alertas cuando corresponde.
// Devuelve cuántas alertas nuevas se crearon.
export async function evaluarAlertas(): Promise<number> {
  const { data: reglas } = await supabaseAdmin
    .from('reglas_alerta')
    .select('id, codigo, nombre, descripcion, serie_id, condicion, severidad')
    .eq('activo', true)

  if (!reglas) return 0

  const { data: instrumento } = await supabaseAdmin
    .from('instrumentos')
    .select('id')
    .eq('simbolo', 'USD/CLP')
    .single()

  let disparadas = 0

  for (const regla of reglas as Regla[]) {
    if (!regla.serie_id) continue
    const cond = regla.condicion
    if (!cond?.operador) continue

    const winMs = ventanaMs(cond.ventana ?? '1d')
    const desde = new Date(Date.now() - winMs).toISOString()

    // Puntos dentro de la ventana (referencia más antigua vs valor actual)
    const { data: puntos } = await supabaseAdmin
      .from('datos_mercado')
      .select('valor, fecha_dato')
      .eq('serie_id', regla.serie_id)
      .gte('fecha_dato', desde)
      .order('fecha_dato', { ascending: true })

    if (!puntos || puntos.length < 2) continue

    const ref = puntos[0].valor
    const actual = puntos[puntos.length - 1].valor
    if (!ref) continue

    const variacion = ((actual - ref) / ref) * 100

    let dispara = false
    if (cond.operador === 'variacion_pct') {
      dispara = cond.umbral >= 0 ? variacion >= cond.umbral : variacion <= cond.umbral
    } else if (cond.operador === 'variacion_pct_abs') {
      dispara = Math.abs(variacion) >= cond.umbral
    }
    if (!dispara) continue

    // Dedup: no re-disparar la misma regla dentro de la ventana
    const { data: previas } = await supabaseAdmin
      .from('alertas')
      .select('id')
      .eq('regla_id', regla.id)
      .gte('disparada_at', desde)
      .limit(1)
    if (previas && previas.length > 0) continue

    await supabaseAdmin.from('alertas').insert({
      tipo: 'regla',
      regla_id: regla.id,
      instrumento_id: instrumento?.id ?? null,
      severidad: regla.severidad,
      titulo: regla.nombre,
      mensaje: `${regla.descripcion ?? ''} — variación ${variacion.toFixed(2)}% en ${cond.ventana}`,
      contexto: { variacion, valor_actual: actual, valor_ref: ref }
    })
    disparadas++
  }

  return disparadas
}
