// Backfill de histórico diario para USD/CLP, Cobre y DXY.
// Se corre UNA vez para poblar datos_mercado con ~3 meses de historia,
// y así habilitar los selectores de período y los gráficos largos.
//
// Uso: node scripts/backfill.mjs
// Lee credenciales de .env.local. No clobbea los datos intradía (timestamps distintos).

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// ── Cargar .env.local manualmente ────────────────────────────────────────
function cargarEnv() {
  const env = {}
  try {
    const txt = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    for (const linea of txt.split('\n')) {
      const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch (e) {
    console.error('No se pudo leer .env.local:', e.message)
    process.exit(1)
  }
  return env
}

const env = cargarEnv()
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

// ── Fuentes ──────────────────────────────────────────────────────────────
async function yahooHistorico(simbolo) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${simbolo}?interval=1d&range=3mo`
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (EZ-Trader/1.0)' } })
  if (!res.ok) throw new Error(`Yahoo ${simbolo}: ${res.status}`)
  const data = await res.json()
  const r = data?.chart?.result?.[0]
  const ts = r?.timestamp ?? []
  const cierres = r?.indicators?.quote?.[0]?.close ?? []
  const puntos = []
  for (let i = 0; i < ts.length; i++) {
    if (cierres[i] == null) continue
    puntos.push({ fecha_dato: new Date(ts[i] * 1000).toISOString(), valor: cierres[i] })
  }
  return puntos
}

async function fredHistorico(serieId) {
  const desde = new Date(Date.now() - 100 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${serieId}&api_key=${env.FRED_API_KEY}&file_type=json&observation_start=${desde}&sort_order=asc`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`FRED ${serieId}: ${res.status}`)
  const data = await res.json()
  return (data.observations ?? [])
    .filter((o) => o.value !== '.' && o.value != null)
    .map((o) => ({ fecha_dato: new Date(o.date + 'T00:00:00Z').toISOString(), valor: parseFloat(o.value) }))
}

async function twelveDataHistorico(simbolo) {
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(simbolo)}&interval=1day&outputsize=120&apikey=${env.TWELVE_DATA_API_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`TwelveData ${simbolo}: ${res.status}`)
  const data = await res.json()
  if (!data.values) throw new Error(`TwelveData ${simbolo}: ${data.message ?? 'sin valores'}`)
  return data.values.map((v) => ({
    fecha_dato: new Date(v.datetime + 'T00:00:00Z').toISOString(),
    valor: parseFloat(v.close),
  }))
}

// ── Insertar ───────────────────────────────────────────────────────────────
async function guardar(codigo, puntos) {
  const { data: serie } = await supabase
    .from('series').select('id').eq('codigo', codigo).single()
  if (!serie) {
    console.warn(`Serie ${codigo} no existe en BD, saltando.`)
    return 0
  }
  const rows = puntos.map((p) => ({
    serie_id: serie.id,
    valor: p.valor,
    fecha_dato: p.fecha_dato,
    capturado_at: new Date().toISOString(),
  }))
  const { data, error } = await supabase
    .from('datos_mercado')
    .upsert(rows, { onConflict: 'serie_id,fecha_dato', ignoreDuplicates: true })
    .select('id')
  if (error) {
    console.error(`Error guardando ${codigo}:`, error.message)
    return 0
  }
  return data?.length ?? 0
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('Backfill iniciado…')
  const tareas = [
    ['USDCLP', () => twelveDataHistorico('USD/CLP')],
    ['COBRE', () => yahooHistorico('HG=F')],
    ['DXY', () => yahooHistorico('DX-Y.NYB')],
    ['PETROLEO', () => yahooHistorico('CL=F')],
    ['FED', () => fredHistorico('DFF')],
    ['TPM', () => fredHistorico('IRSTCI01CLM156N')],
  ]
  for (const [codigo, fn] of tareas) {
    try {
      const puntos = await fn()
      const n = await guardar(codigo, puntos)
      console.log(`  ${codigo}: ${puntos.length} puntos obtenidos, ${n} nuevos insertados.`)
    } catch (e) {
      console.error(`  ${codigo}: ERROR — ${e.message}`)
    }
  }
  console.log('Backfill terminado.')
}

main()
