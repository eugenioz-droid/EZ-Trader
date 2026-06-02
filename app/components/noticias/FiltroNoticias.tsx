'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const FUENTES = [
  { valor: '', label: 'Todas' },
  { valor: 'Investing.com USD/CLP', label: 'USD/CLP' },
  { valor: 'Reuters RSS', label: 'Mercados' },
  { valor: 'Federal Reserve RSS', label: 'Fed' },
]

export default function FiltroNoticias() {
  const router = useRouter()
  const params = useSearchParams()
  const actual = params.get('fuente') ?? ''

  function cambiarFiltro(valor: string) {
    const url = valor ? `/?fuente=${encodeURIComponent(valor)}` : '/'
    router.push(url)
  }

  return (
    <div className="flex gap-1 flex-wrap">
      {FUENTES.map((f) => (
        <button
          key={f.valor}
          onClick={() => cambiarFiltro(f.valor)}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
            actual === f.valor
              ? 'border-brand text-brand bg-brand/10'
              : 'border-line text-muted hover:border-muted hover:text-silver'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
