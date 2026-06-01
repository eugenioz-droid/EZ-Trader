import { Suspense } from 'react'
import { supabaseAdmin } from '@/app/lib/supabase'
import FiltroNoticias from './FiltroNoticias'

async function getNoticias(fuente?: string) {
  let query = supabaseAdmin
    .from('noticias')
    .select('id, titulo, resumen, url, publicado_at, fuentes(nombre)')
    .order('publicado_at', { ascending: false })
    .limit(50)

  if (fuente) {
    const { data: fuenteData } = await supabaseAdmin
      .from('fuentes')
      .select('id')
      .eq('nombre', fuente)
      .single()
    if (fuenteData) query = query.eq('fuente_id', fuenteData.id)
  }

  const { data } = await query
  return data ?? []
}

function tiempoRelativo(fecha: string | null): string {
  if (!fecha) return ''
  const diff = Date.now() - new Date(fecha).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 60) return `hace ${min} min`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

export default async function PanelNoticias({ fuente }: { fuente?: string }) {
  const noticias = await getNoticias(fuente)

  return (
    <div>
      <div className="sticky top-0 bg-gray-950 border-b border-gray-800 px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-300">Noticias</h2>
          <span className="text-xs text-gray-600">{noticias.length} artículos</span>
        </div>
        <Suspense fallback={null}>
          <FiltroNoticias />
        </Suspense>
      </div>

      <div className="divide-y divide-gray-800/50">
        {noticias.length === 0 && (
          <p className="px-4 py-8 text-sm text-gray-600 text-center">
            Sin noticias para este filtro.
          </p>
        )}
        {noticias.map((n) => (
          <a
            key={n.id}
            href={n.url ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-3 hover:bg-gray-900 transition-colors group"
          >
            <p className="text-sm text-gray-200 group-hover:text-white leading-snug line-clamp-2">
              {n.titulo}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-600">
                {(n.fuentes as unknown as { nombre: string } | null)?.nombre ?? 'Fuente'}
              </span>
              <span className="text-gray-700">·</span>
              <span className="text-xs text-gray-600">{tiempoRelativo(n.publicado_at)}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
