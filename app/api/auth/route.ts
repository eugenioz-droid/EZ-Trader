import { NextRequest, NextResponse } from 'next/server'
import { COOKIE_NAME, SESSION_MAX_AGE } from '@/app/lib/auth'

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({ password: '' }))

  const esperado = process.env.APP_PASSWORD
  const secret = process.env.AUTH_SECRET

  if (!esperado || !secret) {
    return NextResponse.json(
      { error: 'Servidor sin APP_PASSWORD o AUTH_SECRET configurados' },
      { status: 500 }
    )
  }

  if (password !== esperado) {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, secret, {
    httpOnly: true,                                  // JS del navegador no puede leerla (anti-XSS)
    secure: process.env.NODE_ENV === 'production',   // solo HTTPS en producción
    sameSite: 'lax',                                 // anti-CSRF razonable
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
  return res
}
