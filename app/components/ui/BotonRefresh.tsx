'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function BotonRefresh() {
  const [cargando, setCargando] = useState(false)
  const router = useRouter()

  async function handleRefresh() {
    setCargando(true)
    try {
      await fetch('/api/refresh', { method: 'POST' })
      router.refresh()
    } finally {
      setCargando(false)
    }
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={cargando}
      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className={cargando ? 'animate-spin' : ''}>↻</span>
      {cargando ? 'Actualizando...' : 'Actualizar ahora'}
    </button>
  )
}
