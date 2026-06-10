import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import HubHeader from '../../componentes/HubHeader'
import TarjetaNoticia from '../../componentes/TarjetaNoticia'
import { obtenerFeed, obtenerSecciones } from '@/app/lib/feed'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ codigo: string }>
}): Promise<Metadata> {
  const { codigo } = await params
  const secciones = await obtenerSecciones()
  const sec = secciones.find((s) => s.codigo === codigo)
  if (!sec) return { title: 'Sección no encontrada · EZ Trader' }
  return {
    title: `${sec.nombre} · Noticias · EZ Trader`,
    description: sec.descripcion ?? `Noticias de ${sec.nombre} clasificadas con IA.`,
  }
}

export default async function PaginaSeccion({
  params,
}: {
  params: Promise<{ codigo: string }>
}) {
  const { codigo } = await params
  const secciones = await obtenerSecciones()
  const sec = secciones.find((s) => s.codigo === codigo)
  if (!sec) notFound()

  const noticias = await obtenerFeed({ seccion: codigo, limit: 40 })

  return (
    <div className="min-h-screen bg-base text-snow">
      <HubHeader activa={codigo} />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-snow">{sec.nombre}</h1>
          {sec.descripcion && <p className="text-muted mt-1">{sec.descripcion}</p>}
        </div>

        {noticias.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {noticias.map((n) => (
              <TarjetaNoticia key={n.id} n={n} />
            ))}
          </div>
        ) : (
          <p className="text-muted text-sm">
            Aún no hay noticias clasificadas en esta sección. A medida que el sistema procese más
            noticias, aparecerán aquí.
          </p>
        )}
      </main>
    </div>
  )
}
