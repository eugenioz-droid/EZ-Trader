import { NextRequest, NextResponse } from 'next/server'
import { consultarAgente } from '@/app/lib/agente'
import { supabaseAdmin } from '@/app/lib/supabase'

const MAX_INPUT_CHARS = 4000
const RATE_LIMIT_VENTANA_MS = 60_000
const RATE_LIMIT_MAX = 10
const MAX_HISTORIAL_CLAUDE = 6   // últimos N mensajes que se pasan a Claude
const MAX_HISTORIAL_BD = 30      // últimos N mensajes que se cargan de BD

async function superaRateLimit(): Promise<boolean> {
  const desde = new Date(Date.now() - RATE_LIMIT_VENTANA_MS).toISOString()
  const { count } = await supabaseAdmin
    .from('uso_ia')
    .select('id', { count: 'exact', head: true })
    .in('proposito', ['agente', 'agente_profundo'])
    .gte('created_at', desde)
  return (count ?? 0) >= RATE_LIMIT_MAX
}

// Carga el historial de la conversación activa desde BD
async function cargarHistorial(conversacion_id: number) {
  const { data } = await supabaseAdmin
    .from('mensajes')
    .select('rol, contenido')
    .eq('conversacion_id', conversacion_id)
    .order('created_at', { ascending: true })
    .limit(MAX_HISTORIAL_BD)
  return (data ?? []).map((m) => ({ rol: m.rol, texto: m.contenido }))
}

// Obtiene o crea la conversación activa
async function obtenerConversacionId(id: number | null | undefined): Promise<number> {
  if (id) return id
  const { data: conv } = await supabaseAdmin
    .from('conversaciones')
    .select('id')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (conv) return conv.id
  const { data: nueva } = await supabaseAdmin
    .from('conversaciones')
    .insert({ titulo: 'Chat USD/CLP' })
    .select('id')
    .single()
  return nueva!.id
}

// Guarda el par usuario/asistente en BD
async function guardarMensajes(
  conversacion_id: number,
  pregunta: string,
  respuesta: string,
  modelo: string,
  tokens_out: number,
) {
  await supabaseAdmin.from('mensajes').insert([
    { conversacion_id, rol: 'user', contenido: pregunta },
    { conversacion_id, rol: 'assistant', contenido: respuesta, modelo_usado: modelo, tokens: tokens_out },
  ])
  // Actualiza updated_at de la conversación
  await supabaseAdmin
    .from('conversaciones')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversacion_id)
}

// 7.8 — Genera una alerta si la respuesta contiene una señal accionable
async function generarAlertaSiAplica(pregunta: string, respuesta: string) {
  const texto = respuesta.toLowerCase()
  const tieneSenal = ['señal', 'entrada', 'alineaci', 'conviene operar', 'short', 'long', 'sesgo'].some(
    (k) => texto.includes(k),
  )
  const tieneDireccion = ['peso fuerte', 'peso débil', 'peso debil', 'usd/clp sube', 'usd/clp baja'].some(
    (k) => texto.includes(k),
  )
  if (!tieneSenal || !tieneDireccion) return

  // Primera línea con contenido como título
  const primera = respuesta
    .split(/[\n.]/)
    .map((s) => s.trim())
    .find((s) => s.length > 30) ?? respuesta.substring(0, 120)

  const esAlta = ['fuerte', 'clara', 'convicción', 'todos los factores', 'alineación completa'].some((k) =>
    texto.includes(k),
  )

  await supabaseAdmin.from('alertas').insert({
    tipo: 'agente',
    severidad: esAlta ? 'alta' : 'media',
    titulo: primera.substring(0, 120),
    mensaje: `Pregunta: "${pregunta.substring(0, 100)}"`,
  })
}

export async function POST(req: NextRequest) {
  let body: { pregunta?: unknown; profundidad?: unknown; conversacion_id?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const pregunta = typeof body.pregunta === 'string' ? body.pregunta.trim() : ''
  if (!pregunta) return NextResponse.json({ error: 'Falta la pregunta' }, { status: 400 })
  if (pregunta.length > MAX_INPUT_CHARS) {
    return NextResponse.json(
      { error: `La pregunta supera el máximo de ${MAX_INPUT_CHARS} caracteres` },
      { status: 413 },
    )
  }

  const profundidad = body.profundidad === 'profunda' ? 'profunda' : 'normal'
  const conversacion_id_body = typeof body.conversacion_id === 'number' ? body.conversacion_id : null

  if (await superaRateLimit()) {
    return NextResponse.json(
      { error: 'Demasiadas consultas. Espera un momento e intenta de nuevo.' },
      { status: 429 },
    )
  }

  const conversacion_id = await obtenerConversacionId(conversacion_id_body)
  const historial = await cargarHistorial(conversacion_id)
  const historialClaude = historial.slice(-MAX_HISTORIAL_CLAUDE)

  try {
    const resultado = await consultarAgente({ pregunta, profundidad, conversacion_id, historial: historialClaude })

    // Guardar + alertas en paralelo (no bloqueante para la respuesta)
    await Promise.all([
      guardarMensajes(conversacion_id, pregunta, resultado.texto, resultado.modelo, resultado.uso.tokens_out),
      generarAlertaSiAplica(pregunta, resultado.texto),
    ])

    return NextResponse.json({
      respuesta: resultado.texto,
      modelo: resultado.modelo,
      conversacion_id,
      tokens: { in: resultado.uso.tokens_in, out: resultado.uso.tokens_out },
    })
  } catch (err) {
    console.error('Error en /api/consulta-agente:', err)
    return NextResponse.json(
      { error: 'No se pudo procesar la consulta. Revisa el saldo de la API o intenta más tarde.' },
      { status: 500 },
    )
  }
}
