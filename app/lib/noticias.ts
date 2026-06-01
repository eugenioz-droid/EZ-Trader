import Parser from 'rss-parser'
import { supabaseAdmin } from './supabase'

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'Mozilla/5.0 (EZ-Trader/1.0)' }
})

// Feeds RSS configurados (se mueven a tabla fuentes más adelante)
const FEEDS = [
  // Feeds rápidos intradía (inglés, financiero)
  {
    nombre: 'FXStreet',
    url: 'https://www.fxstreet.com/rss/news',
    fuente_nombre: 'FXStreet',
    idioma: 'en'
  },
  {
    nombre: 'investingLive',
    url: 'https://investinglive.com/feed/news',
    fuente_nombre: 'investingLive (ForexLive)',
    idioma: 'en'
  },
  // BREAKING: temas que mueven el mercado, últimas horas, inglés (indexa en minutos)
  {
    nombre: 'Google News - Breaking mercados',
    url: 'https://news.google.com/rss/search?q=(Fed+OR+Trump+OR+Iran+OR+tariffs+OR+oil+OR+China)+markets+when:3h&hl=en-US&gl=US&ceid=US:en',
    fuente_nombre: 'Mercados Breaking (Google)',
    idioma: 'en'
  },
  // Google News (español, limitado a 7 días para frescura)
  {
    nombre: 'Google News - Dólar Peso Chileno',
    url: 'https://news.google.com/rss/search?q=dolar+peso+chileno+USD+CLP+when:7d&hl=es-419&gl=CL&ceid=CL:es-419',
    fuente_nombre: 'Investing.com USD/CLP',
    idioma: 'es'
  },
  {
    nombre: 'Google News - Cobre Chile',
    url: 'https://news.google.com/rss/search?q=cobre+precio+Chile+copper+when:7d&hl=es-419&gl=CL&ceid=CL:es-419',
    fuente_nombre: 'Reuters RSS',
    idioma: 'es'
  },
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
