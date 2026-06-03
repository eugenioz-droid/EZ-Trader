import { getFactoresPanel, calcularSesgoAlineacion, type FactorDato } from '@/app/lib/factores'

function tiempoRelativo(ms: number | null | undefined): string {
  if (!ms) return ''
  const min = Math.floor((Date.now() - ms) / 60000)
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min}m`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

// Indicador de frescura: punto verde si OK, ámbar + "rezagado" si una fuente se congeló.
function FrescuraDot({ f }: { f: FactorDato }) {
  if (f.frescura === 'rezagada') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] text-amber-400"
        title={`Fuente desactualizada (${tiempoRelativo(f.fecha_dato_ms)}). Las demás siguen actualizándose.`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
        ⚠ {tiempoRelativo(f.fecha_dato_ms)}
      </span>
    )
  }
  if (f.frescura === 'sin_dato') {
    return <span className="h-1.5 w-1.5 rounded-full bg-muted/40 inline-block" title="Sin datos" />
  }
  return (
    <span
      className="h-1.5 w-1.5 rounded-full bg-pesoFuerte/60 inline-block"
      title={`Actualizado ${tiempoRelativo(f.fecha_dato_ms)}`}
    />
  )
}

// Mini-gráfico SVG estático (server-rendered). Color según la señal de peso.
function Sparkline({ puntos, color }: { puntos: number[]; color: string }) {
  if (puntos.length < 2) {
    return <div className="h-6 w-full" />
  }
  const min = Math.min(...puntos)
  const max = Math.max(...puntos)
  const rango = max - min || 1
  const W = 60
  const H = 22
  const coords = puntos
    .map((v, i) => {
      const x = (i / (puntos.length - 1)) * W
      const y = (1 - (v - min) / rango) * H
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-6 w-full" preserveAspectRatio="none">
      <polyline
        points={coords}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

// Celda de variación: flecha neutra + % (sin color de peso, para no confundir).
function Variacion({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-muted/50 text-xs">—</span>
  const signo = pct > 0 ? '▲' : pct < 0 ? '▼' : '='
  return (
    <span className="text-xs font-mono text-silver">
      {signo} {Math.abs(pct).toFixed(2)}%
    </span>
  )
}

function SenalPill({ senal }: { senal: FactorDato['senal'] }) {
  if (senal === null) {
    return <span className="text-muted/50 text-[11px]">sin dato</span>
  }
  const esFuerte = senal === 'fuerte'
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
        esFuerte
          ? 'bg-pesoFuerte/15 text-pesoFuerte'
          : 'bg-pesoDebil/15 text-pesoDebil'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${esFuerte ? 'bg-pesoFuerte' : 'bg-pesoDebil'}`} />
      Peso {esFuerte ? 'fuerte' : 'débil'}
    </span>
  )
}

export default async function PanelFactores() {
  const { factores, mercadoActivo } = await getFactoresPanel()
  // Badge de alineación: los 3 Tier 1 (cobre, DXY, diferencial de tasas).
  const sesgo = calcularSesgoAlineacion(factores)
  const hayRezago = factores.some((f) => f.frescura === 'rezagada')

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
          Factores de mercado
        </h2>
        {mercadoActivo ? (
          <span className="text-[10px] text-muted/60">vs. ayer / vs. semana</span>
        ) : (
          <span className="text-[10px] text-muted/60" title="El USD/CLP no se está actualizando: mercado cerrado o cron detenido.">
            ● mercado cerrado
          </span>
        )}
      </div>

      {hayRezago && mercadoActivo && (
        <div className="bg-amber-400/10 border border-amber-400/30 rounded-lg px-3 py-1.5 mb-3 text-[11px] text-amber-300">
          ⚠ Una fuente de datos está rezagada mientras las demás siguen. Revisa el factor marcado.
        </div>
      )}

      {sesgo && (
        <div className={`${sesgo.bg} rounded-lg px-3 py-2 mb-4`}>
          <span className={`text-xs font-semibold ${sesgo.color}`}>{sesgo.texto}</span>
        </div>
      )}

      {/* Encabezado de columnas */}
      <div className="grid grid-cols-[1fr_60px_auto] gap-x-3 items-center px-1 mb-2 text-[10px] uppercase tracking-wider text-muted/60">
        <span>Factor</span>
        <span className="text-center">7 días</span>
        <span className="text-right">Último</span>
      </div>

      <div className="space-y-2">
        {factores.map((f) => {
          const colorSpark =
            f.senal === 'fuerte' ? '#16C784' : f.senal === 'debil' ? '#F6465D' : '#475569'
          return (
            <div
              key={f.codigo}
              className="grid grid-cols-[1fr_60px_auto] gap-x-3 items-center bg-panel/60 hover:bg-elevated rounded-lg px-3 py-2 border border-line/60"
            >
              {/* Col 1: nombre + señal */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <FrescuraDot f={f} />
                  <span className="text-sm text-silver truncate">{f.nombre}</span>
                </div>
                {f.esDiferencial && f.componentes && (
                  <div className="text-[10px] text-muted/70 mt-0.5">
                    Chile {f.componentes.tpm !== null ? f.componentes.tpm.toFixed(2) + '%' : '—'} · Fed{' '}
                    {f.componentes.fed !== null ? f.componentes.fed.toFixed(2) + '%' : '—'}
                  </div>
                )}
                <div className="mt-1">
                  <SenalPill senal={f.senal} />
                </div>
              </div>

              {/* Col 2: sparkline */}
              <Sparkline puntos={f.sparkline} color={colorSpark} />

              {/* Col 3: valor + variaciones */}
              <div className="text-right">
                <div className="text-sm font-mono text-snow">
                  {f.valor !== null
                    ? f.esDiferencial
                      ? `${f.valor >= 0 ? '+' : ''}${f.valor.toFixed(2)} pp`
                      : `${f.valor.toLocaleString('es-CL', { maximumFractionDigits: 3 })}${f.unidad ? ' ' + f.unidad : ''}`
                    : '—'}
                </div>
                {f.esDiferencial ? (
                  <div className="text-[10px] text-muted/60 mt-0.5">
                    {f.valor !== null && f.valor >= 0 ? 'carry a favor del peso' : 'carry en contra'}
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-2 mt-0.5">
                    <span className="text-[9px] text-muted/50">1d</span>
                    <Variacion pct={f.var1d} />
                    <span className="text-[9px] text-muted/50 ml-1">1s</span>
                    <Variacion pct={f.var1sem} />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-[10px] text-muted/50 mt-3 leading-relaxed">
        La señal indica hacia dónde empuja cada factor al peso según su tendencia. Cuando los Tier 1
        (cobre, dólar, tasas) coinciden, hay mayor convicción para una entrada.
      </p>
    </div>
  )
}
