'use client'

import { useRouter } from 'next/navigation'

export default function BotonLogout() {
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <button
      onClick={logout}
      title="Cerrar sesión"
      className="flex items-center gap-1.5 text-xs text-brand hover:text-snow border border-brandDark/40 hover:border-brand px-3 py-1.5 rounded-lg transition-colors"
    >
      ⎋ Salir

    </button>
  )
}
