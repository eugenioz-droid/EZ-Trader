import { supabaseAdmin } from './supabase'

// Configuración de cada factor: cómo se llama y cómo su dirección afecta al peso.
// 'sube_peso' = qué le pasa al peso cuando el factor SUBE.
const FACTORES_CONFIG: Record<string, { sube_peso: 'fuerte' | 'debil' }> = {
  COBRE: { sube_peso: 'fuerte' }, // cobre sube → más dólares al país → peso fuerte
  DXY: { sube_peso: 'debil' }, // dólar global sube → peso débil
  TPM: { sube_peso: 'fuerte' }, // Chile sube tasa → mejor carry → peso fuerte
  FED: { sube_peso: 'debil' }, // Fed sube tasa → dólar atractivo → peso débil
}

// Estado de frescura de un factor (robustez: caza fuentes congeladas).
export type Frescura = 'fresca' | 'rezagada' | 'sin_dato'

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
  frescura?: Frescura // estado de actualización (relativo al latido USD/CLP)
  fecha_dato_ms?: number | null // epoch de la última actualización (para "hace X")
  esDiferencial?: boolean // fila especial: diferencial de tasas (valor en pp)
  componentes?: { tpm: number | null; fed: number | null } // para la fila de diferencial
}

const DIA_MS = 24 * 3600 * 1000

// Umbrales de frescura
const REZAGO_INTRADIA_MS = 30 * 60 * 1000 // factor intradía rezagado vs latido
const HEARTBEAT_QUIETO_MS = 30 * 60 * 1000 // si el latido mismo está viejo → mercado quieto/cerrado
const REZAGO_DIARIO_MS = 3 * DIA_MS // series diarias (TPM/FED): rezagada si >3 días sin dato

// Valor más reciente en o antes de un instante dado (para comparar ventanas).
// Devuelve también la fecha del punto encontrado: con mercado cerrado (fin de
// semana) el punto "más cercano" puede ser de varios días atrás, y eso cambia
// el significado de la variación. Quien llame decide si la tolera o la marca.
async function valorEnOAntes(
  serieId: number,
  instante: number,
): Promise<{ valor: number; fechaMs: number } | null> {
  const { data } = await supabaseAdmin
    .from('datos_mercado')
    .select('valor, fecha_dato')
    .eq('serie_id', serieId)
    .lte('fecha_dato', new Date(instante).toISOString())
    .order('fecha_dato', { ascending: false })
    .limit(1)
    .single()
  if (!data) return null
  return { valor: data.valor, fechaMs: new Date(data.fecha_dato).getTime() }
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

// Primer valor de la última jornada con datos (la "apertura" de la sesión vigente).
// Toma el día calendario UTC del punto más reciente y devuelve el primer valor de
// ese día. Si la serie viene de un gap (ej. lunes tras fin de semana), la sesión es
// la del lunes, no la del viernes → la variación refleja el movimiento de hoy.
function primerPuntoUltimaSesion(puntos: { valor: number; fecha_dato: string }[]): number | null {
  if (puntos.length === 0) return null
  const ultimoDia = puntos[puntos.length - 1].fecha_dato.slice(0, 10) // YYYY-MM-DD (UTC)
  const deHoy = puntos.filter((p) => p.fecha_dato.slice(0, 10) === ultimoDia)
  return deHoy.length ? deHoy[0].valor : puntos[puntos.length - 1].valor
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
      // Últimos 2 puntos: el actual y el cierre inmediatamente anterior.
      const { data: ultimos } = await supabaseAdmin
        .from('datos_mercado')
        .select('valor, fecha_dato')
        .eq('serie_id', s.id)
        .order('fecha_dato', { ascending: false })
        .limit(2)

      const ultimo = ultimos?.[0]
      const valor = ultimo?.valor ?? null

      // Ventanas de comparación de respaldo (~1d y ~7d). Pueden caer en un gap
      // de fin de semana y traer un punto más viejo; por eso guardamos su fecha.
      // sparkRows trae todos los puntos de los últimos 7d (ascendente).
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

      // var1d/var1sem solo si el punto de referencia está dentro de una tolerancia
      // de su ventana. Con el gap de fin de semana, "hace 1d" puede traer un punto
      // de hace 3-4 días: en ese caso NO mostramos un "1d" que mentiría (queda null).
      const TOL_1D = 1.5 * DIA_MS // acepta hasta 1.5 días de antigüedad para "1d"
      const TOL_1SEM = 9 * DIA_MS // acepta hasta 9 días para "1 semana"
      const ref1dOk = hace1d !== null && Math.abs(ahora - DIA_MS - hace1d.fechaMs) <= TOL_1D
      const ref1semOk = hace1sem !== null && Math.abs(ahora - 7 * DIA_MS - hace1sem.fechaMs) <= TOL_1SEM
      const var1d = ref1dOk ? variacionPct(valor, hace1d!.valor) : null
      const var1sem = ref1semOk ? variacionPct(valor, hace1sem!.valor) : null

      // Movimiento MÁS RECIENTE = cómo va la sesión actual: valor de ahora vs el
      // primer punto de la última jornada con datos. Es lo que ve el usuario en
      // el gráfico ("hoy el dólar bajó"), no depende de "hace exactamente 24h"
      // (se distorsiona con el gap de fin de semana) ni del micro-tick de 5 min
      // (parpadearía). Define la sesión como los puntos del último día calendario
      // con datos.
      const puntos = sparkRows.data ?? []
      const aperturaSesion = primerPuntoUltimaSesion(puntos)
      const varReciente = variacionPct(valor, aperturaSesion)

      // Sparkline: downsample a ~24 puntos
      const todos = puntos.map((r) => r.valor)
      const paso = Math.max(1, Math.ceil(todos.length / 24))
      const sparkline = todos.filter((_, i) => i % paso === 0)

      // Señal: prioriza el movimiento más reciente (lo que el usuario ve). Si no
      // hay un punto previo (serie con 1 solo dato), cae a 1d y luego a 7d.
      const tendencia = varReciente ?? var1d ?? var1sem
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

  // Fecha del diferencial = la más reciente de sus componentes (serie diaria).
  const ultMs = Math.max(
    tpmPts.length ? tpmPts[tpmPts.length - 1].t : 0,
    fedPts.length ? fedPts[fedPts.length - 1].t : 0,
  )

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
    fecha_dato: ultMs > 0 ? new Date(ultMs).toISOString() : null,
    var1d: null,
    var1sem: null,
    sparkline: sparkDown,
    senal,
    esDiferencial: true,
    componentes: { tpm: tpmAhora, fed: fedAhora },
  }
}

// Latido del sistema: última actualización de USD/CLP (Twelve Data, la fuente más
// confiable y de mayor cadencia). Sirve de referencia para detectar fuentes congeladas.
async function getHeartbeat(): Promise<number | null> {
  const { data: s } = await supabaseAdmin.from('series').select('id').eq('codigo', 'USDCLP').single()
  if (!s) return null
  const { data } = await supabaseAdmin
    .from('datos_mercado')
    .select('fecha_dato')
    .eq('serie_id', s.id)
    .order('fecha_dato', { ascending: false })
    .limit(1)
    .single()
  return data?.fecha_dato ? new Date(data.fecha_dato).getTime() : null
}

// Frescura RELATIVA: un factor está "rezagado" solo si se quedó atrás mientras el
// latido sigue vivo (fuente congelada). Si el latido mismo está viejo, el mercado
// está cerrado/quieto y no marcamos nada como roto.
function calcularFrescura(f: FactorDato, heartbeatMs: number | null, mercadoActivo: boolean): Frescura {
  if (f.fecha_dato === null) return f.valor !== null ? 'fresca' : 'sin_dato'
  const fMs = new Date(f.fecha_dato).getTime()

  if (f.esDiferencial) {
    // Serie diaria (TPM/FED): rezagada solo si lleva varios días sin dato.
    return Date.now() - fMs > REZAGO_DIARIO_MS ? 'rezagada' : 'fresca'
  }

  // Intradía: solo evaluamos rezago si el mercado está activo (latido reciente).
  if (!mercadoActivo || heartbeatMs === null) return 'fresca'
  return heartbeatMs - fMs > REZAGO_INTRADIA_MS ? 'rezagada' : 'fresca'
}

export interface FactoresPanel {
  factores: FactorDato[]
  mercadoActivo: boolean // false = latido viejo → mercado cerrado/quieto (no alarmar)
}

// Panel completo de factores Tier 1: Cobre, DXY, Diferencial de tasas + frescura.
export async function getFactoresPanel(): Promise<FactoresPanel> {
  const [mercado, diferencial, heartbeatMs] = await Promise.all([
    getFactoresDetalle(['COBRE', 'DXY']),
    getDiferencialTasas(),
    getHeartbeat(),
  ])
  const factores = [...mercado, diferencial]

  const mercadoActivo = heartbeatMs !== null && Date.now() - heartbeatMs <= HEARTBEAT_QUIETO_MS

  for (const f of factores) {
    f.frescura = calcularFrescura(f, heartbeatMs, mercadoActivo)
    f.fecha_dato_ms = f.fecha_dato ? new Date(f.fecha_dato).getTime() : null
  }

  return { factores, mercadoActivo }
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
