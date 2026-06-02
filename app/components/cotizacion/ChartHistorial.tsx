'use client'

import { useState, useEffect, useCallback } from 'react'
import GraficoInteractivo, { type SerieGrafico } from './GraficoInteractivo'

interface Punto { t: number; v: number }
interface Pin { t: number; titulo: string }

const SERIES_META: Record<string, { label: string; color: string; fija?: boolean }> = {
  USDCLP: { label: 'USD/CLP', color: '#00FF7F', fija: true },
  COBRE: { label: 'Cobre', color: '#F59E0B' },
  DXY: { label: 'DXY', color: '#38BDF8' },
  PETROLEO: { label: 'Petróleo', color: '#C084FC' },
}

const PERIODOS: [string, string][] = [
  ['1d', '1D'],
  ['1sem', '1 sem'],
  ['1mes', '1 mes'],
  ['3mes', '3 meses'],
]

interface RespuestaHistorial {
  periodo: string
  series: Record<string, Punto[]>
  pines: Pin[]
}

export default function ChartHistorial({ inicial }: { inicial: RespuestaHistorial }) {
  const [periodo, setPeriodo] = useState(inicial.periodo)
  const [activas, setActivas] = useState<string[]>(['USDCLP', 'COBRE'])
  const [data, setData] = useState<RespuestaHistorial>(inicial)
  const [cargando, setCargando] = useState(false)

  const cargar = useCallback(async (per: string, series: string[]) => {
    setCargando(true)
    try {
      const res = await fetch(`/api/historial?periodo=${per}&series=${series.join(',')}`)
      if (res.ok) setData(await res.json())
    } finally {
      setCargando(false)
    }
  }, [])

  // Recarga cuando cambia período o series (salvo el primer render, ya servido)
  const [montado, setMontado] = useState(false)
  useEffect(() => {
    if (!montado) { setMontado(true); return }
    cargar(periodo, activas)
  }, [periodo, activas, montado, cargar])

  function toggle(codigo: string) {
    if (SERIES_META[codigo]?.fija) return
    setActivas((prev) =>
      prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo]
    )
  }

  // Construir series para el gráfico (en el orden de SERIES_META, base primero)
  const series: SerieGrafico[] = Object.keys(SERIES_META)
    .filter((c) => activas.includes(c))
    .map((c) => ({
      codigo: c,
      label: SERIES_META[c].label,
      color: SERIES_META[c].color,
      puntos: data.series[c] ?? [],
    }))
    .filter((s) => s.puntos.length > 0)

  // Pines con espaciado proporcional al span (evita saturar en períodos largos)
  const base = data.series['USDCLP'] ?? []
  const t0 = base[0]?.t ?? 0
  const t1 = base[base.length - 1]?.t ?? 0
  const espaciado = (t1 - t0) / 25
  const pines: Pin[] = []
  let ultimo = -Infinity
  for (const p of data.pines) {
    if (p.t >= t0 && p.t <= t1 && p.t - ultimo >= espaciado) {
      pines.push(p)
      ultimo = p.t
    }
  }

  return (
    <div className="px-4 py-4 border-b border-line">
      {/* Encabezado + selector de período */}
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
          Historial USD/CLP
        </h3>
        <div className="flex items-center gap-1">
          {cargando && <span className="text-[10px] text-muted animate-pulse mr-1">…</span>}
          {PERIODOS.map(([val, label]) => (
            <button
              key={val}
              onClick={() => setPeriodo(val)}
              className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
                periodo === val
                  ? 'bg-brand/20 text-brand font-medium'
                  : 'text-muted hover:text-silver hover:bg-elevated'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles de curvas */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {Object.keys(SERIES_META).map((c) => {
          const meta = SERIES_META[c]
          const on = activas.includes(c)
          return (
            <button
              key={c}
              onClick={() => toggle(c)}
              disabled={meta.fija}
              className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full border transition-colors ${
                on ? 'border-line bg-elevated' : 'border-line/40 opacity-50 hover:opacity-80'
              } ${meta.fija ? 'cursor-default' : ''}`}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: on ? meta.color : '#475569' }} />
              <span className={on ? 'text-silver' : 'text-muted'}>{meta.label}</span>
            </button>
          )
        })}
        <span className="text-[10px] text-muted/40 ml-auto">curvas normalizadas — ver divergencias</span>
      </div>

      <GraficoInteractivo series={series} pines={pines} />
    </div>
  )
}
