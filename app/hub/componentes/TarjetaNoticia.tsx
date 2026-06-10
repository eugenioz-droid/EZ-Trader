import Link from 'next/link'
import type { NoticiaFeed } from '@/app/lib/feed'

// Nombres legibles de las secciones (para los chips). Coincide con tabla `secciones`.
const NOMBRE_SECCION: Record<string, string> = {
  dolar: 'Dólar',
  cobre: 'Cobre',
  bitcoin: 'Bitcoin',
  sp500: 'S&P 500',
  ipsa: 'IPSA',
  oro: 'Oro',
  'uf-inflacion': 'UF e inflación',
}

function tiempoRelativo(fecha: string | null): string {
  if (!fecha) return ''
  const min = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000)
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.floor(h / 24)} d`
}

export default function TarjetaNoticia({ n, destacada = false }: { n: NoticiaFeed; destacada?: boolean }) {
  const href = n.slug ? `/hub/noticia/${n.slug}` : n.url
  const externa = !n.slug

  const contenido = (
    <article
      className={`group rounded-xl border border-line bg-panel/60 hover:bg-elevated transition-colors p-4 h-full flex flex-col ${
        destacada ? 'md:p-5' : ''
      }`}
    >
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {n.secciones.slice(0, 3).map((s) => (
          <span key={s} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand/15 text-brand">
            {NOMBRE_SECCION[s] ?? s}
          </span>
        ))}
        {n.geografia === 'nacional' && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-silver/10 text-silver">Chile</span>
        )}
      </div>

      <h3
        className={`font-semibold text-snow leading-snug group-hover:text-brand transition-colors ${
          destacada ? 'text-lg md:text-xl' : 'text-sm'
        }`}
      >
        {n.titulo}
      </h3>

      {n.resumen && destacada && (
        <p className="text-sm text-muted mt-2 line-clamp-3">{n.resumen}</p>
      )}

      <div className="flex items-center gap-2 mt-auto pt-3 text-[11px] text-muted/70">
        {n.fuente && <span>{n.fuente}</span>}
        {n.fuente && n.publicado_at && <span>·</span>}
        <span>{tiempoRelativo(n.publicado_at)}</span>
        {externa && <span className="ml-auto">↗</span>}
      </div>
    </article>
  )

  if (externa) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full">
        {contenido}
      </a>
    )
  }
  return (
    <Link href={href} className="block h-full">
      {contenido}
    </Link>
  )
}
