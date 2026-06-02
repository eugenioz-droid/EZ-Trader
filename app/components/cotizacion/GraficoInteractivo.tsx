'use client'

import { useState, useRef } from 'react'

interface Punto { t: number; v: number }
interface Pin { t: number; titulo: string }

export default function GraficoInteractivo({ puntos, pines }: { puntos: Punto[]; pines: Pin[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const vs = puntos.map(p => p.v)
  const min = Math.min(...vs)
  const max = Math.max(...vs)
  const mid = (min + max) / 2
  const rango = max - min || 1
  const t0 = puntos[0].t
  const t1 = puntos[puntos.length - 1].t
  const span = t1 - t0 || 1

  const W = 300, H = 100
  const xOf = (t: number) => ((t - t0) / span) * W
  const yOf = (v: number) => (1 - (v - min) / rango) * H
  const coords = puntos.map(p => `${xOf(p.t).toFixed(1)},${yOf(p.v).toFixed(1)}`).join(' ')

  const ultimo = vs[vs.length - 1]
  const primero = vs[0]
  const color = ultimo >= primero ? '#f87171' : '#4ade80'

  const fmt = (t: number) => new Date(t).toLocaleString('es-CL', {
    timeZone: 'America/Santiago', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  })

  function onMove(e: React.MouseEvent) {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const tt = t0 + x * span
    let best = 0, bd = Infinity
    puntos.forEach((p, i) => { const d = Math.abs(p.t - tt); if (d < bd) { bd = d; best = i } })
    setHover(best)
  }

  const hp = hover !== null ? puntos[hover] : null
  const hxPct = hp ? (xOf(hp.t) / W) * 100 : 0
  const hyPct = hp ? (yOf(hp.v) / H) * 100 : 0

  const ticks = Array.from({ length: 4 }, (_, i) => t0 + (i / 3) * span)

  return (
    <div>
      <div className="flex h-28">
        {/* Eje Y */}
        <div className="w-12 flex flex-col justify-between items-end pr-1 text-[10px] text-gray-500 font-mono">
          <span>{max.toFixed(1)}</span>
          <span className="text-gray-600">{mid.toFixed(1)}</span>
          <span>{min.toFixed(1)}</span>
        </div>

        {/* Área de gráfico */}
        <div ref={ref} className="relative flex-1 cursor-crosshair" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
            <line x1="0" y1="0" x2={W} y2="0" stroke="#374151" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" opacity="0.4" />
            <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="#374151" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" opacity="0.4" />
            <line x1="0" y1={H} x2={W} y2={H} stroke="#374151" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" opacity="0.4" />
            <polyline points={coords} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>

          {/* Pines de noticias */}
          {pines.map((p, i) => {
            const xp = ((p.t - t0) / span) * 100
            if (xp < 0 || xp > 100) return null
            return (
              <div key={i} className="absolute top-0 h-full" style={{ left: `${xp}%` }} title={p.titulo}>
                <div className="w-px h-full bg-amber-400/40" />
                <div className="absolute bottom-0 -translate-x-1/2 text-[10px] text-amber-400">▲</div>
              </div>
            )
          })}

          {/* Crosshair */}
          {hp && (
            <>
              <div className="absolute top-0 h-full w-px bg-gray-300/50 pointer-events-none" style={{ left: `${hxPct}%` }} />
              <div className="absolute w-2 h-2 rounded-full pointer-events-none ring-2 ring-gray-900" style={{ left: `${hxPct}%`, top: `${hyPct}%`, transform: 'translate(-50%,-50%)', backgroundColor: color }} />
              <div
                className="absolute bg-gray-800 border border-gray-600 rounded px-1.5 py-0.5 text-[10px] text-gray-100 pointer-events-none whitespace-nowrap z-10"
                style={{ left: `${hxPct}%`, top: 0, transform: hxPct > 55 ? 'translateX(-105%)' : 'translateX(5%)' }}
              >
                <span className="font-mono font-semibold" style={{ color }}>{hp.v.toFixed(1)}</span>
                <span className="text-gray-400"> · {fmt(hp.t)}</span>
              </div>
            </>
          )}

          {/* Valor actual (cuando no hay hover) */}
          {!hp && (
            <span
              className="absolute right-1 text-[11px] font-mono font-semibold px-1 rounded pointer-events-none"
              style={{ top: `${(yOf(ultimo) / H) * 100}%`, transform: 'translateY(-50%)', color, backgroundColor: 'rgba(0,0,0,0.6)' }}
            >
              {ultimo.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* Eje X con varias marcas */}
      <div className="flex justify-between text-[9px] text-gray-600 mt-1 pl-12">
        {ticks.map((t, i) => <span key={i}>{fmt(t)}</span>)}
      </div>
    </div>
  )
}
