import { supabaseAdmin } from './supabase'

const SERIES = ['USDCLP', 'COBRE', 'DXY']

async function getSerieHistorial(codigo: string, dias: number) {
  const { data: serie } = await supabaseAdmin
    .from('series').select('id, nombre, unidad').eq('codigo', codigo).single()
  if (!serie) return null

  const desde = new Date(Date.now() - dias * 24 * 3600 * 1000).toISOString()
  const { data } = await supabaseAdmin
    .from('datos_mercado')
    .select('valor, fecha_dato')
    .eq('serie_id', serie.id)
    .gte('fecha_dato', desde)
    .order('fecha_dato', { ascending: true })

  return { serie, puntos: data ?? [] }
}

function resumenSerie(puntos: { valor: number; fecha_dato: string }[]) {
  if (puntos.length === 0) return null
  const valores = puntos.map(p => p.valor)
  const actual = valores[valores.length - 1]
  const primero = valores[0]
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  const variacion = primero ? ((actual - primero) / primero) * 100 : 0
  return { actual, primero, min, max, variacion }
}

export async function generarBriefing(): Promise<string> {
  const dias = 14
  const ahora = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })

  // Historiales de mercado
  const historiales = await Promise.all(SERIES.map(c => getSerieHistorial(c, dias)))

  // Noticias de la última semana
  const desdeNoticias = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  const { data: noticias } = await supabaseAdmin
    .from('noticias')
    .select('titulo, publicado_at, fuentes(nombre)')
    .gte('publicado_at', desdeNoticias)
    .order('publicado_at', { ascending: false })
    .limit(50)

  let md = `# Briefing EZ Trader — USD/CLP\n`
  md += `Generado: ${ahora} (Santiago)\n\n`

  md += `## Tu rol\n`
  md += `Eres un asesor de trading macro especializado en el par USD/CLP. Tu objetivo es ayudar a `
  md += `detectar oportunidades de posición de **swing semanal** (entrar, mantener días, cerrar). `
  md += `No garantizas resultados; entregas análisis y gestión de riesgo. Marco de interpretación:\n\n`
  md += `- **Cobre**: relación INVERSA. Cobre sube → peso se fortalece (USD/CLP baja).\n`
  md += `- **DXY (dólar global)**: relación DIRECTA. DXY sube → USD/CLP sube.\n`
  md += `- **Diferencial de tasas (TPM Chile vs Fed)**: menos diferencial a favor de Chile → peso débil.\n`
  md += `- **Regla de oro**: en condiciones normales mandan cobre y DXY. Una noticia aguda (Fed, `
  md += `geopolítica, intervención del Banco Central) puede anularlos temporalmente.\n`
  md += `- **Señal de entrada de mayor probabilidad**: cuando los factores se ALINEAN en una dirección.\n\n`

  md += `## Estado actual del mercado\n\n`
  for (const h of historiales) {
    if (!h) continue
    const r = resumenSerie(h.puntos)
    if (!r) { md += `- **${h.serie.nombre}**: sin datos aún\n`; continue }
    md += `- **${h.serie.nombre}** (${h.serie.unidad ?? ''}): ${r.actual.toFixed(3)} `
    md += `| ${dias}d: ${r.variacion >= 0 ? '+' : ''}${r.variacion.toFixed(2)}% `
    md += `| rango ${r.min.toFixed(3)}–${r.max.toFixed(3)}\n`
  }

  md += `\n## Historial reciente (hasta ${dias} días)\n`
  for (const h of historiales) {
    if (!h || h.puntos.length === 0) continue
    md += `\n### ${h.serie.nombre}\n`
    // Muestra hasta 30 puntos espaciados para no saturar
    const paso = Math.max(1, Math.floor(h.puntos.length / 30))
    const muestra = h.puntos.filter((_, i) => i % paso === 0)
    for (const p of muestra) {
      const f = new Date(p.fecha_dato).toLocaleString('es-CL', {
        timeZone: 'America/Santiago', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      })
      md += `${f}: ${p.valor.toFixed(3)}\n`
    }
  }

  md += `\n## Noticias de la última semana (${noticias?.length ?? 0})\n`
  for (const n of noticias ?? []) {
    const f = n.publicado_at
      ? new Date(n.publicado_at).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })
      : '--'
    const fuente = (n.fuentes as unknown as { nombre: string } | null)?.nombre ?? 'Fuente'
    md += `- [${f}] ${n.titulo} (${fuente})\n`
  }

  md += `\n## Pregunta sugerida\n`
  md += `Con base en estos datos y el marco anterior: ¿hay una oportunidad de posición USD/CLP para `
  md += `esta semana? Indica dirección (long o short USD/CLP), el razonamiento por factores, el nivel `
  md += `de convicción, y qué gestión de riesgo aplicarías (tamaño relativo y dónde reevaluar).\n`

  return md
}
