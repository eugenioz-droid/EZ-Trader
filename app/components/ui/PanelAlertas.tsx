'use client'

import { useState, useEffect } from 'react'

interface Alerta {
  id: number
  titulo: string
  mensaje: string | null
  severidad: 'baja' | 'media' | 'alta'
  disparada_at: string
  leida: boolean
}

const COLORES: Record<string, string> = {
  alta:  'text-red-400 border-red-800 bg-red-900/20',
  media: 'text-yellow-400 border-yellow-800 bg-yellow-900/20',
  baja:  'text-blue-400 border-blue-800 bg-blue-900/20',
}

function tiempoRelativo(fecha: string): string {
  const diff = Date.now() - new Date(fecha).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 60) return `hace ${min} min`
  const hrs = Math.floor(min / 60)
  return `hace ${hrs}h`
}

export default function PanelAlertas() {
  const [abierto, setAbierto] = useState(false)
  const [alertas, setAlertas] = useState<Alerta[]>([])

  useEffect(() => {
    fetch('/api/alertas')
      .then(r => r.json())
      .then(d => setAlertas(d.alertas ?? []))
      .catch(() => {})
  }, [abierto])

  const sinLeer = alertas.filter(a => !a.leida).length

  async function marcarLeidas() {
    await fetch('/api/alertas', { method: 'POST' })
    setAlertas(prev => prev.map(a => ({ ...a, leida: true })))
  }

  return (
    <div className="relative">
      <button
        onClick={() => { setAbierto(!abierto); if (!abierto && sinLeer > 0) marcarLeidas() }}
        className="relative flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors"
      >
        🔔
        {sinLeer > 0 && (
          <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
            {sinLeer}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 top-10 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50">
          <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-200">Alertas</span>
            <button onClick={() => setAbierto(false)} className="text-gray-600 hover:text-gray-300 text-xs">✕</button>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-800">
            {alertas.length === 0 && (
              <p className="px-4 py-6 text-sm text-gray-600 text-center">Sin alertas recientes</p>
            )}
            {alertas.map(a => (
              <div key={a.id} className={`px-4 py-3 border-l-2 ${COLORES[a.severidad] ?? ''}`}>
                <p className="text-sm font-medium text-gray-200">{a.titulo}</p>
                {a.mensaje && <p className="text-xs text-gray-500 mt-0.5">{a.mensaje}</p>}
                <p className="text-xs text-gray-600 mt-1">{tiempoRelativo(a.disparada_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
