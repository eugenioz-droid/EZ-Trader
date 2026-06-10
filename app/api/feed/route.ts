import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'

// Feed público del hub. Sirve noticias con su clasificación, filtrable por:
//   ?seccion=dolar|cobre|bitcoin|sp500|ipsa|oro|uf-inflacion
//   ?geografia=nacional|internacional|ambas
//   ?destacadas=true   (solo relevancia alta — para la portada)
//   ?limit=N           (máx 50)
// Sin filtros → las más recientes (portada general). Lectura pública: no requiere
// login. El backend usa service_role; el contenido es de lectura, no expone nada
// sensible (solo titulares, resúmenes y etiquetas ya públicas).
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const seccion = sp.get('seccion')
  const geografia = sp.get('geografia')
  const destacadas = sp.get('destacadas') === 'true'
  const limit = Math.min(parseInt(sp.get('limit') ?? '30', 10) || 30, 50)

  // Join con analisis_ia para traer la clasificación junto a cada noticia.
  // !inner cuando filtramos por un campo de analisis_ia (sección/geografía/relevancia);
  // si no, left join para incluir también noticias aún sin clasificar.
  const necesitaInner = !!seccion || !!geografia || destacadas
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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Aplana: una clasificación por noticia (la más relevante si hubiera varias).
  const noticias = (data ?? []).map((n) => {
    const ana = Array.isArray(n.analisis_ia) ? n.analisis_ia[0] : n.analisis_ia
    return {
      id: n.id,
      titulo: n.titulo,
      resumen: n.resumen,
      slug: n.slug,
      url: n.url,
      publicado_at: n.publicado_at,
      fuente: (n.fuentes as { nombre?: string } | null)?.nombre ?? null,
      relevancia: ana?.relevancia ?? null,
      geografia: ana?.geografia ?? null,
      secciones: ana?.secciones_lista ?? [],
      secciones_impacto: ana?.secciones_impacto ?? [],
    }
  })

  return NextResponse.json({ noticias })
}
