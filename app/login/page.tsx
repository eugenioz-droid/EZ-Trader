'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || '/'

  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        router.replace(next)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'No se pudo iniciar sesión')
        setCargando(false)
      }
    } catch {
      setError('Error de conexión')
      setCargando(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-base text-snow overflow-hidden">
      {/* Fondo mapamundi (mismo del banner) — globo hacia la derecha */}
      <div
        className="absolute inset-0 bg-no-repeat"
        style={{
          backgroundImage: "url('/fondo-globo.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'right center',
        }}
      />
      {/* Gradiente: oscurece izquierda/centro para que el logo se funda sin rectángulo */}
      <div className="absolute inset-0 bg-gradient-to-r from-base via-base/75 to-transparent" />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/logo.png"
            alt="EZ Trader"
            width={260}
            height={260}
            priority
            className="object-contain w-48 h-48 lg:w-64 lg:h-64 drop-shadow-[0_0_25px_rgba(0,255,127,0.15)]"
          />
          <div className="text-[11px] tracking-[0.25em] text-brandDark font-semibold mt-1">
            TRADE SMART. GROW CONFIDENT.
          </div>
        </div>

        <form onSubmit={onSubmit} className="w-full max-w-sm bg-panel/80 backdrop-blur-sm border border-line rounded-2xl p-6 shadow-2xl">
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            Acceso privado
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Contraseña"
            autoFocus
            className="w-full bg-base border border-line rounded-lg px-3 py-2.5 text-snow placeholder:text-muted focus:outline-none focus:border-brandDark transition"
          />
          {error && <p className="text-pesoDebil text-sm mt-2">{error}</p>}
          <button
            type="submit"
            disabled={cargando || !password}
            className="w-full mt-4 bg-brand text-[#0D1117] font-semibold rounded-lg py-2.5 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {cargando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
