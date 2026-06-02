import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'ez_auth'

const RUTAS_PUBLICAS = [
  '/login',
  '/api/auth',
  '/api/cron',
]

async function getAuthSecret(): Promise<string | undefined> {
  // Primero intenta Cloudflare context (producción)
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    const { env } = await getCloudflareContext({ async: true })
    const s = (env as Record<string, string>).AUTH_SECRET
    if (s) return s
  } catch { /* local dev o no disponible */ }
  // Fallback a process.env (local)
  return process.env.AUTH_SECRET
}

export async function middleware(req: NextRequest) {
  try {
    const { pathname } = req.nextUrl

    if (RUTAS_PUBLICAS.some(r => pathname === r || pathname.startsWith(r + '/'))) {
      return NextResponse.next()
    }

    const secret = await getAuthSecret()
    const cookie = req.cookies.get(COOKIE_NAME)?.value
    const autorizado = secret && cookie && cookie === secret

    if (autorizado) return NextResponse.next()

    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  } catch {
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png|fondo-globo.png).*)'],
}
