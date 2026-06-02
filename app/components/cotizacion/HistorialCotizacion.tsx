import { supabaseAdmin } from '@/app/lib/supabase'
import GraficoInteractivo from './GraficoInteractivo'

// Palabras clave para marcar noticias relevantes (versión interina).
// Cuando llegue la IA (Fase 7), este criterio se reemplaza por impacto real.
const KEYWORDS = /\b(fed|fomc|iran|israel|trump|tariff|arancel|petr[oó]leo|guerra|war|cobre|copper|intervenci|sanction|sanci[oó]n)\b/i

// Espaciado mínimo entre pines para no saturar (ms)
const ESPACIADO_MIN = 45 * 60 * 1000

async function getDatos() {
  const { data: serie } = await supabaseAdmin
    .from('series').select('id').eq('codigo', 'USDCLP').single()
  if (!serie) return { puntos: [], noticias: [] }

  const desde = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()

  const [{ data: puntos }, { data: noticias }] = await Promise.all([
    supabaseAdmin
      .from('datos_mercado')
      .select('valor, fecha_dato')
      .eq('serie_id', serie.id)
      .gte('fecha_dato', desde)
      .order('fecha_dato', { ascending: true }),
    supabaseAdmin
      .from('noticias')
      .select('titulo, publicado_at')
      .gte('publicado_at', desde)
      .order('publicado_at', { ascending: true })
      .limit(400)
  ])

  return { puntos: puntos ?? [], noticias: noticias ?? [] }
}

export default async function HistorialCotizacion() {
  const { puntos, noticias } = await getDatos()

  if (puntos.length < 2) {
    return (
      <div className="px-4 py-4 border-b border-gray-800">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Historial USD/CLP
        </h3>
        <p className="text-xs text-gray-600">Acumulando datos... (se llena con el tiempo)</p>
      </div>
    )
  }

  const puntosClient = puntos.map(p => ({ t: new Date(p.fecha_dato).getTime(), v: p.valor }))
  const t0 = puntosClient[0].t
  const t1 = puntosClient[puntosClient.length - 1].t

  // Pines: keyword match + espaciado mínimo para no saturar
  const candidatos = (noticias ?? [])
    .filter(n => n.publicado_at && KEYWORDS.test(n.titulo))
    .map(n => ({ t: new Date(n.publicado_at!).getTime(), titulo: n.titulo }))
    .filter(p => p.t >= t0 && p.t <= t1)

  const pines: { t: number; titulo: string }[] = []
  let ultimoT = -Infinity
  for (const c of candidatos) {
    if (c.t - ultimoT >= ESPACIADO_MIN) {
      pines.push(c)
      ultimoT = c.t
    }
  }

  return (
    <div className="px-4 py-4 border-b border-gray-800">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Historial USD/CLP · 3 días
        </h3>
        <span className="text-xs text-gray-600">
          {puntos.length} pts · <span className="text-amber-400">▲</span> {pines.length}
        </span>
      </div>

      <GraficoInteractivo puntos={puntosClient} pines={pines} />
    </div>
  )
}
