import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limite = parseInt(searchParams.get('limite') ?? '30')
  const factor = searchParams.get('factor')

  let query = supabaseAdmin
    .from('noticias')
    .select(`
      id, titulo, resumen, url, publicado_at, capturado_at,
      fuentes ( nombre )
    `)
    .order('publicado_at', { ascending: false })
    .limit(limite)

  // Filtro por factor: se aplica via analisis_ia (no existe factor_codigo en noticias directamente)
  // Por ahora se ignora el parámetro para no romper la query; filtrado client-side en PanelNoticias.
  void factor

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ noticias: data })
}
