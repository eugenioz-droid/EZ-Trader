import { supabaseAdmin } from './supabase'

// Configuración de cada factor: cómo se llama y cómo su dirección afecta al peso.
// 'sube_peso' = qué le pasa al peso cuando el factor SUBE.
const FACTORES_CONFIG: Record<string, { sube_peso: 'fuerte' | 'debil' }> = {
  COBRE: { sube_peso: 'fuerte' }, // cobre sube → más dólares al país → peso fuerte
  DXY: { sube_peso: 'debil' }, // dólar global sube → peso débil
  TPM: { sube_peso: 'fuerte' }, // Chile sube tasa → mejor carry → peso fuerte
  FED: { sube_peso: 'debil' }, // Fed sube tasa → dólar atractivo → peso débil
}

export interface FactorDato {
  codigo: string
  nombre: string
  unidad: string | null
  valor: number | null
  fecha_dato: string | null
  var1d: number | null // % cambio vs ~24h atrás
  var1sem: number | null // % cambio vs ~7d atrás
  sparkline: number[] // puntos para mini-gráfico (cronológico)
  senal: 'fuerte' | 'debil' | null // contribución actual al peso
  esDiferencial?: boolean // fila especial: diferencial de tasas (valor en pp)
  componentes?: { tpm: number | null; fed: number | null } // para la fila de diferencial
}

const DIA_MS = 24 * 3600 * 1000

// Valor más reciente en o antes de un instante dado (para comparar ventanas).
async function valorEnOAntes(serieId: number, instante: number): Promise<number | null> {
  const { data } = await supabaseAdmin
    .from('datos_mercado')
    .select('valor')
    .eq('serie_id', serieId)
    .lte('fecha_dato', new Date(instante).toISOString())
    .order('fecha_dato', { ascending: false })
    .limit(1)
    .single()
  return data?.valor ?? null
}

function variacionPct(actual: number | null, pasado: number | null): number | null {
  if (actual === null || pasado === null || pasado === 0) return null
  return ((actual - pasado) / pasado) * 100
}

// Determina la contribución del factor al peso según su tendencia reciente.
function calcularSenal(codigo: string, tendencia: number | null): 'fuerte' | 'debil' | null {
  if (tendencia === null || tendencia === 0) return null
  const cfg = FACTORES_CONFIG[codigo]
  if (!cfg) return null
  const subiendo = tendencia > 0
  // Si sube y "sube_peso=fuerte" → peso fuerte. Si baja, se invierte.
  if (subiendo) return cfg.sube_peso
  return cfg.sube_peso === 'fuerte' ? 'debil' : 'fuerte'
}

export async function getFactoresDetalle(codigos: string[]): Promise<FactorDato[]> {
  const { data: series } = await supabaseAdmin
    .from('series')
    .select('id, codigo, nombre, unidad')
    .in('codigo', codigos)

  if (!series) return []

  const ahora = Date.now()
  const desdeSparkline = new Date(ahora - 7 * DIA_MS).toISOString()

  return Promise.all(
    series.map(async (s) => {
      // Último valor
      const { data: ultimo } = await supabaseAdmin
        .from('datos_mercado')
        .select('valor, fecha_dato')
        .eq('serie_id', s.id)
        .order('fecha_dato', { ascending: false })
        .limit(1)
        .single()

      const valor = ultimo?.valor ?? null

      // Ventanas de comparación
      const [hace1d, hace1sem, sparkRows] = await Promise.all([
        valorEnOAntes(s.id, ahora - DIA_MS),
        valorEnOAntes(s.id, ahora - 7 * DIA_MS),
        supabaseAdmin
          .from('datos_mercado')
          .select('valor, fecha_dato')
          .eq('serie_id', s.id)
          .gte('fecha_dato', desdeSparkline)
          .order('fecha_dato', { ascending: true }),
      ])

      const var1d = variacionPct(valor, hace1d)
      const var1sem = variacionPct(valor, hace1sem)

      // Sparkline: downsample a ~24 puntos
      const todos = (sparkRows.data ?? []).map((r) => r.valor)
      const paso = Math.max(1, Math.ceil(todos.length / 24))
      const sparkline = todos.filter((_, i) => i % paso === 0)

      // Señal: usa la tendencia semanal si existe, si no la diaria
      const tendencia = var1sem ?? var1d
      const senal = calcularSenal(s.codigo, tendencia)

      return {
        codigo: s.codigo,
        nombre: s.nombre,
        unidad: s.unidad,
        valor,
        fecha_dato: ultimo?.fecha_dato ?? null,
        var1d,
        var1sem,
        sparkline,
        senal,
      }
    })
  )
}

// Serie completa (puntos) de una serie por código, últimos N días.
async function serieReciente(codigo: string, dias: number): Promise<{ t: number; v: number }[]> {
  const { data: s } = await supabaseAdmin.from('series').select('id').eq('codigo', codigo).single()
  if (!s) return []
  const desde = new Date(Date.now() - dias * DIA_MS).toISOString()
  const { data } = await supabaseAdmin
    .from('datos_mercado')
    .select('valor, fecha_dato')
    .eq('serie_id', s.id)
    .gte('fecha_dato', desde)
    .order('fecha_dato', { ascending: true })
  return (data ?? []).map((p) => ({ t: new Date(p.fecha_dato).getTime(), v: p.valor }))
}

function ultimoEnOAntes(puntos: { t: number; v: number }[], instante: number): number | null {
  let val: number | null = null
  for (const p of puntos) {
    if (p.t <= instante) val = p.v
    else break
  }
  return val
}

// Diferencial de tasas Chile−Fed (carry). Factor Tier 1 compuesto.
export async function getDiferencialTasas(): Promise<FactorDato> {
  const ahora = Date.now()
  const [tpmPts, fedPts] = await Promise.all([
    serieReciente('TPM', 60),
    serieReciente('FED', 60),
  ])

  const tpmAhora = tpmPts.length ? tpmPts[tpmPts.length - 1].v : null
  const fedAhora = fedPts.length ? fedPts[fedPts.length - 1].v : null
  const diff = tpmAhora !== null && fedAhora !== null ? tpmAhora - fedAhora : null

  // Tendencia: diferencial ahora vs ~30 días atrás
  const tpm30 = ultimoEnOAntes(tpmPts, ahora - 30 * DIA_MS)
  const fed30 = ultimoEnOAntes(fedPts, ahora - 30 * DIA_MS)
  const diff30 = tpm30 !== null && fed30 !== null ? tpm30 - fed30 : null
  const tendencia = diff !== null && diff30 !== null ? diff - diff30 : null

  // Sparkline del diferencial: por cada punto de Fed, TPM vigente − Fed
  const sparkline = fedPts.map((f) => {
    const tpmEn = ultimoEnOAntes(tpmPts, f.t) ?? tpmAhora ?? 0
    return tpmEn - f.v
  })
  const paso = Math.max(1, Math.ceil(sparkline.length / 24))
  const sparkDown = sparkline.filter((_, i) => i % paso === 0)

  // Señal: diferencial a favor de Chile y/o ampliándose → peso fuerte
  let senal: 'fuerte' | 'debil' | null = null
  if (diff !== null) {
    if (tendencia !== null && Math.abs(tendencia) >= 0.1) {
      senal = tendencia > 0 ? 'fuerte' : 'debil'
    } else {
      senal = diff >= 0 ? 'fuerte' : 'debil'
    }
  }

  return {
    codigo: 'DIFERENCIAL',
    nombre: 'Diferencial tasas',
    unidad: 'pp',
    valor: diff,
    fecha_dato: null,
    var1d: null,
    var1sem: null,
    sparkline: sparkDown,
    senal,
    esDiferencial: true,
    componentes: { tpm: tpmAhora, fed: fedAhora },
  }
}

// Panel completo de factores Tier 1: Cobre, DXY, Diferencial de tasas.
export async function getFactoresPanel(): Promise<FactorDato[]> {
  const [mercado, diferencial] = await Promise.all([
    getFactoresDetalle(['COBRE', 'DXY']),
    getDiferencialTasas(),
  ])
  // Orden: Cobre, DXY (como vengan), luego diferencial.
  return [...mercado, diferencial]
}

// Sesgo agregado de los factores Tier 1 (para el badge de alineación).
export function calcularSesgoAlineacion(factores: FactorDato[]) {
  let puntaje = 0
  let total = 0
  for (const f of factores) {
    if (f.senal === null) continue
    total++
    puntaje += f.senal === 'fuerte' ? 1 : -1
  }
  if (total === 0) return null
  if (puntaje >= 2)
    return {
      texto: 'Factores alineados: PESO FUERTE',
      color: 'text-pesoFuerte',
      bg: 'bg-pesoFuerte/10 border border-pesoFuerte/30',
    }
  if (puntaje <= -2)
    return {
      texto: 'Factores alineados: PESO DÉBIL',
      color: 'text-pesoDebil',
      bg: 'bg-pesoDebil/10 border border-pesoDebil/30',
    }
  return {
    texto: 'Factores mixtos · señal débil',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10 border border-amber-400/20',
  }
}
