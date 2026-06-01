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
  const mid = (min + max) / 2
  const rango = max - min || 1

  const W = 300, H = 100
  const coords = puntos.map((p, i) => {
    const x = (i / (puntos.length - 1)) * W
    const y = (1 - (p.valor - min) / rango) * H
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const primero = valores[0]
  const ultimo = valores[valores.length - 1]
  const subiendo = ultimo >= primero
  const color = subiendo ? '#f87171' : '#4ade80' // USD/CLP sube = rojo (peso débil)
  const lastYpct = (1 - (ultimo - min) / rango) * 100

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

      {/* Gráfico con referencias */}
      <div className="relative h-28 pl-10 pr-2">
        {/* Etiquetas eje Y */}
        <span className="absolute left-0 top-0 text-[10px] text-gray-500 font-mono">{max.toFixed(1)}</span>
        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[10px] text-gray-600 font-mono">{mid.toFixed(1)}</span>
        <span className="absolute left-0 bottom-0 text-[10px] text-gray-500 font-mono">{min.toFixed(1)}</span>

        {/* SVG con líneas de referencia + curva */}
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
          <line x1="0" y1="0" x2={W} y2="0" stroke="#374151" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" opacity="0.4" />
          <line x1="0" y1={H/2} x2={W} y2={H/2} stroke="#374151" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" opacity="0.4" />
          <line x1="0" y1={H} x2={W} y2={H} stroke="#374151" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" opacity="0.4" />
          <polyline points={coords} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>

        {/* Valor actual destacado */}
        <span
          className="absolute right-2 text-[11px] font-mono font-semibold px-1 rounded"
          style={{ top: `${lastYpct}%`, transform: 'translateY(-50%)', color, backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          {ultimo.toFixed(1)}
        </span>
      </div>

      {/* Eje X */}
      <div className="flex justify-between text-[10px] text-gray-600 mt-1 pl-10 pr-2">
        <span>{fmtFecha(puntos[0].fecha_dato)}</span>
        <span>{fmtFecha(puntos[puntos.length - 1].fecha_dato)}</span>
      </div>
    </div>
  )
}
