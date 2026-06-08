import Anthropic from '@anthropic-ai/sdk'
import { anthropic, MODELOS, registrarUso } from './anthropic'
import { supabaseAdmin } from './supabase'

const TZ = 'America/Santiago'

function fechaChile(now = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: TZ }) // YYYY-MM-DD
}

function horaChile(now = new Date()): number {
  return parseInt(now.toLocaleString('es-CL', { timeZone: TZ, hour: 'numeric', hour12: false }))
}

// true si ya existe síntesis para hoy (hora Chile)
export async function sintesisExisteHoy(now = new Date()): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('sintesis_diaria')
    .select('id')
    .eq('fecha', fechaChile(now))
    .maybeSingle()
  return !!data
}

// Solo genera si es >= 07:00 Chile y aún no existe la de hoy
export async function generarSintesisSiCorresponde(now = new Date()): Promise<boolean> {
  if (horaChile(now) < 7) return false
  if (await sintesisExisteHoy(now)) return false
  await generarSintesis(now)
  return true
}

async function generarSintesis(now = new Date()): Promise<void> {
  // Factores del último valor disponible
  const { data: series } = await supabaseAdmin
    .from('series')
    .select('id, codigo, nombre, unidad')
    .eq('activo', true)
    .in('codigo', ['USDCLP', 'COBRE', 'DXY', 'TPM', 'FED', 'PETROLEO', 'VIX'])

  const factores = await Promise.all(
    (series ?? []).map(async (s) => {
      const { data } = await supabaseAdmin
        .from('datos_mercado')
        .select('valor, fecha_dato')
        .eq('serie_id', s.id)
        .order('fecha_dato', { ascending: false })
        .limit(1)
        .single()
      return `- ${s.nombre} (${s.codigo}): ${data?.valor ?? 'sin dato'}${s.unidad ? ' ' + s.unidad : ''}`
    }),
  )

  // Noticias de las últimas 24h
  const desde24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const { data: noticias } = await supabaseAdmin
    .from('noticias')
    .select('titulo, analisis_ia(impacto, factor_codigo)')
    .gte('publicado_at', desde24h)
    .order('publicado_at', { ascending: false })
    .limit(40)

  const lineasNoticias = (noticias ?? []).map((n) => {
    const raw = n.analisis_ia as unknown as { impacto?: string; factor_codigo?: string } | null
    const ia = Array.isArray(raw) ? raw[0] : raw
    const badge = ia?.impacto ? ` [${ia.impacto}]` : ''
    return `- ${n.titulo}${badge}`
  })

  const fecha = fechaChile(now)
  const prompt = `Eres el analista de EZ Trader. Genera una síntesis del día para traders de USD/CLP.

## Datos de mercado (último valor)
${factores.join('\n')}

## Noticias de las últimas 24h (${lineasNoticias.length})
${lineasNoticias.join('\n') || 'Sin noticias recientes.'}

## Instrucciones
Escribe un resumen ejecutivo de 3-4 párrafos cortos en español:
1. Estado actual del mercado y sesgo direccional del USD/CLP
2. Principales catalizadores activos (qué noticias/factores están moviendo el par)
3. Qué mirar hoy (riesgos o eventos a seguir)

Tono: directo, sin adornos. Sin recomendaciones de compra/venta. Sin disclaimers.`

  const respuesta = await anthropic.messages.create({
    model: MODELOS.agente,
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  await registrarUso({
    proposito: 'sintesis_diaria',
    modelo: MODELOS.agente,
    uso: respuesta.usage,
    metadata: { fecha },
  })

  const texto = respuesta.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()

  await supabaseAdmin.from('sintesis_diaria').insert({
    fecha,
    texto,
    modelo: MODELOS.agente,
  })
}
