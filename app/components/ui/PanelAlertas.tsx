'use client'

import { useState, useEffect, useCallback } from 'react'

interface Alerta {
  id: number
  titulo: string
  mensaje: string | null
  severidad: 'baja' | 'media' | 'alta'
  tipo: 'regla' | 'agente'
  disparada_at: string
  leida: boolean
}

const BORDE: Record<string, string> = {
  alta:  'border-pesoDebil/60',
  media: 'border-amber-500/60',
  baja:  'border-brandDark/50',
}

const ICONO_TIPO: Record<string, string> = {
  regla:  '📊',  // alerta de regla automática (cobre cae X%, etc.)
  agente: '🤖',  // alerta generada por Haiku (noticia de alto impacto)
}

const LABEL_TIPO: Record<string, string> = {
  regla:  'Regla de mercado',
  agente: 'Haiku IA',
}

function tiempoRelativo(fecha: string): string {
  const diff = Date.now() - new Date(fecha).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 60) return `hace ${min} min`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

export default function PanelAlertas() {
  const [abierto, setAbierto] = useState(false)
  const [alertas, setAlertas] = useState<Alerta[]>([])

  const cargar = useCallback(async () => {
    try {
      const r = await fetch('/api/alertas')
      const d = await r.json()
      setAlertas(d.alertas ?? [])
    } catch { /* silencioso */ }
  }, [])

  // Carga inicial + auto-refresh cada 2 min para que el badge se actualice sin abrir el panel
  useEffect(() => {
    cargar()
    const id = setInterval(cargar, 2 * 60 * 1000)
    return () => clearInterval(id)
  }, [cargar])

  const sinLeer = alertas.filter(a => !a.leida).length

  async function marcarLeidas() {
    await fetch('/api/alertas', { method: 'POST' })
    setAlertas(prev => prev.map(a => ({ ...a, leida: true })))
  }

  function abrir() {
    setAbierto(true)
    if (sinLeer > 0) marcarLeidas()
  }

  return (
    <div className="relative">
      <button
        onClick={() => abierto ? setAbierto(false) : abrir()}
        className="relative flex items-center gap-1.5 text-xs text-muted hover:text-snow border border-line hover:border-muted px-3 py-1.5 rounded-lg transition-colors"
        title={sinLeer > 0 ? `${sinLeer} alerta${sinLeer > 1 ? 's' : ''} sin leer` : 'Alertas'}
      >
        🔔
        {sinLeer > 0 && (
          <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-pesoDebil text-white text-[10px] flex items-center justify-center font-bold animate-pulse">
            {sinLeer > 9 ? '9+' : sinLeer}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 top-10 w-88 bg-panel border border-line rounded-xl shadow-2xl z-50" style={{ width: '22rem' }}>
          <div className="px-4 py-3 border-b border-line flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-silver">Alertas</span>
              <span className="text-xs text-muted ml-2">
                {alertas.length === 0 ? 'sin alertas' : `${alertas.length} recientes`}
              </span>
            </div>
            <button onClick={() => setAbierto(false)} className="text-muted hover:text-silver text-xs px-1">✕</button>
          </div>

          {/* Leyenda de tipos */}
          {alertas.length > 0 && (
            <div className="px-4 py-2 border-b border-line flex gap-3 text-[10px] text-muted/70">
              <span>📊 Regla de mercado</span>
              <span>🤖 Haiku IA</span>
            </div>
          )}

          <div className="max-h-96 overflow-y-auto divide-y divide-line">
            {alertas.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-muted">Sin alertas recientes</p>
                <p className="text-xs text-muted/60 mt-1">
                  Las alertas aparecen cuando el cron detecta movimientos bruscos o Haiku clasifica noticias de alto impacto.
                </p>
              </div>
            )}
            {alertas.map(a => (
              <div
                key={a.id}
                className={`px-4 py-3 border-l-2 ${BORDE[a.severidad] ?? 'border-line'} ${
                  a.leida ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* Tipo de alerta */}
                    <span className="text-[10px] text-muted/70 mb-0.5 block">
                      {ICONO_TIPO[a.tipo] ?? '📌'} {LABEL_TIPO[a.tipo] ?? a.tipo}
                    </span>
                    <p className="text-sm font-medium text-silver leading-snug">{a.titulo}</p>
                    {a.mensaje && (
                      <p className="text-xs text-muted mt-0.5 leading-snug">{a.mensaje}</p>
                    )}
                  </div>
                  {!a.leida && (
                    <span className="h-2 w-2 rounded-full bg-pesoDebil flex-shrink-0 mt-1" />
                  )}
                </div>
                <p className="text-[10px] text-muted/60 mt-1.5">{tiempoRelativo(a.disparada_at)}</p>
              </div>
            ))}
          </div>

          {alertas.length > 0 && (
            <div className="px-4 py-2 border-t border-line text-center">
              <p className="text-[10px] text-muted/50">
                Se actualiza cada 2 min · Haiku clasifica noticias cada 15 min
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
