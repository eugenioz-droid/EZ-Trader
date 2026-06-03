'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const FUENTES = [
  { valor: '', label: 'Todas' },
  { valor: 'Investing.com USD/CLP', label: 'USD/CLP' },
  { valor: 'Mercados Breaking (Google)', label: 'Mercados' },
  { valor: 'investingLive (ForexLive)', label: 'ForexLive' },
]

const IMPACTOS = [
  { valor: '', label: 'Todo impacto' },
  { valor: 'alto', label: '🔴 Alto' },
  { valor: 'medio', label: '🟡 Medio' },
  { valor: 'bajo', label: 'Bajo' },
]

export default function FiltroNoticias() {
  const router = useRouter()
  const params = useSearchParams()
  const fuenteActual = params.get('fuente') ?? ''
  const impactoActual = params.get('impacto') ?? ''

  function navegar(fuente: string, impacto: string) {
    const p = new URLSearchParams()
    if (fuente) p.set('fuente', fuente)
    if (impacto) p.set('impacto', impacto)
    router.push(p.toString() ? `/?${p}` : '/')
  }

  return (
    <div className="space-y-1.5">
      {/* Filtro por fuente */}
      <div className="flex gap-1 flex-wrap">
        {FUENTES.map((f) => (
          <button
            key={f.valor}
            onClick={() => navegar(f.valor, impactoActual)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              fuenteActual === f.valor
                ? 'border-brand text-brand bg-brand/10'
                : 'border-line text-muted hover:border-muted hover:text-silver'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {/* Filtro por impacto (IA) */}
      <div className="flex gap-1 flex-wrap">
        {IMPACTOS.map((i) => (
          <button
            key={i.valor}
            onClick={() => navegar(fuenteActual, i.valor)}
            className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
              impactoActual === i.valor
                ? 'border-brand text-brand bg-brand/10'
                : 'border-line text-muted hover:border-muted hover:text-silver'
            }`}
          >
            {i.label}
          </button>
        ))}
      </div>
    </div>
  )
}
