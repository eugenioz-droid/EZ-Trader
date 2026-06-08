import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'

type CodigoSerie = 'USDCLP' | 'COBRE' | 'DXY' | 'PETROLEO' | 'VIX'

interface Punto {
  t: number
  v: number
}

const SERIES_ANALISIS: CodigoSerie[] = ['USDCLP', 'COBRE', 'DXY', 'PETROLEO', 'VIX']

const PERIODOS: Record<string, number> = {
  '1sem': 7,
  '2sem': 14,
  '1mes': 30,
  '3mes': 90,
}

function resumenSerie(puntos: Punto[]) {
  if (puntos.length === 0) {
    return {
      puntos: 0,
      actual: null,
      inicial: null,
      minimo: null,
      maximo: null,
      variacion_pct: null,
      volatilidad_pct: null,
    }
  }

  const valores = puntos.map((p) => p.v)
  const inicial = valores[0]
  const actual = valores[valores.length - 1]
  const minimo = Math.min(...valores)
  const maximo = Math.max(...valores)
  const variacionPct = inicial !== 0 ? ((actual - inicial) / inicial) * 100 : null

  const media = valores.reduce((acc, v) => acc + v, 0) / valores.length
  const varianza =
    valores.reduce((acc, v) => acc + Math.pow(v - media, 2), 0) /
    Math.max(1, valores.length - 1)
  const desvio = Math.sqrt(varianza)
  const volatilidadPct = media !== 0 ? (desvio / media) * 100 : null

  return {
    puntos: puntos.length,
    actual,
    inicial,
    minimo,
    maximo,
    variacion_pct: variacionPct,
    volatilidad_pct: volatilidadPct,
  }
}

function correlacionPearson(a: Punto[], b: Punto[]): number | null {
  const n = Math.min(a.length, b.length)
  if (n < 3) return null

  // Alineación liviana por orden temporal: usa el tramo final común.
  const av = a.slice(-n).map((p) => p.v)
  const bv = b.slice(-n).map((p) => p.v)

  const mediaA = av.reduce((acc, v) => acc + v, 0) / n
  const mediaB = bv.reduce((acc, v) => acc + v, 0) / n

  let num = 0
  let denA = 0
  let denB = 0

  for (let i = 0; i < n; i++) {
    const da = av[i] - mediaA
    const db = bv[i] - mediaB
    num += da * db
    denA += da * da
    denB += db * db
  }

  const den = Math.sqrt(denA * denB)
  if (den === 0) return null
  return num / den
}

async function obtenerSeries(codigos: CodigoSerie[], desdeIso: string) {
  const { data: series, error: seriesError } = await supabaseAdmin
    .from('series')
    .select('id, codigo')
    .in('codigo', codigos)

  if (seriesError) throw new Error(seriesError.message)

  const idPorCodigo = new Map((series ?? []).map((s) => [s.codigo as CodigoSerie, s.id]))

  const salida: Record<CodigoSerie, Punto[]> = {
    USDCLP: [],
    COBRE: [],
    DXY: [],
    PETROLEO: [],
    VIX: [],
  }

  await Promise.all(
    codigos.map(async (codigo) => {
      const serieId = idPorCodigo.get(codigo)
      if (!serieId) return

      const { data, error } = await supabaseAdmin
        .from('datos_mercado')
        .select('valor, fecha_dato')
        .eq('serie_id', serieId)
        .gte('fecha_dato', desdeIso)
        .order('fecha_dato', { ascending: true })

      if (error) throw new Error(error.message)

      salida[codigo] = (data ?? []).map((p) => ({
        t: new Date(p.fecha_dato).getTime(),
        v: p.valor,
      }))
    })
  )

  return salida
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const periodo = searchParams.get('periodo') ?? '2sem'
    const dias = PERIODOS[periodo] ?? 14

    const ahora = Date.now()
    const desdeIso = new Date(ahora - dias * 24 * 3600 * 1000).toISOString()

    const series = await obtenerSeries(SERIES_ANALISIS, desdeIso)

    const resumen = {
      USDCLP: resumenSerie(series.USDCLP),
      COBRE: resumenSerie(series.COBRE),
      DXY: resumenSerie(series.DXY),
      PETROLEO: resumenSerie(series.PETROLEO),
      VIX: resumenSerie(series.VIX),
    }

    const correlaciones = {
      COBRE: correlacionPearson(series.USDCLP, series.COBRE),
      DXY: correlacionPearson(series.USDCLP, series.DXY),
      PETROLEO: correlacionPearson(series.USDCLP, series.PETROLEO),
      VIX: correlacionPearson(series.USDCLP, series.VIX),
    }

    const { data: noticias, error: noticiasError } = await supabaseAdmin
      .from('noticias')
      .select('id, analisis_ia(impacto)')
      .gte('publicado_at', desdeIso)
      .limit(1000)

    if (noticiasError) throw new Error(noticiasError.message)

    let alto = 0
    let medio = 0
    let bajo = 0

    for (const n of noticias ?? []) {
      const raw = n.analisis_ia as unknown as { impacto?: string } | { impacto?: string }[] | null
      const impacto = (Array.isArray(raw) ? raw[0] : raw)?.impacto
      if (impacto === 'alto') alto++
      else if (impacto === 'medio') medio++
      else if (impacto === 'bajo') bajo++
    }

    return NextResponse.json({
      periodo,
      dias,
      desde: desdeIso,
      hasta: new Date(ahora).toISOString(),
      series,
      resumen,
      correlaciones,
      noticias: {
        total: (noticias ?? []).length,
        alto,
        medio,
        bajo,
      },
    })
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : 'Error inesperado en analisis histórico'
    return NextResponse.json({ error: mensaje }, { status: 500 })
  }
}
