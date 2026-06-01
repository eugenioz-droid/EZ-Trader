'use client'

import { useState } from 'react'

export default function PanelAgente() {
  const [abierto, setAbierto] = useState(false)

  return (
    <div className="flex flex-col h-full">
      {/* Header del agente */}
      <div
        className="sticky top-0 bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-900"
        onClick={() => setAbierto(!abierto)}
      >
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-blue-500"></div>
          <h2 className="text-sm font-semibold text-gray-300">Agente EZ Trader</h2>
        </div>
        <span className="text-gray-600 text-xs">{abierto ? '▲ cerrar' : '▼ abrir'}</span>
      </div>

      {abierto && (
        <div className="flex-1 flex flex-col p-4">
          {/* Área de mensajes */}
          <div className="flex-1 bg-gray-900 rounded-lg p-4 mb-4 min-h-48">
            <div className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 max-w-xs">
              Hola. Soy tu agente de análisis USD/CLP. Cuando esté configurado podré analizar las noticias del día y ayudarte a planificar tu estrategia semanal.
            </div>
          </div>

          {/* Input — deshabilitado hasta Fase 6 */}
          <div className="flex gap-2">
            <input
              type="text"
              disabled
              placeholder="Disponible en Fase 6..."
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
            />
            <button
              disabled
              className="bg-blue-900 text-blue-400 px-3 py-2 rounded-lg text-sm cursor-not-allowed opacity-50"
            >
              Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
