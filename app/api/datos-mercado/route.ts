import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'

// Devuelve el último valor de cada serie activa MVP (USDCLP, COBRE, DXY)
export async function GET() {
  const { data: series, error: seriesError } = await supabaseAdmin
    .from('series')
    .select('id, codigo, nombre, unidad')
    .eq('activo', true)
    .in('codigo', ['USDCLP', 'COBRE', 'DXY', 'TPM', 'FED'])

  if (seriesError) {
    return NextResponse.json({ error: seriesError.message }, { status: 500 })
  }

  const resultados = await Promise.all(
    (series ?? []).map(async (serie) => {
      const { data } = await supabaseAdmin
        .from('datos_mercado')
        .select('valor, fecha_dato')
        .eq('serie_id', serie.id)
        .order('fecha_dato', { ascending: false })
        .limit(1)
        .single()

      return {
        codigo: serie.codigo,
        nombre: serie.nombre,
        unidad: serie.unidad,
        valor: data?.valor ?? null,
        fecha_dato: data?.fecha_dato ?? null
      }
    })
  )

  return NextResponse.json({ factores: resultados })
}
