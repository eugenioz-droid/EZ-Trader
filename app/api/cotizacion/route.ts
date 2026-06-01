import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('datos_mercado')
    .select('valor, fecha_dato, capturado_at, series!inner(codigo, nombre, unidad)')
    .eq('series.codigo', 'USDCLP')
    .order('fecha_dato', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ cotizacion: data })
}
