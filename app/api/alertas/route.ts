import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('alertas')
    .select('id, titulo, mensaje, severidad, disparada_at, leida')
    .order('disparada_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ alertas: data })
}

// Marca todas las alertas como leídas
export async function POST() {
  const { error } = await supabaseAdmin
    .from('alertas')
    .update({ leida: true })
    .eq('leida', false)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
