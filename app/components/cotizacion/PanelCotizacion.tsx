import { supabaseAdmin } from '@/app/lib/supabase'

async function getCotizacion() {
  const { data: serie } = await supabaseAdmin
    .from('series')
    .select('id')
    .eq('codigo', 'USDCLP')
    .single()

  if (!serie) return null

  const { data } = await supabaseAdmin
    .from('datos_mercado')
    .select('valor, fecha_dato')
    .eq('serie_id', serie.id)
    .order('fecha_dato', { ascending: false })
    .limit(2)

  return data ?? []
}

export default async function PanelCotizacion() {
  const datos = await getCotizacion()
  const actual = datos?.[0]
  const anterior = datos?.[1]

  const variacion = actual && anterior
    ? ((actual.valor - anterior.valor) / anterior.valor) * 100
    : null

  const subiendo = variacion !== null ? variacion > 0 : null

  const horaActualizacion = actual?.fecha_dato
    ? new Date(actual.fecha_dato).toLocaleTimeString('es-CL', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago'
      })
    : null

  return (
    <div className="border-b border-line px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
          Cotización
        </h2>
        {horaActualizacion && (
          <span className="text-xs text-muted">Actualizado {horaActualizacion} (Santiago)</span>
        )}
      </div>

      {!actual ? (
        <p className="text-sm text-muted">Sin datos aún</p>
      ) : (
        <div className="flex items-end gap-3">
          <span className="text-4xl font-bold tracking-tight text-snow">
            {actual.valor.toLocaleString('es-CL', { maximumFractionDigits: 1 })}
          </span>
          <div className="mb-1">
            <span className="text-sm text-muted">CLP</span>
            {variacion !== null && (
              <div className={`text-sm font-medium ${subiendo ? 'text-pesoDebil' : 'text-pesoFuerte'}`}>
                {subiendo ? '▲' : '▼'} {Math.abs(variacion).toFixed(2)}%
              </div>
            )}
          </div>
        </div>
      )}
      {actual && (
        <p className="text-[10px] text-muted/50 mt-2" title="Precio de referencia de mercado, con leve retraso. Tu bróker puede mostrar un valor distinto por spread/feed.">
          Precio de referencia · puede diferir de tu bróker
        </p>
      )}
    </div>
  )
}
