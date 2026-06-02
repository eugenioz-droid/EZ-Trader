import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from './supabase'

// Cliente Claude. Lee ANTHROPIC_API_KEY de process.env (canónico en Cloudflare Workers
// gracias a la flag nodejs_compat_populate_process_env).
const client = new Anthropic()

// ── Modelos por rol (configurables por variable de entorno) ──────────────
// Defaults aquí por si la var no está seteada. Permite cambiar de modelo sin
// tocar código y, a futuro (SaaS), elegir modelo por usuario.
export const MODELOS = {
  // Chat del día a día — "power" para macro, buen costo.
  agente: process.env.AGENTE_MODEL || 'claude-sonnet-4-6',
  // Botón "Análisis profundo" — el usuario decide cuándo gastar más.
  profundo: process.env.AGENTE_MODEL_PROFUNDO || 'claude-opus-4-8',
  // Clasificación de noticias en el cron (Fase 8) — ultra barato.
  clasificacion: process.env.CLASIFICACION_MODEL || 'claude-haiku-4-5-20251001',
} as const

// ── Precios por millón de tokens (USD). Fuente: platform.claude.com ──────
// input/output normales; cache_write = 1.25x input; cache_read = 0.1x input.
const PRECIOS: Record<string, { input: number; output: number }> = {
  'claude-opus-4-8': { input: 5, output: 25 },
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 1, output: 5 },
  'claude-haiku-4-5-20251001': { input: 1, output: 5 },
}

interface UsoTokens {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number | null
  cache_read_input_tokens?: number | null
}

// Calcula el costo estimado en USD a partir del usage de la respuesta.
export function calcularCosto(modelo: string, uso: UsoTokens): number {
  const precio = PRECIOS[modelo]
  if (!precio) return 0
  const input = uso.input_tokens ?? 0
  const output = uso.output_tokens ?? 0
  const cacheWrite = uso.cache_creation_input_tokens ?? 0
  const cacheRead = uso.cache_read_input_tokens ?? 0
  const costo =
    (input * precio.input +
      output * precio.output +
      cacheWrite * precio.input * 1.25 +
      cacheRead * precio.input * 0.1) /
    1_000_000
  return costo
}

type Proposito = 'agente' | 'agente_profundo' | 'clasificacion'

// Registra cada llamada a Claude en el ledger uso_ia. No lanza: si el registro
// falla, lo logea pero no rompe la respuesta al usuario.
export async function registrarUso(params: {
  proposito: Proposito
  modelo: string
  uso: UsoTokens
  exito?: boolean
  conversacion_id?: number | null
  noticia_id?: number | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    const costo = calcularCosto(params.modelo, params.uso)
    await supabaseAdmin.from('uso_ia').insert({
      proposito: params.proposito,
      modelo: params.modelo,
      tokens_in: params.uso.input_tokens ?? 0,
      tokens_out: params.uso.output_tokens ?? 0,
      tokens_cache_write: params.uso.cache_creation_input_tokens ?? 0,
      tokens_cache_read: params.uso.cache_read_input_tokens ?? 0,
      costo_usd: costo,
      exito: params.exito ?? true,
      conversacion_id: params.conversacion_id ?? null,
      noticia_id: params.noticia_id ?? null,
      metadata: params.metadata ?? {},
    })
  } catch (err) {
    console.error('Error registrando uso_ia:', err)
  }
}

export { client as anthropic }
