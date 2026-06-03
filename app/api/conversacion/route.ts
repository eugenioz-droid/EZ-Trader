import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'

const MAX_MENSAJES = 30

export async function GET() {
  // Obtiene la conversación más reciente o crea una nueva
  const { data: conv } = await supabaseAdmin
    .from('conversaciones')
    .select('id')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let conversacion_id: number

  if (conv) {
    conversacion_id = conv.id
  } else {
    const { data: nueva, error } = await supabaseAdmin
      .from('conversaciones')
      .insert({ titulo: 'Chat USD/CLP' })
      .select('id')
      .single()
    if (error || !nueva) {
      return NextResponse.json({ error: 'No se pudo crear la conversación' }, { status: 500 })
    }
    conversacion_id = nueva.id
  }

  const { data: mensajes } = await supabaseAdmin
    .from('mensajes')
    .select('id, rol, contenido, modelo_usado, created_at')
    .eq('conversacion_id', conversacion_id)
    .order('created_at', { ascending: true })
    .limit(MAX_MENSAJES)

  return NextResponse.json({ conversacion_id, mensajes: mensajes ?? [] })
}
