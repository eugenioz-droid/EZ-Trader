import { supabaseAdmin } from '@/app/lib/supabase'

// Palabras clave para marcar noticias relevantes en el gráfico (versión interina).
// Cuando llegue la IA (Fase 7), este criterio se reemplaza por impacto real.
const KEYWORDS = /\b(fed|fomc|iran|israel|trump|tariff|arancel|oil|petr[oó]leo|china|guerra|war|cobre|copper|inflation|inflaci[oó]n)\b/i

async function getDatos() {
  const { data: serie } = await supabaseAdmin
    .from('series').select('id').eq('codigo', 'USDCLP').single()
  if (!serie) return { puntos: [], noticias: [] }

  const desde = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()

  const [{ data: puntos }, { data: noticias }] = await Promise.all([
    supabaseAdmin
      .from('datos_mercado')
      .select('valor, fecha_dato')
      .eq('serie_id', serie.id)
      .gte('fecha_dato', desde)
      .order('fecha_dato', { ascending: true }),
    supabaseAdmin
      .from('noticias')
      .select('titulo, publicado_at')
      .gte('publicado_at', desde)
      .order('publicado_at', { ascending: true })
      .limit(300)
  ])

  return { puntos: puntos ?? [], noticias: noticias ?? [] }
}

export default async function HistorialCotizacion() {
  const { puntos, noticias } = await getDatos()

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

  const t0 = new Date(puntos[0].fecha_dato).getTime()
  const t1 = new Date(puntos[puntos.length - 1].fecha_dato).getTime()
  const span = t1 - t0 || 1

  const W = 300, H = 100
  const coords = puntos.map((p) => {
    const x = ((new Date(p.fecha_dato).getTime() - t0) / span) * W
    const y = (1 - (p.valor - min) / rango) * H
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const ultimo = valores[valores.length - 1]
  const primero = valores[0]
  const subiendo = ultimo >= primero
  const color = subiendo ? '#f87171' : '#4ade80'
  const lastYpct = (1 - (ultimo - min) / rango) * 100

  // Pines: noticias relevantes dentro del rango temporal del gráfico
  const pines = (noticias ?? [])
    .filter(n => n.publicado_at && KEYWORDS.test(n.titulo))
    .map(n => {
      const t = new Date(n.publicado_at!).getTime()
      return { titulo: n.titulo, xpct: ((t - t0) / span) * 100 }
    })
    .filter(p => p.xpct >= 0 && p.xpct <= 100)

  const fmtFecha = (f: string) => new Date(f).toLocaleString('es-CL', {
    timeZone: 'America/Santiago', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  })

  return (
    <div className="px-4 py-4 border-b border-gray-800">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Historial USD/CLP · 3 días
        </h3>
        <span className="text-xs text-gray-600">
          {puntos.length} pts · <span className="text-amber-400">▲</span> {pines.length} noticias
        </span>
      </div>

      <div className="flex h-28">
        {/* Eje Y */}
        <div className="w-10 flex flex-col justify-between items-end pr-1 text-[10px] text-gray-500 font-mono">
          <span>{max.toFixed(1)}</span>
          <span className="text-gray-600">{mid.toFixed(1)}</span>
          <span>{min.toFixed(1)}</span>
        </div>

        {/* Área de gráfico */}
        <div className="relative flex-1">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
            <line x1="0" y1="0" x2={W} y2="0" stroke="#374151" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" opacity="0.4" />
            <line x1="0" y1={H/2} x2={W} y2={H/2} stroke="#374151" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" opacity="0.4" />
            <line x1="0" y1={H} x2={W} y2={H} stroke="#374151" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" opacity="0.4" />
            <polyline points={coords} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>

          {/* Pines de noticias */}
          {pines.map((p, i) => (
            <div key={i} className="absolute top-0 h-full" style={{ left: `${p.xpct}%` }} title={p.titulo}>
              <div className="w-px h-full bg-amber-400/25" />
              <div className="absolute bottom-0 -translate-x-1/2 text-[8px] text-amber-400 cursor-default">▲</div>
            </div>
          ))}

          {/* Valor actual */}
          <span
            className="absolute right-1 text-[11px] font-mono font-semibold px-1 rounded"
            style={{ top: `${lastYpct}%`, transform: 'translateY(-50%)', color, backgroundColor: 'rgba(0,0,0,0.6)' }}
          >
            {ultimo.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Eje X */}
      <div className="flex justify-between text-[10px] text-gray-600 mt-1 pl-10">
        <span>{fmtFecha(puntos[0].fecha_dato)}</span>
        <span>{fmtFecha(puntos[puntos.length - 1].fecha_dato)}</span>
      </div>
    </div>
  )
}
