import { supabaseAdmin } from './supabase'

// Lógica compartida del feed público del hub. La usan el endpoint /api/feed y
// las páginas server-side (portada, secciones) — sin fetch HTTP interno (frágil
// en Workers): se llama directo a esta función.

export interface NoticiaFeed {
  id: number
  titulo: string
  resumen: string | null
  slug: string | null
  url: string
  publicado_at: string | null
  fuente: string | null
  relevancia: number | null
  geografia: string | null
  secciones: string[]
  secciones_impacto: Array<{ seccion: string; impacto: string; direccion: string }>
}

export interface FeedParams {
  seccion?: string | null
  geografia?: string | null
  destacadas?: boolean
  limit?: number
}

export async function obtenerFeed(params: FeedParams = {}): Promise<NoticiaFeed[]> {
  const { seccion, geografia, destacadas } = params
  const limit = Math.min(params.limit ?? 30, 50)

  const necesitaInner = !!seccion || !!geografia || !!destacadas
  const rel = necesitaInner ? 'analisis_ia!inner' : 'analisis_ia'

  let q = supabaseAdmin
    .from('noticias')
    .select(
      `id, titulo, resumen, slug, url, publicado_at, fuentes ( nombre ),
       ${rel} ( impacto, relevancia, geografia, secciones_lista, secciones_impacto, resumen_ia )`,
    )
    .order('publicado_at', { ascending: false })
    .limit(limit)

  if (seccion) q = q.contains('analisis_ia.secciones_lista', [seccion])
  if (geografia) q = q.eq('analisis_ia.geografia', geografia)
  if (destacadas) q = q.gte('analisis_ia.relevancia', 0.6)

  const { data, error } = await q
  if (error) {
    console.error('obtenerFeed:', error.message)
    return []
  }

  return (data ?? []).map((n) => {
    const ana = Array.isArray(n.analisis_ia) ? n.analisis_ia[0] : n.analisis_ia
    return {
      id: n.id,
      titulo: n.titulo,
      resumen: (ana?.resumen_ia as string | undefined) ?? n.resumen,
      slug: n.slug,
      url: n.url,
      publicado_at: n.publicado_at,
      fuente: (n.fuentes as { nombre?: string } | null)?.nombre ?? null,
      relevancia: ana?.relevancia ?? null,
      geografia: ana?.geografia ?? null,
      secciones: ana?.secciones_lista ?? [],
      secciones_impacto: (ana?.secciones_impacto as NoticiaFeed['secciones_impacto']) ?? [],
    }
  })
}

// Una sola noticia por slug (para /hub/noticia/[slug]).
export async function obtenerNoticiaPorSlug(slug: string): Promise<NoticiaFeed | null> {
  const { data, error } = await supabaseAdmin
    .from('noticias')
    .select(
      `id, titulo, resumen, slug, url, publicado_at, fuentes ( nombre ),
       analisis_ia ( impacto, relevancia, geografia, secciones_lista, secciones_impacto, resumen_ia )`,
    )
    .eq('slug', slug)
    .maybeSingle()

  if (error || !data) return null
  const ana = Array.isArray(data.analisis_ia) ? data.analisis_ia[0] : data.analisis_ia
  return {
    id: data.id,
    titulo: data.titulo,
    resumen: (ana?.resumen_ia as string | undefined) ?? data.resumen,
    slug: data.slug,
    url: data.url,
    publicado_at: data.publicado_at,
    fuente: (data.fuentes as { nombre?: string } | null)?.nombre ?? null,
    relevancia: ana?.relevancia ?? null,
    geografia: ana?.geografia ?? null,
    secciones: ana?.secciones_lista ?? [],
    secciones_impacto: (ana?.secciones_impacto as NoticiaFeed['secciones_impacto']) ?? [],
  }
}

// Catálogo de secciones activas (para la navegación del hub).
export interface SeccionHub {
  codigo: string
  nombre: string
  tipo: string
  descripcion: string | null
}

export async function obtenerSecciones(): Promise<SeccionHub[]> {
  const { data, error } = await supabaseAdmin
    .from('secciones')
    .select('codigo, nombre, tipo, descripcion')
    .eq('activo', true)
    .order('orden', { ascending: true })
  if (error) {
    console.error('obtenerSecciones:', error.message)
    return []
  }
  return data ?? []
}
