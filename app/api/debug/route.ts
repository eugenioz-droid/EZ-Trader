import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ENDPOINT TEMPORAL DE DIAGNÓSTICO — BORRAR cuando se resuelva el tema de env vars.
// Solo reporta presencia (true/false), nunca el valor real de un secret.
export async function GET() {
  const keys = [
    'APP_PASSWORD', 'AUTH_SECRET', 'CRON_SECRET',
    'FRED_API_KEY', 'TWELVE_DATA_API_KEY',
    'SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  ]

  // Método 1: process.env
  const fromProcessEnv: Record<string, boolean> = {}
  for (const k of keys) fromProcessEnv[k] = !!process.env[k]

  // Método 2: getCloudflareContext (bindings de Cloudflare)
  let fromCfContext: Record<string, boolean> | string
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    const { env } = await getCloudflareContext({ async: true })
    const e = env as Record<string, unknown>
    const obj: Record<string, boolean> = {}
    for (const k of keys) obj[k] = !!e[k]
    fromCfContext = obj
  } catch (err) {
    fromCfContext = 'ERROR: ' + String(err)
  }

  return NextResponse.json({
    runtime: typeof navigator !== 'undefined' ? 'edge/workers' : 'node',
    fromProcessEnv,
    fromCfContext,
  })
}
