import Parser from 'rss-parser'
import { supabaseAdmin } from './supabase'

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'Mozilla/5.0 (EZ-Trader/1.0)' }
})

// Feeds RSS. Mezcla auditada (2026-06-03): fuentes rápidas/primarias + 2 búsquedas
// locales de Google (CLP y cobre, sin buen equivalente gratis en español). Se podaron
// las 3 búsquedas en inglés de Google (Breaking/Geopolítica/China): Financial Juice +
// investingLive + Fed cubren global/macro/geopolítica más rápido y con mejor calidad.
const FEEDS = [
  // Squawk en tiempo real — titulares que mueven el mercado (inglés). Baja latencia.
  {
    nombre: 'Financial Juice',
    url: 'https://www.financialjuice.com/feed.ashx?xy=rss',
    fuente_nombre: 'Financial Juice',
    idioma: 'en',
  },
  // Feed rápido intradía — mercados forex (inglés)
  {
    nombre: 'investingLive',
    url: 'https://investinglive.com/feed/news',
    fuente_nombre: 'investingLive (ForexLive)',
    idioma: 'en',
  },
  // FUENTE PRIMARIA: Reserva Federal — comunicados de política monetaria
  {
    nombre: 'Federal Reserve - Monetary',
    url: 'https://www.federalreserve.gov/feeds/press_monetary.xml',
    fuente_nombre: 'Federal Reserve RSS',
    idioma: 'en',
  },
  // USD/CLP — noticias locales en español (Google, sin alternativa gratis equivalente)
  {
    nombre: 'Google News - Dólar Peso Chileno',
    url: 'https://news.google.com/rss/search?q=dolar+peso+chileno+USD+CLP+when:7d&hl=es-419&gl=CL&ceid=CL:es-419',
    fuente_nombre: 'Investing.com USD/CLP',
    idioma: 'es',
  },
  // Cobre — noticias Chile + precio global (Google local)
  {
    nombre: 'Google News - Cobre Chile',
    url: 'https://news.google.com/rss/search?q=cobre+precio+Chile+copper+when:7d&hl=es-419&gl=CL&ceid=CL:es-419',
    fuente_nombre: 'Reuters RSS',
    idioma: 'es',
  },
]

export interface NoticiaRaw {
  titulo: string
  resumen: string | null
  url: string
  publicado_at: string | null
  fuente_nombre: string
  idioma: string
}

// Descarga un feed con fetch nativo (funciona en Cloudflare Workers) y lo parsea
// con parseString (XML puro JS). NO usar parser.parseURL: usa el cliente HTTP de
// Node, que NO funciona en Workers → era la causa de que las noticias no llegaran.
async function descargarFeed(feed: typeof FEEDS[number]): Promise<NoticiaRaw[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (EZ-Trader/1.0)' },
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const xml = await res.text()
    const resultado = await parser.parseString(xml)

    return resultado.items.slice(0, 20).flatMap((item) => {
      if (!item.link) return []
      return [{
        titulo: item.title ?? 'Sin título',
        resumen: item.contentSnippet ?? item.summary ?? null,
        url: item.link,
        publicado_at: item.pubDate ?? item.isoDate ?? null,
        fuente_nombre: feed.fuente_nombre,
        idioma: feed.idioma,
      }]
    })
  } catch (err) {
    console.error(`Error obteniendo feed ${feed.nombre}:`, err)
    return []
  } finally {
    clearTimeout(timeout)
  }
}

export async function obtenerNoticias(): Promise<NoticiaRaw[]> {
  // Descarga todos los feeds en paralelo (más rápido que secuencial).
  const resultados = await Promise.all(FEEDS.map(descargarFeed))
  return resultados.flat()
}

export async function guardarNoticias(noticias: NoticiaRaw[]): Promise<number> {
  if (noticias.length === 0) return 0

  const { data: fuentes } = await supabaseAdmin
    .from('fuentes')
    .select('id, nombre')

  const { data: instrumento } = await supabaseAdmin
    .from('instrumentos')
    .select('id')
    .eq('simbolo', 'USD/CLP')
    .single()

  const fuenteMap = new Map(fuentes?.map(f => [f.nombre, f.id]) ?? [])

  const rows = noticias.map(n => ({
    titulo: n.titulo,
    resumen: n.resumen,
    url: n.url,
    publicado_at: n.publicado_at,
    fuente_id: fuenteMap.get(n.fuente_nombre) ?? null,
    instrumento_id: instrumento?.id ?? null,
    idioma: n.idioma,
    capturado_at: new Date().toISOString()
  }))

  const { data, error } = await supabaseAdmin
    .from('noticias')
    .upsert(rows, { onConflict: 'url', ignoreDuplicates: true })
    .select('id')

  if (error) {
    console.error('Error guardando noticias:', error.message)
    return 0
  }

  return data?.length ?? 0
}
