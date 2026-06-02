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

function minutosDesde(fecha: string | null): number | null {
  if (!fecha) return null
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 60000)
}

function tiempoRelativo(min: number | null): string {
  if (min === null) return ''
  if (min < 60) return `hace ${min} min`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

export default async function PanelNoticias({ fuente }: { fuente?: string }) {
  const noticias = await getNoticias(fuente)

  return (
    <div>
      <div className="sticky top-0 bg-panel border-b border-line px-4 py-3 space-y-2 z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-silver">Noticias</h2>
          <span className="text-xs text-muted">{noticias.length} artículos</span>
        </div>
        <Suspense fallback={null}>
          <FiltroNoticias />
        </Suspense>
      </div>

      <div className="divide-y divide-line/60">
        {noticias.length === 0 && (
          <p className="px-4 py-8 text-sm text-muted text-center">
            Sin noticias para este filtro.
          </p>
        )}
        {noticias.map((n) => {
          const min = minutosDesde(n.publicado_at)
          const reciente = min !== null && min < 60
          return (
            <a
              key={n.id}
              href={n.url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className={`block px-4 py-3 hover:bg-elevated transition-colors group ${reciente ? 'border-l-2 border-brand' : 'border-l-2 border-transparent'}`}
            >
              <p className="text-sm text-silver group-hover:text-snow leading-snug line-clamp-2">
                {n.titulo}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {reciente && <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse"></span>}
                <span className="text-xs text-muted">
                  {(n.fuentes as unknown as { nombre: string } | null)?.nombre ?? 'Fuente'}
                </span>
                <span className="text-line">·</span>
                <span className={`text-xs ${reciente ? 'text-brand font-medium' : 'text-muted'}`}>
                  {tiempoRelativo(min)}
                </span>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
