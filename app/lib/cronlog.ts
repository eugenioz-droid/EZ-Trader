import { supabaseAdmin } from './supabase'

// Umbral de latencia: si el cron tarda más, lo marcamos como lento (señal de fuente colgada).
export const CRON_LENTO_MS = 20_000

// Registra el resultado de una corrida de cron/refresh en cron_runs (observabilidad).
// No lanza: si el registro falla, lo logea pero no rompe la corrida.
export async function registrarCorrida(
  origen: 'cron' | 'refresh',
  resultados: Record<string, unknown>,
): Promise<void> {
  try {
    // ok = ningún paso reportó un campo 'error'
    const ok = !Object.values(resultados).some(
      (v) => v !== null && typeof v === 'object' && 'error' in (v as object),
    )
    const duracion = typeof resultados.duracion_ms === 'number' ? resultados.duracion_ms : null
    await supabaseAdmin.from('cron_runs').insert({
      origen,
      duracion_ms: duracion,
      ok,
      detalle: resultados,
    })
  } catch (err) {
    console.error('Error registrando corrida de cron:', err)
  }
}
