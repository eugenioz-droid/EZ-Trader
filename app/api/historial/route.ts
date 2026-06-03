import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'

// Series permitidas para superponer (las que ingerimos hoy).
const SERIES_VALIDAS = ['USDCLP', 'COBRE', 'DXY', 'PETROLEO']

const PERIODOS: Record<string, number> = {
  '1d': 1,
  '1sem': 7,
  '1mes': 30,
  '3mes': 90,
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const periodo = searchParams.get('periodo') ?? '1sem'
  const dias = PERIODOS[periodo] ?? 7
  const pedidas = (searchParams.get('series') ?? 'USDCLP')
    .split(',')
    .filter((c) => SERIES_VALIDAS.includes(c))
  if (!pedidas.includes('USDCLP')) pedidas.unshift('USDCLP')

  const desde = new Date(Date.now() - dias * 24 * 3600 * 1000).toISOString()

  // IDs de las series pedidas
  const { data: series } = await supabaseAdmin
    .from('series')
    .select('id, codigo')
    .in('codigo', pedidas)

  const idPorCodigo = new Map((series ?? []).map((s) => [s.codigo, s.id]))

  // Puntos de cada serie
  const resultado: Record<string, { t: number; v: number }[]> = {}
  await Promise.all(
    pedidas.map(async (codigo) => {
      const id = idPorCodigo.get(codigo)
      if (!id) {
        resultado[codigo] = []
        return
      }
      const { data } = await supabaseAdmin
        .from('datos_mercado')
        .select('valor, fecha_dato')
        .eq('serie_id', id)
        .gte('fecha_dato', desde)
        .order('fecha_dato', { ascending: true })
      resultado[codigo] = (data ?? []).map((p) => ({
        t: new Date(p.fecha_dato).getTime(),
        v: p.valor,
      }))
    })
  )

  // Pines = noticias clasificadas por Haiku con impacto alto/medio en la ventana.
  const { data: noticias } = await supabaseAdmin
    .from('noticias')
    .select('titulo, publicado_at, analisis_ia ( impacto )')
    .gte('publicado_at', desde)
    .order('publicado_at', { ascending: true })
    .limit(500)

  const pines = (noticias ?? [])
    .map((n) => {
      const impacto = (n.analisis_ia as unknown as { impacto: string }[] | null)?.[0]?.impacto
      return { titulo: n.titulo, publicado_at: n.publicado_at, impacto }
    })
    .filter((x) => x.publicado_at && (x.impacto === 'alto' || x.impacto === 'medio'))
    .map((x) => ({
      t: new Date(x.publicado_at!).getTime(),
      titulo: x.titulo,
      impacto: x.impacto as 'alto' | 'medio',
    }))

  return NextResponse.json({ periodo, series: resultado, pines })
}
