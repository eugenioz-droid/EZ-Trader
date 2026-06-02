'use client'

import { useState } from 'react'

export default function PanelAgente() {
  const [abierto, setAbierto] = useState(false)

  return (
    <div className="flex flex-col h-full">
      <div
        className="sticky top-0 bg-panel border-b border-line px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-elevated"
        onClick={() => setAbierto(!abierto)}
      >
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-brand"></div>
          <h2 className="text-sm font-semibold text-silver">Agente EZ Trader</h2>
        </div>
        <span className="text-muted text-xs">{abierto ? '▲ cerrar' : '▼ abrir'}</span>
      </div>

      {abierto && (
        <div className="flex-1 flex flex-col p-4">
          <div className="flex-1 bg-panel rounded-lg p-4 mb-4 min-h-48 border border-line">
            <div className="bg-elevated rounded-lg px-3 py-2 text-sm text-silver max-w-xs">
              Hola. Soy tu agente de análisis USD/CLP. Cuando esté configurado podré analizar las noticias del día y ayudarte a planificar tu estrategia semanal.
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              disabled
              placeholder="Disponible en Fase 6..."
              className="flex-1 bg-panel border border-line rounded-lg px-3 py-2 text-sm text-muted cursor-not-allowed"
            />
            <button
              disabled
              className="bg-brandDark/20 text-brand px-3 py-2 rounded-lg text-sm cursor-not-allowed opacity-50"
            >
              Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
