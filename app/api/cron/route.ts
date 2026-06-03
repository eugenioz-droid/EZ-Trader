import { NextRequest, NextResponse } from 'next/server'
import { obtenerNoticias, guardarNoticias } from '@/app/lib/noticias'
import { obtenerPrecios, guardarPrecios } from '@/app/lib/mercado'
import { evaluarAlertas } from '@/app/lib/alertas'
import { clasificarNoticiasNuevas } from '@/app/lib/clasificador'
import { registrarCorrida } from '@/app/lib/cronlog'

// Clave secreta para que solo Supabase pueda llamar este endpoint
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(req: NextRequest) {
  // Verificar autorización
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const inicio = Date.now()
  const resultados: Record<string, unknown> = {}

  // 1. Obtener y guardar noticias
  try {
    const noticias = await obtenerNoticias()
    const guardadas = await guardarNoticias(noticias)
    resultados.noticias = { obtenidas: noticias.length, guardadas }
  } catch (err) {
    resultados.noticias = { error: String(err) }
  }

  // 2. Clasificar noticias nuevas con Haiku — ANTES que los precios lentos.
  // Solo depende de las noticias (paso 1), no de los precios. Si lo dejábamos al final,
  // una fuente de precios lenta (Stooq) podía cortar el cron antes de clasificar.
  try {
    const clasificadas = await clasificarNoticiasNuevas()
    resultados.clasificacion = { clasificadas }
  } catch (err) {
    resultados.clasificacion = { error: String(err) }
  }

  // 3. Obtener y guardar precios de mercado (cada fetch con timeout)
  try {
    const precios = await obtenerPrecios()
    const { guardados, rechazados } = await guardarPrecios(precios)
    resultados.precios = {
      obtenidos: precios.length,
      guardados,
      valores: precios.map(p => ({ serie: p.codigo_serie, valor: p.valor })),
      ...(rechazados.length > 0 ? { rechazados } : {}),
    }
  } catch (err) {
    resultados.precios = { error: String(err) }
  }

  // 4. Evaluar reglas de alerta (después de tener los precios frescos)
  try {
    const alertasNuevas = await evaluarAlertas()
    resultados.alertas = { nuevas: alertasNuevas }
  } catch (err) {
    resultados.alertas = { error: String(err) }
  }

  resultados.duracion_ms = Date.now() - inicio

  await registrarCorrida('cron', resultados)

  console.log('Cron ejecutado:', JSON.stringify(resultados))
  return NextResponse.json({ ok: true, ...resultados })
}
