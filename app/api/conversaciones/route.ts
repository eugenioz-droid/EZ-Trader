import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'

// Lista las conversaciones (más recientes primero) para el selector de historial.
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('conversaciones')
    .select('id, titulo, updated_at')
    .order('updated_at', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ conversaciones: data ?? [] })
}
