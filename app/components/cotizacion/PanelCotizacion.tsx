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

  return (
    <div className="border-b border-gray-800 px-4 py-4">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Cotización
      </h2>

      {!actual ? (
        <p className="text-sm text-gray-600">Sin datos aún</p>
      ) : (
        <div className="flex items-end gap-3">
          <span className="text-4xl font-bold tracking-tight">
            {actual.valor.toLocaleString('es-CL', { maximumFractionDigits: 1 })}
          </span>
          <div className="mb-1">
            <span className="text-sm text-gray-500">CLP</span>
            {variacion !== null && (
              <div className={`text-sm font-medium ${subiendo ? 'text-red-400' : 'text-green-400'}`}>
                {subiendo ? '▲' : '▼'} {Math.abs(variacion).toFixed(2)}%
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
