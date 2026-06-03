'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface Mensaje {
  rol: 'user' | 'assistant'
  texto: string
  modelo?: string
}

interface ConversacionItem {
  id: number
  titulo: string | null
  updated_at: string
}

type MensajeServidor = { rol: string; contenido: string; modelo_usado?: string }

function mapMensajes(arr: MensajeServidor[]): Mensaje[] {
  return arr.map((m) => ({
    rol: m.rol as 'user' | 'assistant',
    texto: m.contenido,
    modelo: m.modelo_usado ?? undefined,
  }))
}

function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
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

const BIENVENIDA: Mensaje = {
  rol: 'assistant',
  texto: 'Hola. Soy tu agente de análisis USD/CLP. Pregúntame por el estado de los factores, una noticia, o si conviene una entrada esta semana.',
}

export default function PanelAgente() {
  const [abierto, setAbierto] = useState(true)
  const [modo, setModo] = useState<Modo>('normal')
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [cargandoHistorial, setCargandoHistorial] = useState(true)
  const [conversacionId, setConversacionId] = useState<number | null>(null)
  const [conversaciones, setConversaciones] = useState<ConversacionItem[]>([])
  const [historialAbierto, setHistorialAbierto] = useState(false)
  const [input, setInput] = useState('')
  const [cargando, setCargando] = useState(false)
  const finRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const histRef = useRef<HTMLDivElement>(null)

  const cargarLista = useCallback(async () => {
    try {
      const r = await fetch('/api/conversaciones')
      const d = await r.json()
      setConversaciones(d.conversaciones ?? [])
    } catch { /* silencioso */ }
  }, [])

  // Carga la conversación activa + la lista al montar
  useEffect(() => {
    async function inicial() {
      try {
        const r = await fetch('/api/conversacion')
        const d = await r.json()
        setConversacionId(d.conversacion_id)
        setMensajes(d.mensajes?.length > 0 ? mapMensajes(d.mensajes) : [BIENVENIDA])
      } catch {
        setMensajes([BIENVENIDA])
      } finally {
        setCargandoHistorial(false)
      }
    }
    inicial()
    cargarLista()
  }, [cargarLista])

  // Crea una conversación nueva y limpia el chat
  async function nuevoChat() {
    setHistorialAbierto(false)
    try {
      const r = await fetch('/api/conversacion', { method: 'POST' })
      const d = await r.json()
      setConversacionId(d.conversacion_id)
      setMensajes([BIENVENIDA])
      cargarLista()
    } catch { /* noop */ }
  }

  // Carga una conversación anterior por id
  async function seleccionarConversacion(id: number) {
    setHistorialAbierto(false)
    if (id === conversacionId) return
    setCargandoHistorial(true)
    try {
      const r = await fetch(`/api/conversacion?id=${id}`)
      const d = await r.json()
      setConversacionId(d.conversacion_id)
      setMensajes(d.mensajes?.length > 0 ? mapMensajes(d.mensajes) : [BIENVENIDA])
    } catch { /* noop */ } finally {
      setCargandoHistorial(false)
    }
  }

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, cargando])

  // Cerrar menús (selector de agente e historial) al hacer clic fuera
  useEffect(() => {
    function onClickFuera(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAbierto(false)
      }
      if (histRef.current && !histRef.current.contains(e.target as Node)) {
        setHistorialAbierto(false)
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
        body: JSON.stringify({ pregunta, profundidad: modo, conversacion_id: conversacionId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMensajes((m) => [
          ...m,
          { rol: 'assistant', texto: `⚠️ ${data.error ?? 'Error al consultar el agente.'}` },
        ])
      } else {
        if (data.conversacion_id) setConversacionId(data.conversacion_id)
        setMensajes((m) => [
          ...m,
          { rol: 'assistant', texto: data.respuesta, modelo: data.modelo },
        ])
        // Refresca la lista: el título puede haberse generado y cambia el orden.
        cargarLista()
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header — colapsable */}
      <div
        className="shrink-0 bg-panel border-b border-line px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-elevated z-20"
        onClick={() => setAbierto(!abierto)}
      >
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-brand"></div>
          <h2 className="text-sm font-semibold text-silver">Agente EZ Trader</h2>
        </div>
        <div className="flex items-center gap-2">
          {abierto && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); nuevoChat() }}
                className="text-[11px] text-muted hover:text-brand border border-line hover:border-brand/50 rounded px-2 py-0.5"
                title="Nueva conversación"
              >
                + Nuevo
              </button>
              <div className="relative" ref={histRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setHistorialAbierto((v) => !v)
                    if (!historialAbierto) cargarLista()
                  }}
                  className="text-[11px] text-muted hover:text-silver border border-line hover:border-muted rounded px-2 py-0.5 flex items-center gap-1"
                  title="Conversaciones anteriores"
                >
                  ☰ Historial <span className="text-[9px]">{historialAbierto ? '▲' : '▼'}</span>
                </button>
                {historialAbierto && (
                  <div
                    className="absolute right-0 top-7 w-64 bg-elevated border border-line rounded-lg shadow-xl z-30 max-h-80 overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {conversaciones.length === 0 && (
                      <div className="px-3 py-3 text-xs text-muted text-center">Sin conversaciones previas</div>
                    )}
                    {conversaciones.map((c) => (
                      <button
                        key={c.id}
                        onClick={(e) => { e.stopPropagation(); seleccionarConversacion(c.id) }}
                        className={`w-full text-left px-3 py-2 hover:bg-panel border-b border-line/50 last:border-0 ${
                          c.id === conversacionId ? 'bg-panel' : ''
                        }`}
                      >
                        <div className="text-xs text-silver truncate">
                          {c.titulo || 'Conversación sin título'}
                          {c.id === conversacionId && <span className="text-brand ml-1">·</span>}
                        </div>
                        <div className="text-[10px] text-muted/60 mt-0.5">{fmtFecha(c.updated_at)}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
          <span className="text-muted text-xs">{abierto ? '▲' : '▼'}</span>
        </div>
      </div>

      {abierto && (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">

          {/* Mensajes — ocupa todo el espacio disponible sobre los controles */}
          <div className="flex-1 overflow-y-auto min-h-0 px-4 pt-4 pb-2">
            <div className="bg-panel rounded-lg p-4 border border-line space-y-3 h-full">
              {cargandoHistorial && (
                <div className="flex justify-start">
                  <div className="bg-elevated rounded-lg px-3 py-2 text-sm text-muted animate-pulse">
                    Cargando conversación…
                  </div>
                </div>
              )}
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
          </div>

          {/* Controles — tamaño natural, pegado al fondo */}
          <div className="shrink-0 flex flex-col gap-2 px-4 pb-4 pt-2">

            {/* Selector de agente */}
            <div className="relative" ref={menuRef}>
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
            <p className="text-[10px] text-muted/40 text-right">Enter envía · Shift+Enter = nueva línea</p>

          </div>
        </div>
      )}
    </div>
  )
}
