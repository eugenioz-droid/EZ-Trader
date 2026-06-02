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
  const color = ultimo >= primero ? '#F6465D' : '#16C784'

  // Cuadrícula horaria adaptativa (paso según el lapso)
  const spanH = span / 3600000
  const stepH = spanH <= 18 ? 1 : spanH <= 40 ? 2 : spanH <= 80 ? 4 : 12
  const ticks: number[] = []
  const primerHora = new Date(t0)
  primerHora.setMinutes(0, 0, 0)
  let h = primerHora.getTime()
  if (h < t0) h += 3600000
  // alinear al paso
  while (new Date(h).getHours() % stepH !== 0 && h <= t1) h += 3600000
  for (; h <= t1; h += stepH * 3600000) ticks.push(h)
  const labelEvery = Math.max(1, Math.ceil(ticks.length / 7))

  const fmtHora = (t: number) => {
    const d = new Date(t)
    const hh = d.toLocaleString('es-CL', { timeZone: 'America/Santiago', hour: '2-digit', hour12: false })
    return `${hh}h`
  }
  const fmtFull = (t: number) => new Date(t).toLocaleString('es-CL', {
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

  return (
    <div>
      <div className="flex h-28">
        {/* Eje Y */}
        <div className="w-12 flex flex-col justify-between items-end pr-1 text-[10px] text-muted font-mono">
          <span>{max.toFixed(1)}</span>
          <span className="text-muted/70">{mid.toFixed(1)}</span>
          <span>{min.toFixed(1)}</span>
        </div>

        {/* Área de gráfico */}
        <div ref={ref} className="relative flex-1 cursor-crosshair" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
            {/* grilla horizontal */}
            <line x1="0" y1="0" x2={W} y2="0" stroke="#1F2A3C" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" opacity="0.6" />
            <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="#1F2A3C" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" opacity="0.6" />
            <line x1="0" y1={H} x2={W} y2={H} stroke="#1F2A3C" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" opacity="0.6" />
            {/* grilla horaria vertical */}
            {ticks.map((t, i) => (
              <line key={i} x1={xOf(t)} y1="0" x2={xOf(t)} y2={H} stroke="#1F2A3C" strokeWidth="1" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" opacity="0.4" />
            ))}
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
              <div className="absolute top-0 h-full w-px bg-silver/40 pointer-events-none" style={{ left: `${hxPct}%` }} />
              <div className="absolute w-2 h-2 rounded-full pointer-events-none ring-2 ring-base" style={{ left: `${hxPct}%`, top: `${hyPct}%`, transform: 'translate(-50%,-50%)', backgroundColor: color }} />
              <div
                className="absolute bg-elevated border border-line rounded px-1.5 py-0.5 text-[10px] text-snow pointer-events-none whitespace-nowrap z-10"
                style={{ left: `${hxPct}%`, top: 0, transform: hxPct > 55 ? 'translateX(-105%)' : 'translateX(5%)' }}
              >
                <span className="font-mono font-semibold" style={{ color }}>{hp.v.toFixed(1)}</span>
                <span className="text-muted"> · {fmtFull(hp.t)}</span>
              </div>
            </>
          )}

          {/* Valor actual (sin hover) */}
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

      {/* Eje X: etiquetas por hora */}
      <div className="flex mt-1">
        <div className="w-12" />
        <div className="relative flex-1 h-3">
          {ticks.map((t, i) => (
            i % labelEvery === 0 && (
              <span
                key={i}
                className="absolute text-[9px] text-muted -translate-x-1/2 whitespace-nowrap"
                style={{ left: `${(xOf(t) / W) * 100}%` }}
              >
                {fmtHora(t)}
              </span>
            )
          ))}
        </div>
      </div>
    </div>
  )
}
