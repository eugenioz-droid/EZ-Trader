import { NextRequest, NextResponse } from 'next/server'
import { obtenerFeed } from '@/app/lib/feed'

// Feed público del hub (JSON). Filtros:
//   ?seccion=dolar|cobre|bitcoin|sp500|ipsa|oro|uf-inflacion
//   ?geografia=nacional|internacional|ambas
//   ?destacadas=true   (solo relevancia alta — portada)
//   ?limit=N           (máx 50)
// Lectura pública (no requiere login). La lógica vive en app/lib/feed.ts,
// compartida con las páginas server-side del hub.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const noticias = await obtenerFeed({
    seccion: sp.get('seccion'),
    geografia: sp.get('geografia'),
    destacadas: sp.get('destacadas') === 'true',
    limit: parseInt(sp.get('limit') ?? '30', 10) || 30,
  })
  return NextResponse.json({ noticias })
}
