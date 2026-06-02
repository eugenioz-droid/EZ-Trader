import { NextRequest, NextResponse } from 'next/server'
import { consultarAgente } from '@/app/lib/agente'
import { supabaseAdmin } from '@/app/lib/supabase'

// Límites de seguridad (anti-abuso / tope de gasto)
const MAX_INPUT_CHARS = 4000 // largo máximo de la pregunta
const RATE_LIMIT_VENTANA_MS = 60_000 // 1 minuto
const RATE_LIMIT_MAX = 10 // máx. consultas por ventana

// Rate limit simple basado en el ledger uso_ia (cuenta llamadas recientes del agente).
async function superaRateLimit(): Promise<boolean> {
  const desde = new Date(Date.now() - RATE_LIMIT_VENTANA_MS).toISOString()
  const { count } = await supabaseAdmin
    .from('uso_ia')
    .select('id', { count: 'exact', head: true })
    .in('proposito', ['agente', 'agente_profundo'])
    .gte('created_at', desde)
  return (count ?? 0) >= RATE_LIMIT_MAX
}

export async function POST(req: NextRequest) {
  let body: { pregunta?: unknown; profundidad?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const pregunta = typeof body.pregunta === 'string' ? body.pregunta.trim() : ''
  if (!pregunta) {
    return NextResponse.json({ error: 'Falta la pregunta' }, { status: 400 })
  }
  if (pregunta.length > MAX_INPUT_CHARS) {
    return NextResponse.json(
      { error: `La pregunta supera el máximo de ${MAX_INPUT_CHARS} caracteres` },
      { status: 413 }
    )
  }

  const profundidad = body.profundidad === 'profunda' ? 'profunda' : 'normal'

  if (await superaRateLimit()) {
    return NextResponse.json(
      { error: 'Demasiadas consultas. Espera un momento e intenta de nuevo.' },
      { status: 429 }
    )
  }

  try {
    const resultado = await consultarAgente({ pregunta, profundidad })
    return NextResponse.json({
      respuesta: resultado.texto,
      modelo: resultado.modelo,
      tokens: { in: resultado.uso.tokens_in, out: resultado.uso.tokens_out },
    })
  } catch (err) {
    console.error('Error en /api/consulta-agente:', err)
    return NextResponse.json(
      { error: 'No se pudo procesar la consulta. Revisa el saldo de la API o intenta más tarde.' },
      { status: 500 }
    )
  }
}
