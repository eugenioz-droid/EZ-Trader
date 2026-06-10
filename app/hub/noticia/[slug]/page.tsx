import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import HubHeader from '../../componentes/HubHeader'
import TarjetaNoticia from '../../componentes/TarjetaNoticia'
import { obtenerNoticiaPorSlug, obtenerFeed } from '@/app/lib/feed'

export const dynamic = 'force-dynamic'

const NOMBRE_SECCION: Record<string, string> = {
  dolar: 'Dólar', cobre: 'Cobre', bitcoin: 'Bitcoin', sp500: 'S&P 500',
  ipsa: 'IPSA', oro: 'Oro', 'uf-inflacion': 'UF e inflación',
}
const DIR_LABEL: Record<string, string> = { sube: '▲ sube', baja: '▼ baja', neutral: '= neutral' }

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const n = await obtenerNoticiaPorSlug(slug)
  if (!n) return { title: 'Noticia no encontrada · EZ Trader' }
  return {
    title: `${n.titulo} · EZ Trader`,
    description: n.resumen ?? n.titulo,
    openGraph: { title: n.titulo, description: n.resumen ?? undefined, type: 'article' },
  }
}

export default async function DetalleNoticia({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const n = await obtenerNoticiaPorSlug(slug)
  if (!n) notFound()

  // Relacionadas: misma sección principal, excluyendo esta.
  const seccionPrincipal = n.secciones[0]
  const relacionadas = seccionPrincipal
    ? (await obtenerFeed({ seccion: seccionPrincipal, limit: 7 })).filter((x) => x.id !== n.id).slice(0, 3)
    : []

  const fecha = n.publicado_at
    ? new Date(n.publicado_at).toLocaleString('es-CL', {
        timeZone: 'America/Santiago', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <div className="min-h-screen bg-base text-snow">
      <HubHeader activa={seccionPrincipal} />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/hub" className="text-xs text-muted hover:text-brand">← Volver a portada</Link>

        <article className="mt-4">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {n.secciones.map((s) => (
              <Link
                key={s}
                href={`/hub/seccion/${s}`}
                className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-brand/15 text-brand hover:bg-brand/25"
              >
                {NOMBRE_SECCION[s] ?? s}
              </Link>
            ))}
            {n.geografia === 'nacional' && (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-silver/10 text-silver">Chile</span>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-snow leading-tight">{n.titulo}</h1>

          <div className="flex items-center gap-2 mt-3 text-sm text-muted">
            {n.fuente && <span>{n.fuente}</span>}
            {n.fuente && fecha && <span>·</span>}
            {fecha && <span>{fecha}</span>}
          </div>

          {n.resumen && <p className="text-lg text-snow/85 mt-5 leading-relaxed">{n.resumen}</p>}

          {/* Impacto por sección (la lectura del hub) */}
          {n.secciones_impacto.length > 0 && (
            <div className="mt-6 rounded-xl border border-line bg-panel/60 p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
                Cómo afecta a cada mercado
              </h2>
              <ul className="space-y-1.5">
                {n.secciones_impacto.map((si) => (
                  <li key={si.seccion} className="flex items-center gap-2 text-sm">
                    <span className="text-snow font-medium w-28">{NOMBRE_SECCION[si.seccion] ?? si.seccion}</span>
                    <span className="text-muted">impacto {si.impacto}</span>
                    <span className="text-silver">{DIR_LABEL[si.direccion] ?? si.direccion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <a
            href={n.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-6 text-sm text-brand hover:underline"
          >
            Leer la nota original en {n.fuente ?? 'la fuente'} ↗
          </a>
        </article>

        {relacionadas.length > 0 && (
          <section className="mt-12">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Relacionadas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relacionadas.map((r) => (
                <TarjetaNoticia key={r.id} n={r} />
              ))}
            </div>
          </section>
        )}

        <footer className="mt-12 pt-6 border-t border-line text-center">
          <p className="text-xs text-muted/60">
            Información referencial, no constituye asesoría financiera.
          </p>
        </footer>
      </main>
    </div>
  )
}
