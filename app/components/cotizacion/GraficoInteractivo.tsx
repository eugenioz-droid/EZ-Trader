'use client'

import { useState, useRef } from 'react'

interface Punto { t: number; v: number }
interface Pin { t: number; titulo: string }
export interface SerieGrafico {
  codigo: string
  label: string
  color: string
  puntos: Punto[]
}

const W = 300, H = 100

// Punto más cercano (por tiempo) dentro de una serie.
function cercano(puntos: Punto[], t: number): Punto | null {
  if (puntos.length === 0) return null
  let best = puntos[0], bd = Infinity
  for (const p of puntos) {
    const d = Math.abs(p.t - t)
    if (d < bd) { bd = d; best = p }
  }
  return best
}

export default function GraficoInteractivo({
  series,
  pines,
}: {
  series: SerieGrafico[]
  pines: Pin[]
}) {
  const [hover, setHover] = useState<number | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const base = series[0]
  if (!base || base.puntos.length < 2) {
    return <div className="h-28 flex items-center justify-center text-xs text-muted">Sin datos suficientes</div>
  }

  // Rango temporal: unión de todas las series
  let t0 = Infinity, t1 = -Infinity
  for (const s of series) {
    for (const p of s.puntos) {
      if (p.t < t0) t0 = p.t
      if (p.t > t1) t1 = p.t
    }
  }
  const span = t1 - t0 || 1

  // Normalización por serie (cada una a su propio min/max → se ven divergencias de forma)
  const escala = new Map<string, { min: number; rango: number }>()
  for (const s of series) {
    const vs = s.puntos.map((p) => p.v)
    const min = Math.min(...vs)
    const max = Math.max(...vs)
    escala.set(s.codigo, { min, rango: max - min || 1 })
  }

  const xOf = (t: number) => ((t - t0) / span) * W
  const yOf = (v: number, codigo: string) => {
    const e = escala.get(codigo)!
    return (1 - (v - e.min) / e.rango) * H
  }

  const baseVs = base.puntos.map((p) => p.v)
  const baseUltimo = baseVs[baseVs.length - 1]

  // Ejes de tiempo adaptativos
  const spanD = span / 86400000
  const ticks: number[] = []
  // Fronteras calculadas con aritmética de epoch UTC (NO new Date().setHours, que
  // usa la zona horaria del runtime: server en UTC vs cliente en Santiago daban
  // ticks distintos → hydration mismatch React #418). Las etiquetas se muestran en
  // hora de Santiago vía toLocaleString (timeZone explícito = determinista).
  if (spanD <= 2) {
    // por horas
    const stepMs = (spanD <= 0.8 ? 1 : 2) * 3600000
    for (let h = Math.ceil(t0 / 3600000) * 3600000; h <= t1; h += stepMs) ticks.push(h)
  } else {
    // por días
    const stepD = spanD <= 10 ? 1 : spanD <= 35 ? 5 : 14
    const stepMs = stepD * 86400000
    for (let day = Math.ceil(t0 / 86400000) * 86400000; day <= t1; day += stepMs) ticks.push(day)
  }
  const labelEvery = Math.max(1, Math.ceil(ticks.length / 7))
  const fmtTick = (t: number) => {
    const d = new Date(t)
    if (spanD <= 2) {
      return `${d.toLocaleString('es-CL', { timeZone: 'America/Santiago', hour: '2-digit', hour12: false })}h`
    }
    return d.toLocaleDateString('es-CL', { timeZone: 'America/Santiago', day: '2-digit', month: '2-digit' })
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
    base.puntos.forEach((p, i) => { const d = Math.abs(p.t - tt); if (d < bd) { bd = d; best = i } })
    setHover(best)
  }

  const hp = hover !== null ? base.puntos[hover] : null
  const hxPct = hp ? (xOf(hp.t) / W) * 100 : 0
  const hyPct = hp ? (yOf(hp.v, base.codigo) / H) * 100 : 0

  return (
    <div>
      <div className="flex h-40">
        {/* Eje Y: valores de la serie base (USD/CLP) */}
        <div className="w-12 flex flex-col justify-between items-end pr-1 text-[10px] text-muted font-mono">
          <span>{(escala.get(base.codigo)!.min + escala.get(base.codigo)!.rango).toFixed(1)}</span>
          <span className="text-muted/70">{(escala.get(base.codigo)!.min + escala.get(base.codigo)!.rango / 2).toFixed(1)}</span>
          <span>{escala.get(base.codigo)!.min.toFixed(1)}</span>
        </div>

        {/* Área de gráfico */}
        <div ref={ref} className="relative flex-1 cursor-crosshair" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
            {/* grilla horizontal */}
            {[0, H / 2, H].map((y, i) => (
              <line key={i} x1="0" y1={y} x2={W} y2={y} stroke="#1F2A3C" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" opacity="0.6" />
            ))}
            {/* grilla temporal vertical */}
            {ticks.map((t, i) => (
              <line key={i} x1={xOf(t)} y1="0" x2={xOf(t)} y2={H} stroke="#1F2A3C" strokeWidth="1" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" opacity="0.4" />
            ))}
            {/* una polilínea por serie */}
            {series.map((s) => (
              <polyline
                key={s.codigo}
                points={s.puntos.map((p) => `${xOf(p.t).toFixed(1)},${yOf(p.v, s.codigo).toFixed(1)}`).join(' ')}
                fill="none"
                stroke={s.color}
                strokeWidth={s.codigo === base.codigo ? 2 : 1.5}
                strokeOpacity={s.codigo === base.codigo ? 1 : 0.85}
                vectorEffect="non-scaling-stroke"
              />
            ))}
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
              <div className="absolute w-2 h-2 rounded-full pointer-events-none ring-2 ring-base" style={{ left: `${hxPct}%`, top: `${hyPct}%`, transform: 'translate(-50%,-50%)', backgroundColor: base.color }} />
              <div
                className="absolute bg-elevated border border-line rounded px-1.5 py-1 text-[10px] text-snow pointer-events-none whitespace-nowrap z-10 space-y-0.5"
                style={{ left: `${hxPct}%`, top: 0, transform: hxPct > 55 ? 'translateX(-105%)' : 'translateX(5%)' }}
              >
                <div className="text-muted">{fmtFull(hp.t)}</div>
                {series.map((s) => {
                  const c = cercano(s.puntos, hp.t)
                  return (
                    <div key={s.codigo} className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-muted">{s.label}</span>
                      <span className="font-mono font-semibold ml-auto" style={{ color: s.color }}>
                        {c ? c.v.toLocaleString('es-CL', { maximumFractionDigits: 3 }) : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Valor actual de la base (sin hover) */}
          {!hp && (
            <span
              className="absolute right-1 text-[11px] font-mono font-semibold px-1 rounded pointer-events-none"
              style={{ top: `${(yOf(baseUltimo, base.codigo) / H) * 100}%`, transform: 'translateY(-50%)', color: base.color, backgroundColor: 'rgba(0,0,0,0.6)' }}
            >
              {baseUltimo.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* Eje X */}
      <div className="flex mt-1">
        <div className="w-12" />
        <div className="relative flex-1 h-3">
          {ticks.map((t, i) => (
            i % labelEvery === 0 && (
              <span key={i} className="absolute text-[9px] text-muted -translate-x-1/2 whitespace-nowrap" style={{ left: `${(xOf(t) / W) * 100}%` }}>
                {fmtTick(t)}
              </span>
            )
          ))}
        </div>
      </div>
    </div>
  )
}
