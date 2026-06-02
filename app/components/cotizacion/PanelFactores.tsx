import { supabaseAdmin } from '@/app/lib/supabase'

const SERIES_MVP = ['COBRE', 'DXY', 'TPM', 'FED']

const DIRECCION: Record<string, { sube: string; baja: string }> = {
  COBRE: { sube: '↑ peso se fortalece', baja: '↓ peso se debilita' },
  DXY:   { sube: '↑ peso se debilita', baja: '↓ peso se fortalece' },
  TPM:   { sube: '↑ carry mejora',     baja: '↓ carry empeora' },
  FED:   { sube: '↑ peso se debilita', baja: '↓ peso se fortalece' },
}

async function getFactores() {
  const { data: series } = await supabaseAdmin
    .from('series')
    .select('id, codigo, nombre, unidad')
    .in('codigo', SERIES_MVP)

  if (!series) return []

  return Promise.all(series.map(async (s) => {
    const { data } = await supabaseAdmin
      .from('datos_mercado')
      .select('valor, fecha_dato')
      .eq('serie_id', s.id)
      .order('fecha_dato', { ascending: false })
      .limit(2)

    const actual = data?.[0]
    const anterior = data?.[1]
    const variacion = actual && anterior
      ? ((actual.valor - anterior.valor) / anterior.valor) * 100
      : null

    return { ...s, valor: actual?.valor ?? null, variacion }
  }))
}

function calcularSesgo(factores: Awaited<ReturnType<typeof getFactores>>) {
  let puntaje = 0
  let total = 0
  for (const f of factores) {
    if (f.variacion === null) continue
    total++
    if (f.codigo === 'COBRE') puntaje += f.variacion > 0 ? 1 : -1
    if (f.codigo === 'DXY')   puntaje += f.variacion > 0 ? -1 : 1
    if (f.codigo === 'FED')   puntaje += f.variacion > 0 ? -1 : 1
  }
  if (total === 0) return null
  if (puntaje >= 2)  return { texto: 'Factores alineados: PESO FUERTE', color: 'text-pesoFuerte', bg: 'bg-pesoFuerte/10 border border-pesoFuerte/30' }
  if (puntaje <= -2) return { texto: 'Factores alineados: PESO DÉBIL', color: 'text-pesoDebil', bg: 'bg-pesoDebil/10 border border-pesoDebil/30' }
  return { texto: 'Factores mixtos · señal débil', color: 'text-amber-400', bg: 'bg-amber-400/10 border border-amber-400/20' }
}

export default async function PanelFactores() {
  const factores = await getFactores()
  const sesgo = calcularSesgo(factores)

  return (
    <div className="px-4 py-4">
      <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
        Factores de mercado
      </h2>

      {sesgo && (
        <div className={`${sesgo.bg} rounded-lg px-3 py-2 mb-4`}>
          <span className={`text-xs font-semibold ${sesgo.color}`}>{sesgo.texto}</span>
        </div>
      )}

      <div className="space-y-3">
        {factores.map((f) => {
          const subiendo = f.variacion !== null ? f.variacion > 0 : null
          const dir = f.variacion !== null && subiendo !== null
            ? DIRECCION[f.codigo]?.[subiendo ? 'sube' : 'baja']
            : null

          return (
            <div key={f.codigo} className="flex items-center justify-between">
              <div>
                <span className="text-sm text-silver">{f.nombre}</span>
                {dir && <p className="text-xs text-muted">{dir}</p>}
              </div>
              <div className="text-right">
                <span className="text-sm font-mono text-snow">
                  {f.valor !== null
                    ? `${f.valor.toLocaleString('es-CL', { maximumFractionDigits: 3 })} ${f.unidad ?? ''}`
                    : '—'}
                </span>
                {f.variacion !== null && (
                  <p className={`text-xs ${f.variacion > 0 ? 'text-pesoDebil' : 'text-pesoFuerte'}`}>
                    {f.variacion > 0 ? '▲' : '▼'} {Math.abs(f.variacion).toFixed(2)}%
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
