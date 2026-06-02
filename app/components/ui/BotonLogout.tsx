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
      className="text-muted hover:text-snow transition text-xs px-2 py-1 rounded border border-transparent hover:border-line"
    >
      ⎋ Salir
    </button>
  )
}
