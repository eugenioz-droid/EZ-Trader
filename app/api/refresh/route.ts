import { NextResponse } from 'next/server'
import { obtenerNoticias, guardarNoticias } from '@/app/lib/noticias'
import { obtenerPrecios, guardarPrecios } from '@/app/lib/mercado'
import { evaluarAlertas } from '@/app/lib/alertas'
import { clasificarNoticiasNuevas } from '@/app/lib/clasificador'
import { registrarCorrida } from '@/app/lib/cronlog'

// En Cloudflare Workers el self-fetch falla, así que llamamos las funciones directamente.
// Mismo flujo que el cron pero disparado a mano por el usuario ("Actualizar ahora").
export async function POST() {
  const inicio = Date.now()
  const resultados: Record<string, unknown> = {}

  try {
    const noticias = await obtenerNoticias()
    const guardadas = await guardarNoticias(noticias)
    resultados.noticias = { obtenidas: noticias.length, guardadas }
  } catch (err) {
    resultados.noticias = { error: String(err) }
  }

  try {
    const precios = await obtenerPrecios()
    const guardados = await guardarPrecios(precios)
    resultados.precios = { obtenidos: precios.length, guardados }
  } catch (err) {
    resultados.precios = { error: String(err) }
  }

  try {
    const alertasNuevas = await evaluarAlertas()
    resultados.alertas = { nuevas: alertasNuevas }
  } catch (err) {
    resultados.alertas = { error: String(err) }
  }

  // Clasifica con Haiku las noticias nuevas → badges de impacto inmediatos sin esperar al cron.
  try {
    const clasificadas = await clasificarNoticiasNuevas()
    resultados.clasificacion = { clasificadas }
  } catch (err) {
    resultados.clasificacion = { error: String(err) }
  }

  resultados.duracion_ms = Date.now() - inicio
  await registrarCorrida('refresh', resultados)
  return NextResponse.json({ ok: true, ...resultados })
}
