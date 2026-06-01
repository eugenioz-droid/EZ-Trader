import { supabaseAdmin } from '@/app/lib/supabase'

async function getNoticias() {
  const { data } = await supabaseAdmin
    .from('noticias')
    .select('id, titulo, resumen, url, publicado_at, fuentes(nombre)')
    .order('publicado_at', { ascending: false })
    .limit(40)
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

export default async function PanelNoticias() {
  const noticias = await getNoticias()

  return (
    <div>
      <div className="sticky top-0 bg-gray-950 border-b border-gray-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-300">Noticias</h2>
        <p className="text-xs text-gray-600">{noticias.length} artículos</p>
      </div>

      <div className="divide-y divide-gray-800/50">
        {noticias.length === 0 && (
          <p className="px-4 py-8 text-sm text-gray-600 text-center">
            Sin noticias aún — el cron las traerá en minutos.
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
