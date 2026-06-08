'use client'

import { useState, useEffect } from 'react'

interface Sintesis {
  fecha: string
  texto: string
  generado_at: string
}

export default function BannerSintesis() {
  const [sintesis, setSintesis] = useState<Sintesis | null>(null)
  const [abierto, setAbierto] = useState(true)

  useEffect(() => {
    fetch('/api/sintesis')
      .then((r) => r.json())
      .then((d) => { if (d.sintesis) setSintesis(d.sintesis) })
      .catch(() => {})
  }, [])

  if (!sintesis) return null

  const hora = new Date(sintesis.generado_at).toLocaleTimeString('es-CL', {
    timeZone: 'America/Santiago',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="border-b border-line bg-panel/40">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex items-center justify-between px-4 lg:px-6 py-2 text-left hover:bg-panel/60 transition-colors"
      >
        <span className="flex items-center gap-2 text-xs font-medium text-brand">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          Síntesis del día · {hora}
        </span>
        <span className="text-muted text-xs">{abierto ? '▲' : '▼'}</span>
      </button>

      {abierto && (
        <div className="px-4 lg:px-6 pb-3">
          {sintesis.texto.split('\n').filter(Boolean).map((p, i) => (
            <p key={i} className="text-sm text-snow/80 leading-relaxed mb-1.5 last:mb-0">
              {p}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
