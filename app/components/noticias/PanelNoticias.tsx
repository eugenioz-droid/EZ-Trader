import { Suspense } from 'react'
import { supabaseAdmin } from '@/app/lib/supabase'
import FiltroNoticias from './FiltroNoticias'

// Códigos de factor → etiqueta corta para el badge
const FACTOR_LABEL: Record<string, string> = {
  A1: 'Cobre', A2: 'DXY', A3: 'Tasas', A4: 'Petróleo',
  A5: 'VIX', B1: 'China', B2: 'Fed', B3: 'Geopolítica',
  B4: 'BCCh', B5: 'Política', B6: 'IPC',
}

interface Analisis {
  impacto: 'alto' | 'medio' | 'bajo' | null
  direccion_estimada: 'sube' | 'baja' | 'neutral' | null
  factor_codigo: string | null
  resumen_ia: string | null
  confianza: number | null
}

interface Noticia {
  id: number
  titulo: string
  resumen: string | null
  url: string | null
  publicado_at: string | null
  fuentes: { nombre: string } | null
  analisis: Analisis | null
}

async function getNoticias(fuente?: string, impacto?: string): Promise<Noticia[]> {
  // Traemos noticias + su analisis_ia más reciente (LEFT JOIN vía select anidado)
  let query = supabaseAdmin
    .from('noticias')
    .select(`
      id, titulo, resumen, url, publicado_at,
      fuentes ( nombre ),
      analisis_ia ( impacto, direccion_estimada, resumen_ia, confianza, factor_id,
        factores ( codigo )
      )
    `)
    .order('publicado_at', { ascending: false })
    .limit(50)

  if (fuente) {
    const { data: fuenteData } = await supabaseAdmin
      .from('fuentes').select('id').eq('nombre', fuente).single()
    if (fuenteData) query = query.eq('fuente_id', fuenteData.id)
  }

  const { data } = await query

  // Aplanar el analisis_ia (Supabase devuelve array aunque sea 1-N)
  const noticias: Noticia[] = (data ?? []).map((n) => {
    const arr = n.analisis_ia as unknown as Array<{
      impacto: string; direccion_estimada: string; resumen_ia: string;
      confianza: number | null; factor_id: number | null; factores: { codigo: string } | null
    }>
    const a = arr?.[0] ?? null
    return {
      id: n.id,
      titulo: n.titulo,
      resumen: n.resumen,
      url: n.url,
      publicado_at: n.publicado_at,
      fuentes: (n.fuentes as unknown as { nombre: string } | null),
      analisis: a
        ? {
            impacto: a.impacto as Analisis['impacto'],
            direccion_estimada: a.direccion_estimada as Analisis['direccion_estimada'],
            factor_codigo: a.factores?.codigo ?? null,
            resumen_ia: a.resumen_ia,
            confianza: a.confianza ?? null,
          }
        : null,
    }
  })

  // Filtro por impacto (client-side sobre resultado ya limitado)
  if (impacto) return noticias.filter((n) => n.analisis?.impacto === impacto)
  return noticias
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

const IMPACTO_STYLE = {
  alto: 'bg-pesoDebil/15 text-pesoDebil border border-pesoDebil/30',
  medio: 'bg-amber-400/15 text-amber-400 border border-amber-400/30',
  bajo: 'bg-line text-muted border border-line',
}

const DIRECCION_ICON: Record<string, string> = {
  sube: '↑', baja: '↓', neutral: '→',
}

export default async function PanelNoticias({
  fuente,
  impacto,
}: {
  fuente?: string
  impacto?: string
}) {
  const noticias = await getNoticias(fuente, impacto)
  const conAnalisis = noticias.filter((n) => n.analisis).length

  return (
    <div>
      <div className="sticky top-0 bg-panel border-b border-line px-4 py-3 space-y-2 z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-silver">Noticias</h2>
          <span className="text-xs text-muted">
            {noticias.length} artículos
            {conAnalisis > 0 && (
              <span className="text-brand ml-1">· {conAnalisis} analizadas</span>
            )}
          </span>
        </div>
        <Suspense fallback={null}>
          <FiltroNoticias />
        </Suspense>
      </div>

      <div className="divide-y divide-line/60">
        {noticias.length === 0 && (
          <div className="px-4 py-8 text-center space-y-1">
            <p className="text-sm text-muted">Sin noticias para este filtro.</p>
            {impacto && (
              <p className="text-xs text-muted/60">
                Haiku clasifica las noticias cada 5 min. Si es la primera vez,
                espera el próximo ciclo del cron.
              </p>
            )}
          </div>
        )}
        {noticias.map((n) => {
          const min = minutosDesde(n.publicado_at)
          const reciente = min !== null && min < 60
          const a = n.analisis
          const factorLabel = a?.factor_codigo ? FACTOR_LABEL[a.factor_codigo] : null

          return (
            <a
              key={n.id}
              href={n.url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className={`block px-4 py-3 hover:bg-elevated transition-colors group ${
                a?.impacto === 'alto'
                  ? 'border-l-2 border-pesoDebil'
                  : reciente
                  ? 'border-l-2 border-brand'
                  : 'border-l-2 border-transparent'
              }`}
            >
              {/* Título */}
              <p className="text-sm text-silver group-hover:text-snow leading-snug line-clamp-2">
                {n.titulo}
              </p>

              {/* Resumen de la IA (si existe) */}
              {a?.resumen_ia && (
                <p className="text-xs text-muted/80 mt-1 leading-snug line-clamp-1 italic">
                  {a.resumen_ia}
                </p>
              )}

              {/* Meta-fila */}
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {/* Badge de impacto */}
                {a?.impacto && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${IMPACTO_STYLE[a.impacto]}`}>
                    {a.impacto.toUpperCase()}
                  </span>
                )}
                {/* Confianza IA — solo visible cuando hay motivo para dudar (<85%) */}
                {a?.confianza !== null && a?.confianza !== undefined && a.confianza < 0.85 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${
                    a.confianza >= 0.65
                      ? 'text-amber-400 border-amber-700/40 bg-amber-900/10'
                      : 'text-muted border-line bg-elevated'
                  }`}
                    title={`Confianza IA: ${Math.round(a.confianza * 100)}%. ${a.confianza < 0.65 ? 'Clasificación incierta, verifica.' : 'Moderada, usa tu criterio.'}`}
                  >
                    IA {Math.round(a.confianza * 100)}%
                  </span>
                )}
                {/* Factor + dirección */}
                {factorLabel && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-elevated text-muted border border-line/60">
                    {factorLabel}
                    {a?.direccion_estimada && a.direccion_estimada !== 'neutral' && (
                      <span className={a.direccion_estimada === 'sube' ? ' text-pesoDebil' : ' text-pesoFuerte'}>
                        {' '}{DIRECCION_ICON[a.direccion_estimada]} USD/CLP
                      </span>
                    )}
                  </span>
                )}
                {/* Separador */}
                {(a?.impacto || factorLabel) && <span className="text-line text-[10px]">·</span>}
                {/* Fuente */}
                <span className="text-xs text-muted">
                  {n.fuentes?.nombre ?? 'Fuente'}
                </span>
                <span className="text-line">·</span>
                {/* Tiempo */}
                <span className={`text-xs ${reciente ? 'text-brand font-medium' : 'text-muted'}`}>
                  {tiempoRelativo(min)}
                </span>
                {reciente && <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />}
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
