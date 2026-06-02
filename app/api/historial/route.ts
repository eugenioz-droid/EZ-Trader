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

// Palabras clave para marcar noticias relevantes (interino, hasta Haiku/Fase 8).
const KEYWORDS = /\b(fed|fomc|iran|israel|trump|tariff|arancel|petr[oó]leo|guerra|war|cobre|copper|intervenci|sanction|sanci[oó]n)\b/i

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

  // Noticias relevantes en la ventana (keyword match)
  const { data: noticias } = await supabaseAdmin
    .from('noticias')
    .select('titulo, publicado_at')
    .gte('publicado_at', desde)
    .order('publicado_at', { ascending: true })
    .limit(500)

  const pines = (noticias ?? [])
    .filter((n) => n.publicado_at && KEYWORDS.test(n.titulo))
    .map((n) => ({ t: new Date(n.publicado_at!).getTime(), titulo: n.titulo }))

  return NextResponse.json({ periodo, series: resultado, pines })
}
