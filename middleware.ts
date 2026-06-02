import { NextRequest, NextResponse } from 'next/server'
import { COOKIE_NAME } from '@/app/lib/auth'

// Rutas que NO requieren login (cada una tiene su propia protección o es pública por diseño).
const RUTAS_PUBLICAS = [
  '/login',        // la página de login misma
  '/api/auth',     // el endpoint que valida la contraseña
  '/api/cron',     // protegido por CRON_SECRET (lo llama Supabase, sin cookie)
]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Dejar pasar rutas públicas
  if (RUTAS_PUBLICAS.some(ruta => pathname === ruta || pathname.startsWith(ruta + '/'))) {
    return NextResponse.next()
  }

  // Validar cookie de sesión contra AUTH_SECRET
  const cookie = req.cookies.get(COOKIE_NAME)?.value
  const autorizado = cookie && cookie === process.env.AUTH_SECRET

  if (autorizado) {
    return NextResponse.next()
  }

  // Si es una llamada a API → 401 (no redirigir, que el cliente lo maneje)
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Si es una página → redirigir al login conservando el destino
  const url = req.nextUrl.clone()
  url.pathname = '/login'
  url.searchParams.set('next', pathname)
  return NextResponse.redirect(url)
}

// Aplicar a todo EXCEPTO assets estáticos de Next y archivos públicos.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png|fondo-globo.png).*)',
  ],
}
