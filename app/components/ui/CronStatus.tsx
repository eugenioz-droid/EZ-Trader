'use client'

import { useState, useEffect, useCallback } from 'react'

interface PasoResultado {
  error?: string
  [k: string]: unknown
}

interface Corrida {
  origen: string
  ejecutado_at: string
  duracion_ms: number | null
  ok: boolean
  detalle: Record<string, PasoResultado>
}

const LENTO_MS = 20_000

function tiempoRel(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min}m`
  return `hace ${Math.floor(min / 60)}h`
}

export default function CronStatus() {
  const [ultima, setUltima] = useState<Corrida | null>(null)
  const [abierto, setAbierto] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const r = await fetch('/api/cron-status')
      const d = await r.json()
      setUltima(d.ultima ?? null)
    } catch { /* silencioso */ }
  }, [])

  useEffect(() => {
    cargar()
    const id = setInterval(cargar, 2 * 60 * 1000)
    return () => clearInterval(id)
  }, [cargar])

  if (!ultima) return null

  const lento = (ultima.duracion_ms ?? 0) > LENTO_MS
  // Verde = ok y rápido; ámbar = lento; rojo = algún paso falló.
  const estado = !ultima.ok ? 'rojo' : lento ? 'ambar' : 'verde'
  const color =
    estado === 'rojo' ? 'bg-pesoDebil' : estado === 'ambar' ? 'bg-amber-400' : 'bg-brand'

  // Pasos con error, para el detalle
  const errores = Object.entries(ultima.detalle ?? {})
    .filter(([, v]) => v && typeof v === 'object' && 'error' in v)
    .map(([k, v]) => `${k}: ${v.error}`)

  return (
    <div className="relative">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted hover:text-snow px-1.5 py-1.5 rounded-lg transition-colors"
        title="Estado del cron"
      >
        <span className={`h-2 w-2 rounded-full ${color} ${estado !== 'verde' ? 'animate-pulse' : ''}`} />
        <span className="hidden md:inline">cron</span>
      </button>

      {abierto && (
        <div className="absolute right-0 top-10 w-64 bg-panel border border-line rounded-xl shadow-2xl z-50 p-3 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-silver">Estado del cron</span>
            <button onClick={() => setAbierto(false)} className="text-muted hover:text-silver px-1">✕</button>
          </div>
          <div className="text-muted">
            Última corrida: <span className="text-silver">{tiempoRel(ultima.ejecutado_at)}</span> ({ultima.origen})
          </div>
          <div className="text-muted">
            Duración: <span className={lento ? 'text-amber-400' : 'text-silver'}>
              {ultima.duracion_ms != null ? (ultima.duracion_ms / 1000).toFixed(1) + 's' : '—'}
            </span>
            {lento && <span className="text-amber-400/80"> (lento)</span>}
          </div>
          {estado === 'verde' && <div className="text-brand">✓ Todo OK</div>}
          {errores.length > 0 ? (
            <div className="text-pesoDebil space-y-0.5 pt-1 border-t border-line/60">
              {errores.map((e, i) => (
                <div key={i} className="break-words">⚠ {e}</div>
              ))}
            </div>
          ) : (
            !ultima.ok && <div className="text-pesoDebil">⚠ Falló sin detalle</div>
          )}
        </div>
      )}
    </div>
  )
}
