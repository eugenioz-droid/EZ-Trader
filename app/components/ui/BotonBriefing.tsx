'use client'

import { useState } from 'react'

export default function BotonBriefing() {
  const [cargando, setCargando] = useState(false)

  async function descargar() {
    setCargando(true)
    try {
      const res = await fetch('/api/briefing')
      const texto = await res.text()
      const blob = new Blob([texto], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ez-trader-briefing-${new Date().toISOString().slice(0, 10)}.md`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setCargando(false)
    }
  }

  return (
    <button
      onClick={descargar}
      disabled={cargando}
      title="Descarga un resumen para pegar en ChatGPT"
      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
    >
      📄 {cargando ? 'Generando...' : 'Briefing para GPT'}
    </button>
  )
}
