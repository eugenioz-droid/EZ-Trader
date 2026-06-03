'use client'

import { useState, useRef, useEffect } from 'react'

interface Mensaje {
  rol: 'user' | 'assistant'
  texto: string
  modelo?: string
}

type Modo = 'normal' | 'profunda'

const AGENTES: Record<Modo, { etiqueta: string; modelo: string; nota: string }> = {
  normal: {
    etiqueta: 'Estándar',
    modelo: 'Sonnet',
    nota: 'Rápido y económico para el día a día.',
  },
  profunda: {
    etiqueta: 'Profundo',
    modelo: 'Opus',
    nota: 'Razonamiento a fondo. Cuesta más por consulta.',
  },
}

export default function PanelAgente() {
  const [abierto, setAbierto] = useState(false)
  const [modo, setModo] = useState<Modo>('normal')
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      rol: 'assistant',
      texto:
        'Hola. Soy tu agente de análisis USD/CLP. Pregúntame por el estado de los factores, una noticia, o si conviene una entrada esta semana.',
    },
  ])
  const [input, setInput] = useState('')
  const [cargando, setCargando] = useState(false)
  const finRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, cargando])

  // Cerrar el menú al hacer clic fuera
  useEffect(() => {
    function onClickFuera(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAbierto(false)
      }
    }
    document.addEventListener('mousedown', onClickFuera)
    return () => document.removeEventListener('mousedown', onClickFuera)
  }, [])

  async function enviar() {
    const pregunta = input.trim()
    if (!pregunta || cargando) return

    setMensajes((m) => [...m, { rol: 'user', texto: pregunta }])
    setInput('')
    setCargando(true)

    try {
      const res = await fetch('/api/consulta-agente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregunta, profundidad: modo }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMensajes((m) => [
          ...m,
          { rol: 'assistant', texto: `⚠️ ${data.error ?? 'Error al consultar el agente.'}` },
        ])
      } else {
        setMensajes((m) => [
          ...m,
          { rol: 'assistant', texto: data.respuesta, modelo: data.modelo },
        ])
      }
    } catch {
      setMensajes((m) => [
        ...m,
        { rol: 'assistant', texto: '⚠️ No se pudo conectar con el agente.' },
      ])
    } finally {
      setCargando(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviar()
    }
  }

  // Auto-crece el textarea con el contenido
  function onInput(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  const esProfundo = modo === 'profunda'
  const agente = AGENTES[modo]

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
          <div className="flex-1 bg-panel rounded-lg p-4 mb-4 min-h-48 max-h-96 overflow-y-auto border border-line space-y-3">
            {mensajes.map((m, i) => (
              <div
                key={i}
                className={m.rol === 'user' ? 'flex justify-end' : 'flex justify-start'}
              >
                <div
                  className={
                    m.rol === 'user'
                      ? 'bg-brandDark/30 rounded-lg px-3 py-2 text-sm text-silver max-w-[85%] whitespace-pre-wrap'
                      : 'bg-elevated rounded-lg px-3 py-2 text-sm text-silver max-w-[85%] whitespace-pre-wrap'
                  }
                >
                  {m.texto}
                  {m.modelo && (
                    <div className="text-muted text-[10px] mt-1 opacity-60">{m.modelo}</div>
                  )}
                </div>
              </div>
            ))}
            {cargando && (
              <div className="flex justify-start">
                <div className="bg-elevated rounded-lg px-3 py-2 text-sm text-muted">
                  {esProfundo ? 'Analizando a fondo…' : 'Analizando…'}
                </div>
              </div>
            )}
            <div ref={finRef} />
          </div>

          {/* Selector de agente */}
          <div className="relative mb-2" ref={menuRef}>
            <button
              onClick={() => setMenuAbierto((v) => !v)}
              className="w-full flex items-center justify-between bg-panel border border-line rounded-lg px-3 py-2 text-sm text-silver hover:border-brand/50"
            >
              <span className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${esProfundo ? 'bg-amber-400' : 'bg-brand'}`}></span>
                Agente: <span className="font-medium">{agente.etiqueta}</span>
                <span className="text-muted">· {agente.modelo}</span>
              </span>
              <span className="text-muted text-xs">{menuAbierto ? '▲' : '▼'}</span>
            </button>

            {menuAbierto && (
              <div className="absolute bottom-full mb-1 w-full bg-elevated border border-line rounded-lg overflow-hidden shadow-lg z-10">
                {(Object.keys(AGENTES) as Modo[]).map((m) => {
                  const a = AGENTES[m]
                  const activo = m === modo
                  return (
                    <button
                      key={m}
                      onClick={() => {
                        setModo(m)
                        setMenuAbierto(false)
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-panel ${activo ? 'bg-panel' : ''}`}
                    >
                      <div className="flex items-center gap-2 text-sm text-silver">
                        <span className={`h-2 w-2 rounded-full ${m === 'profunda' ? 'bg-amber-400' : 'bg-brand'}`}></span>
                        <span className="font-medium">{a.etiqueta}</span>
                        <span className="text-muted">· {a.modelo}</span>
                        {activo && <span className="ml-auto text-brand text-xs">✓</span>}
                      </div>
                      <div className="text-muted text-[11px] mt-0.5 ml-4">{a.nota}</div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Input + Enviar */}
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              onInput={onInput}
              disabled={cargando}
              rows={3}
              placeholder={`Pregunta sobre el mercado USD/CLP…\n(Enter envía · Shift+Enter = salto de línea)`}
              className="flex-1 bg-panel border border-line rounded-lg px-3 py-2 text-sm text-silver placeholder:text-muted/60 focus:outline-none focus:border-brand disabled:opacity-50 resize-none overflow-hidden leading-relaxed"
              style={{ minHeight: '72px', maxHeight: '160px' }}
            />
            <button
              onClick={enviar}
              disabled={cargando || !input.trim()}
              className={`px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 ${
                esProfundo
                  ? 'bg-amber-400 text-black hover:bg-amber-300'
                  : 'bg-brand text-black hover:bg-brand/90'
              }`}
            >
              {esProfundo ? '🔍 Opus' : 'Enviar'}
            </button>
          </div>
          <p className="text-[10px] text-muted/40 text-right mt-1">Enter envía · Shift+Enter = nueva línea</p>
        </div>
      )}
    </div>
  )
}
