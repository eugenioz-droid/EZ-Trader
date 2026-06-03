import { supabaseAdmin } from './supabase'

const TWELVE_DATA_KEY = process.env.TWELVE_DATA_API_KEY!
const FRED_API_KEY = process.env.FRED_API_KEY!

interface PrecioDato {
  codigo_serie: string
  valor: number
  fecha_dato: string
}

// Helper genérico para una serie de FRED (última observación válida).
async function obtenerFred(serieFred: string, codigoSerie: string): Promise<PrecioDato | null> {
  if (!FRED_API_KEY) return null
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${serieFred}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=1`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`FRED ${serieFred}: ${res.status}`)
  const data = await res.json()
  const obs = data?.observations?.[0]
  if (!obs || obs.value === '.' || obs.value == null) return null
  return {
    codigo_serie: codigoSerie,
    valor: parseFloat(obs.value),
    fecha_dato: new Date(obs.date + 'T00:00:00Z').toISOString(),
  }
}

// Tasa Fed (DFF, effective federal funds rate — diaria).
const obtenerFed = () => obtenerFred('DFF', 'FED')
// TPM Chile — PROXY: tasa overnight interbancaria (IRSTCI01CLM156N, mensual, ~3m atraso).
// La TPM exacta/al día requiere la API del BCCh (credenciales pendientes). Swap directo cuando lleguen.
const obtenerTPM = () => obtenerFred('IRSTCI01CLM156N', 'TPM')

// USD/CLP via Twelve Data
async function obtenerUSDCLP(): Promise<PrecioDato | null> {
  const url = `https://api.twelvedata.com/price?symbol=USD/CLP&apikey=${TWELVE_DATA_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Twelve Data error: ${res.status}`)
  const data = await res.json()
  if (!data.price) return null
  return {
    codigo_serie: 'USDCLP',
    valor: parseFloat(data.price),
    fecha_dato: new Date().toISOString()
  }
}

// Cobre, DXY y Petróleo via Stooq (CSV gratis, sin key).
// IMPORTANTE: Yahoo Finance bloquea las IPs de Cloudflare Workers (funciona en local
// pero devuelve vacío en producción). Stooq sí responde desde Workers.
// `factor` ajusta unidades: cobre viene en centavos/lb en Stooq → /100 para USD/lb.
async function obtenerStooq(
  simbolo: string,
  codigo_serie: string,
  factor = 1,
): Promise<PrecioDato | null> {
  const url = `https://stooq.com/q/l/?s=${simbolo}&f=sd2t2ohlcv&h&e=csv`
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (EZ-Trader/1.0)' } })
  if (!res.ok) throw new Error(`Stooq ${simbolo}: HTTP ${res.status}`)
  const csv = await res.text()
  // Formato: Symbol,Date,Time,Open,High,Low,Close,Volume
  const lineas = csv.trim().split('\n')
  if (lineas.length < 2) return null
  const cols = lineas[1].split(',')
  const fecha = cols[1] // YYYY-MM-DD
  const hora = cols[2] // HH:MM:SS
  const close = parseFloat(cols[6])
  if (!isFinite(close) || cols[6] === 'N/D') return null
  // Fecha del dato según Stooq (UTC); si viene N/D usamos ahora.
  const fechaDato =
    fecha && fecha !== 'N/D'
      ? new Date(`${fecha}T${hora && hora !== 'N/D' ? hora : '00:00:00'}Z`).toISOString()
      : new Date().toISOString()
  return {
    codigo_serie,
    valor: close * factor,
    fecha_dato: fechaDato,
  }
}

export async function obtenerPrecios(): Promise<PrecioDato[]> {
  const resultados = await Promise.allSettled([
    obtenerUSDCLP(),
    obtenerStooq('hg.f', 'COBRE', 0.01),  // Stooq da cobre en ¢/lb → ×0.01 = USD/lb
    obtenerStooq('dx.f', 'DXY'),          // futuro del índice dólar (≈ DXY)
    obtenerStooq('cl.f', 'PETROLEO'),     // WTI crudo (Tier 2)
    obtenerFed(),
    obtenerTPM(),
  ])

  const precios: PrecioDato[] = []
  for (const r of resultados) {
    if (r.status === 'fulfilled' && r.value) {
      precios.push(r.value)
    } else if (r.status === 'rejected') {
      console.error('Error obteniendo precio:', r.reason)
    }
  }
  return precios
}

export async function guardarPrecios(precios: PrecioDato[]): Promise<number> {
  if (precios.length === 0) return 0

  const { data: series } = await supabaseAdmin
    .from('series')
    .select('id, codigo')

  const serieMap = new Map(series?.map(s => [s.codigo, s.id]) ?? [])

  const rows = precios
    .filter(p => serieMap.has(p.codigo_serie))
    .map(p => ({
      serie_id: serieMap.get(p.codigo_serie)!,
      valor: p.valor,
      fecha_dato: p.fecha_dato,
      capturado_at: new Date().toISOString()
    }))

  const { data, error } = await supabaseAdmin
    .from('datos_mercado')
    .upsert(rows, { onConflict: 'serie_id,fecha_dato', ignoreDuplicates: true })
    .select('id')

  if (error) {
    console.error('Error guardando precios:', error.message)
    return 0
  }

  return data?.length ?? 0
}
