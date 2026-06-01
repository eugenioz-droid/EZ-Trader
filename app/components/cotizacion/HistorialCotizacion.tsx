import { supabaseAdmin } from '@/app/lib/supabase'

async function getHistorial() {
  const { data: serie } = await supabaseAdmin
    .from('series').select('id').eq('codigo', 'USDCLP').single()
  if (!serie) return []

  const desde = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
  const { data } = await supabaseAdmin
    .from('datos_mercado')
    .select('valor, fecha_dato')
    .eq('serie_id', serie.id)
    .gte('fecha_dato', desde)
    .order('fecha_dato', { ascending: true })

  return data ?? []
}

export default async function HistorialCotizacion() {
  const puntos = await getHistorial()

  if (puntos.length < 2) {
    return (
      <div className="px-4 py-4 border-b border-gray-800">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Historial USD/CLP
        </h3>
        <p className="text-xs text-gray-600">Acumulando datos... (se llena con el tiempo)</p>
      </div>
    )
  }

  const valores = puntos.map(p => p.valor)
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  const rango = max - min || 1

  const W = 300, H = 80, pad = 4
  const coords = puntos.map((p, i) => {
    const x = pad + (i / (puntos.length - 1)) * (W - 2 * pad)
    const y = pad + (1 - (p.valor - min) / rango) * (H - 2 * pad)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const primero = valores[0]
  const ultimo = valores[valores.length - 1]
  const subiendo = ultimo >= primero
  const color = subiendo ? '#f87171' : '#4ade80' // sube USD/CLP = rojo (peso débil)

  const fmtFecha = (f: string) => new Date(f).toLocaleString('es-CL', {
    timeZone: 'America/Santiago', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  })

  return (
    <div className="px-4 py-4 border-b border-gray-800">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Historial USD/CLP · 3 días
        </h3>
        <span className="text-xs text-gray-600">{puntos.length} puntos</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" preserveAspectRatio="none">
        <polyline
          points={coords}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="flex justify-between text-xs text-gray-600 mt-1">
        <span>{fmtFecha(puntos[0].fecha_dato)}</span>
        <span className="text-gray-500">máx {max.toFixed(1)} · mín {min.toFixed(1)}</span>
        <span>{fmtFecha(puntos[puntos.length - 1].fecha_dato)}</span>
      </div>
    </div>
  )
}
