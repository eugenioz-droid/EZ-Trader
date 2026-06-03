import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'

// Última corrida del cron/refresh (para el indicador de salud en el header).
export async function GET() {
  const { data } = await supabaseAdmin
    .from('cron_runs')
    .select('origen, ejecutado_at, duracion_ms, ok, detalle')
    .order('ejecutado_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ ultima: data ?? null })
}
