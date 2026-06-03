import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'

const MAX_MENSAJES = 50

// Devuelve los mensajes de una conversación. Con ?id=X carga esa; sin id, la más
// reciente (o crea una si no hay ninguna).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const idParam = searchParams.get('id')

  let conversacion_id: number

  if (idParam) {
    conversacion_id = parseInt(idParam)
    if (!Number.isFinite(conversacion_id)) {
      return NextResponse.json({ error: 'id inválido' }, { status: 400 })
    }
  } else {
    const { data: conv } = await supabaseAdmin
      .from('conversaciones')
      .select('id')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (conv) {
      conversacion_id = conv.id
    } else {
      const { data: nueva, error } = await supabaseAdmin
        .from('conversaciones')
        .insert({ titulo: null })
        .select('id')
        .single()
      if (error || !nueva) {
        return NextResponse.json({ error: 'No se pudo crear la conversación' }, { status: 500 })
      }
      conversacion_id = nueva.id
    }
  }

  const { data: mensajes } = await supabaseAdmin
    .from('mensajes')
    .select('id, rol, contenido, modelo_usado, created_at')
    .eq('conversacion_id', conversacion_id)
    .order('created_at', { ascending: true })
    .limit(MAX_MENSAJES)

  return NextResponse.json({ conversacion_id, mensajes: mensajes ?? [] })
}

// Crea una conversación nueva y vacía. La devuelve para que el frontend cambie a ella.
export async function POST() {
  const { data: nueva, error } = await supabaseAdmin
    .from('conversaciones')
    .insert({ titulo: null })
    .select('id')
    .single()

  if (error || !nueva) {
    return NextResponse.json({ error: 'No se pudo crear la conversación' }, { status: 500 })
  }
  return NextResponse.json({ conversacion_id: nueva.id, mensajes: [] })
}
