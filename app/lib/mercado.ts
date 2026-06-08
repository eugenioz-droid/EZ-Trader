import { supabaseAdmin } from './supabase'

const TWELVE_DATA_KEY = process.env.TWELVE_DATA_API_KEY!
const FRED_API_KEY = process.env.FRED_API_KEY!

interface PrecioDato {
  codigo_serie: string
  valor: number
  fecha_dato: string
}

// fetch con timeout duro. CRÍTICO en Workers: sin esto, una fuente lenta (Stooq se
// cuelga ~15s a veces) hacía que el cron tardara ~48s, lo que (a) perdía precios y
// (b) pg_cron cortaba la llamada antes de llegar a la clasificación de Haiku al final
// → noticias sin clasificar. Con timeout, una fuente lenta falla rápido y el cron sigue.
async function fetchTimeout(url: string, ms = 6000, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

// Helper genérico para una serie de FRED (última observación válida).
async function obtenerFred(serieFred: string, codigoSerie: string): Promise<PrecioDato | null> {
  if (!FRED_API_KEY) return null
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${serieFred}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=1`
  const res = await fetchTimeout(url)
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

// TPM Chile via mindicador.cl (API chilena gratis, sin key, valor diario AL DÍA).
// Reemplaza el viejo proxy de FRED (IRSTCI01CLM156N: mensual, ~3m atraso). El BCCh
// nunca respondió las credenciales; mindicador resuelve la TPM real sin credenciales.
async function obtenerTPM(): Promise<PrecioDato | null> {
  const res = await fetchTimeout('https://mindicador.cl/api/tpm')
  if (!res.ok) throw new Error(`mindicador TPM: HTTP ${res.status}`)
  const data = await res.json()
  const ultimo = data?.serie?.[0]
  if (!ultimo || ultimo.valor == null) return null
  return {
    codigo_serie: 'TPM',
    valor: ultimo.valor,
    fecha_dato: new Date().toISOString(),
  }
}

// Twelve Data: helper genérico para un símbolo (forex o commodity).
async function obtenerTwelveData(simbolo: string, codigoSerie: string): Promise<PrecioDato | null> {
  const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(simbolo)}&apikey=${TWELVE_DATA_KEY}`
  const res = await fetchTimeout(url)
  if (!res.ok) throw new Error(`Twelve Data ${simbolo}: ${res.status}`)
  const data = await res.json()
  if (!data.price) return null
  return {
    codigo_serie: codigoSerie,
    valor: parseFloat(data.price),
    fecha_dato: new Date().toISOString(),
  }
}

const obtenerUSDCLP = () => obtenerTwelveData('USD/CLP', 'USDCLP')

// Cobre via Yahoo Finance v8 chart API (HG=F, COMEX copper futures, USD/lb).
// Stooq hg.f dejó de responder con CSV (devuelve página "does not exist").
// Twelve Data requiere plan pago para HG1!. Yahoo v8 (/v8/finance/chart/) es un
// endpoint distinto al sitio web principal — el bloqueo conocido de Workers afectaba
// finance.yahoo.com; esta URL ha mostrado responder correctamente.
// Si Workers lo bloquea igual, fetchTimeout devuelve error → null → frescura ámbar.
const obtenerCobre    = () => obtenerYahooV8('HG=F',      'COBRE')    // COMEX copper USD/lb
const obtenerDXY      = () => obtenerYahooV8('DX-Y.NYB',  'DXY')      // Dollar Index
const obtenerPetroleo = () => obtenerYahooV8('CL=F',      'PETROLEO') // WTI crude
const obtenerVIX      = () => obtenerYahooV8('^VIX',      'VIX')      // CBOE VIX

// Yahoo Finance v8: helper genérico. Confirmado funcional desde Workers (cobre ya lo usa).
async function obtenerYahooV8(simbolo: string, codigoSerie: string): Promise<PrecioDato | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(simbolo)}?interval=1d&range=1d`
  const res = await fetchTimeout(url, 6000, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  })
  if (!res.ok) throw new Error(`Yahoo v8 ${simbolo}: ${res.status}`)
  const data = await res.json()
  const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice
  if (!price) return null
  return { codigo_serie: codigoSerie, valor: price, fecha_dato: new Date().toISOString() }
}

// Stooq: mantenido como fallback por si algún símbolo no está en Yahoo.
async function obtenerStooq(
  simbolo: string,
  codigo_serie: string,
  factor = 1,
): Promise<PrecioDato | null> {
  const url = `https://stooq.com/q/l/?s=${simbolo}&f=sd2t2ohlcv&h&e=csv`
  // Timeout 6s: Stooq se cuelga intermitentemente desde Workers; mejor perder ese punto
  // (la frescura lo marcará) que colgar el cron entero y bloquear la clasificación.
  const res = await fetchTimeout(url, 6000, { headers: { 'User-Agent': 'Mozilla/5.0 (EZ-Trader/1.0)' } })
  if (!res.ok) throw new Error(`Stooq ${simbolo}: HTTP ${res.status}`)
  const csv = await res.text()
  // Formato: Symbol,Date,Time,Open,High,Low,Close,Volume
  const lineas = csv.trim().split('\n')
  if (lineas.length < 2) return null
  const cols = lineas[1].split(',')
  const close = parseFloat(cols[6])
  if (!isFinite(close) || cols[6] === 'N/D') return null
  // Estampamos con la hora de captura real (UTC), NO la que reporta Stooq:
  // Stooq da la hora en Varsovia (CEST/UTC+2), tratarla como UTC dejaba los puntos
  // ~2h en el futuro y descuadraba el gráfico. Igual que USDCLP/Yahoo: new Date().
  return {
    codigo_serie,
    valor: close * factor,
    fecha_dato: new Date().toISOString(),
  }
}

export async function obtenerPrecios(): Promise<PrecioDato[]> {
  const resultados = await Promise.allSettled([
    obtenerUSDCLP(),
    obtenerCobre(),
    obtenerDXY(),
    obtenerPetroleo(),
    obtenerVIX(),
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

export interface ResultadoGuardado {
  guardados: number
  rechazados: { serie: string; valor: number; motivo: string }[]
}

const MAX_FUTURO_MS = 10 * 60 * 1000 // tolerancia hacia el futuro (relojes desfasados)

// Guarda precios VALIDANDO antes (robustez D): rechaza fecha futura, valor no-positivo
// y saltos absurdos vs el último valor (error de unidad/glitch, ej. cobre ¢ vs $).
export async function guardarPrecios(precios: PrecioDato[]): Promise<ResultadoGuardado> {
  const rechazados: ResultadoGuardado['rechazados'] = []
  if (precios.length === 0) return { guardados: 0, rechazados }

  const { data: series } = await supabaseAdmin.from('series').select('id, codigo')
  const serieMap = new Map(series?.map((s) => [s.codigo, s.id]) ?? [])

  // Último valor conocido por serie (para detectar outliers).
  const idsRelevantes = precios
    .map((p) => serieMap.get(p.codigo_serie))
    .filter((x): x is number => x != null)
  const ultimoPorSerie = new Map<number, number>()
  await Promise.all(
    idsRelevantes.map(async (id) => {
      const { data } = await supabaseAdmin
        .from('datos_mercado')
        .select('valor')
        .eq('serie_id', id)
        .order('fecha_dato', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (data?.valor != null) ultimoPorSerie.set(id, data.valor)
    }),
  )

  const ahora = Date.now()
  const rows: { serie_id: number; valor: number; fecha_dato: string; capturado_at: string }[] = []

  for (const p of precios) {
    const serieId = serieMap.get(p.codigo_serie)
    if (serieId == null) continue

    if (!Number.isFinite(p.valor) || p.valor <= 0) {
      rechazados.push({ serie: p.codigo_serie, valor: p.valor, motivo: 'valor no positivo o inválido' })
      continue
    }
    if (new Date(p.fecha_dato).getTime() > ahora + MAX_FUTURO_MS) {
      rechazados.push({ serie: p.codigo_serie, valor: p.valor, motivo: 'fecha en el futuro' })
      continue
    }
    const ult = ultimoPorSerie.get(serieId)
    if (ult != null && ult > 0) {
      const ratio = p.valor / ult
      if (ratio > 10 || ratio < 0.1) {
        rechazados.push({ serie: p.codigo_serie, valor: p.valor, motivo: `salto absurdo vs último (${ult})` })
        continue
      }
    }

    rows.push({
      serie_id: serieId,
      valor: p.valor,
      fecha_dato: p.fecha_dato,
      capturado_at: new Date().toISOString(),
    })
  }

  if (rechazados.length > 0) {
    console.warn('Precios rechazados por validación:', JSON.stringify(rechazados))
  }
  if (rows.length === 0) return { guardados: 0, rechazados }

  const { data, error } = await supabaseAdmin
    .from('datos_mercado')
    .upsert(rows, { onConflict: 'serie_id,fecha_dato', ignoreDuplicates: true })
    .select('id')

  if (error) {
    console.error('Error guardando precios:', error.message)
    return { guardados: 0, rechazados }
  }

  return { guardados: data?.length ?? 0, rechazados }
}
