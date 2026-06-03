import Parser from 'rss-parser'
import { supabaseAdmin } from './supabase'

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'Mozilla/5.0 (EZ-Trader/1.0)' }
})

// Feeds RSS configurados (se mueven a tabla fuentes más adelante)
const FEEDS = [
  // Feed rápido intradía — mercados forex (inglés)
  {
    nombre: 'investingLive',
    url: 'https://investinglive.com/feed/news',
    fuente_nombre: 'investingLive (ForexLive)',
    idioma: 'en'
  },
  // BREAKING: macro/mercados últimas 3h — Fed, China, aranceles, petróleo
  {
    nombre: 'Google News - Breaking mercados',
    url: 'https://news.google.com/rss/search?q=(Fed+OR+Trump+OR+tariffs+OR+oil+OR+China+OR+OPEC+OR+copper)+(markets+OR+economy+OR+dollar)+when:3h&hl=en-US&gl=US&ceid=US:en',
    fuente_nombre: 'Mercados Breaking (Google)',
    idioma: 'en'
  },
  // GEOPOLÍTICA / ENERGÍA: Medio Oriente, conflictos, petróleo — últimas 12h
  // Capta ataques en Golfo, tensiones Israel/Irán, sanciones, OPEC+
  {
    nombre: 'Google News - Geopolítica energía',
    url: 'https://news.google.com/rss/search?q=(Iran+OR+Israel+OR+Gaza+OR+Saudi+OR+UAE+OR+Gulf+OR+Bahrain+OR+Kuwait+OR+OPEC+OR+"Middle+East")+(oil+OR+attack+OR+war+OR+sanction+OR+tension+OR+missile)+when:12h&hl=en-US&gl=US&ceid=US:en',
    fuente_nombre: 'Geopolítica Energía (Google)',
    idioma: 'en'
  },
  // USD/CLP — noticias locales en español
  {
    nombre: 'Google News - Dólar Peso Chileno',
    url: 'https://news.google.com/rss/search?q=dolar+peso+chileno+USD+CLP+when:7d&hl=es-419&gl=CL&ceid=CL:es-419',
    fuente_nombre: 'Investing.com USD/CLP',
    idioma: 'es'
  },
  // Cobre — noticias Chile + precio global
  {
    nombre: 'Google News - Cobre Chile',
    url: 'https://news.google.com/rss/search?q=cobre+precio+Chile+copper+when:7d&hl=es-419&gl=CL&ceid=CL:es-419',
    fuente_nombre: 'Reuters RSS',
    idioma: 'es'
  },
  // China — demanda cobre, estímulo, economía
  {
    nombre: 'Google News - China economia',
    url: 'https://news.google.com/rss/search?q=China+economia+cobre+estimulo+when:7d&hl=es-419&gl=CL&ceid=CL:es-419',
    fuente_nombre: 'Reuters RSS',
    idioma: 'es'
  }
]

export interface NoticiaRaw {
  titulo: string
  resumen: string | null
  url: string
  publicado_at: string | null
  fuente_nombre: string
  idioma: string
}

export async function obtenerNoticias(): Promise<NoticiaRaw[]> {
  const noticias: NoticiaRaw[] = []

  for (const feed of FEEDS) {
    try {
      const resultado = await parser.parseURL(feed.url)
      for (const item of resultado.items.slice(0, 20)) {
        if (!item.link) continue
        noticias.push({
          titulo: item.title ?? 'Sin título',
          resumen: item.contentSnippet ?? item.summary ?? null,
          url: item.link,
          publicado_at: item.pubDate ?? item.isoDate ?? null,
          fuente_nombre: feed.fuente_nombre,
          idioma: feed.idioma
        })
      }
    } catch (err) {
      console.error(`Error obteniendo feed ${feed.nombre}:`, err)
    }
  }

  return noticias
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
