import { supabaseAdmin } from '@/app/lib/supabase'
import ChartHistorial from './ChartHistorial'

// Palabras clave para marcar noticias relevantes (interino, hasta Haiku/Fase 8).
const KEYWORDS = /\b(fed|fomc|iran|israel|trump|tariff|arancel|petr[oó]leo|guerra|war|cobre|copper|intervenci|sanction|sanci[oó]n)\b/i

const PERIODO_INICIAL = '1sem'
const DIAS_INICIAL = 7

// Carga server-side del período por defecto (USD/CLP + Cobre) para primer paint.
async function getInicial() {
  const { data: series } = await supabaseAdmin
    .from('series')
    .select('id, codigo')
    .in('codigo', ['USDCLP', 'COBRE', 'DXY'])

  const idPorCodigo = new Map((series ?? []).map((s) => [s.codigo, s.id]))
  const desde = new Date(Date.now() - DIAS_INICIAL * 24 * 3600 * 1000).toISOString()

  const seriesData: Record<string, { t: number; v: number }[]> = {}
  await Promise.all(
    ['USDCLP', 'COBRE', 'DXY'].map(async (codigo) => {
      const id = idPorCodigo.get(codigo)
      if (!id) { seriesData[codigo] = []; return }
      const { data } = await supabaseAdmin
        .from('datos_mercado')
        .select('valor, fecha_dato')
        .eq('serie_id', id)
        .gte('fecha_dato', desde)
        .order('fecha_dato', { ascending: true })
      seriesData[codigo] = (data ?? []).map((p) => ({ t: new Date(p.fecha_dato).getTime(), v: p.valor }))
    })
  )

  const { data: noticias } = await supabaseAdmin
    .from('noticias')
    .select('titulo, publicado_at')
    .gte('publicado_at', desde)
    .order('publicado_at', { ascending: true })
    .limit(500)

  const pines = (noticias ?? [])
    .filter((n) => n.publicado_at && KEYWORDS.test(n.titulo))
    .map((n) => ({ t: new Date(n.publicado_at!).getTime(), titulo: n.titulo }))

  return { periodo: PERIODO_INICIAL, series: seriesData, pines }
}

export default async function HistorialCotizacion() {
  const inicial = await getInicial()

  if ((inicial.series['USDCLP'] ?? []).length < 2) {
    return (
      <div className="px-4 py-4 border-b border-line">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
          Historial USD/CLP
        </h3>
        <p className="text-xs text-muted/60">Acumulando datos…</p>
      </div>
    )
  }

  return <ChartHistorial inicial={inicial} />
}
