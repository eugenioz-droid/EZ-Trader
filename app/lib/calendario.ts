// ── Calendario de catalizadores agendados ─────────────────────────────────
// Tarea 10.4.3 (calidad de señal): el BCCh NO publica RSS y su calendario sale
// como imagen, así que las fechas de RPM 2026 se curan acá como constante tipada
// (data fija, determinista, revisable en PR). La TPM numérica llega aparte por
// mindicador.cl (tarea 10.6); esto aporta lo que faltaba: ANTICIPAR el evento.
//
// El tipo `EventoCalendario` se deja genérico a propósito: la tarea 10.4.4
// (calendario económico dinámico NFP/CPI/FOMC/IPC Chile vía Finnhub/ForexFactory)
// reutilizará esta misma forma, fusionando la fuente dinámica con estos eventos
// curados de alta confianza.
//
// Fuente: BCCh, "Calendario RPM, RPF, IPoM, IEF 2026" (publicado 2025-10-07).
// La decisión de TPM se anuncia ~18:00 hora de Chile el 2º día en reuniones de
// dos días (en las de un día, ese mismo día).

export type TipoEvento = 'RPM' | 'FOMC' | 'NFP' | 'IPC_CL'

export interface EventoCalendario {
  tipo: TipoEvento
  fecha: string // ISO 'YYYY-MM-DD' del día en que se CONOCE el resultado/decisión
  hora_cl?: string // hora local de Chile aproximada de publicación
  titulo: string
  factor: string // factor de mercado que impacta
  impacto: 'alto' | 'medio'
  nota?: string
}

// `ipom = true` → reunión con Informe de Política Monetaria (proyecciones + forward
// guidance): impacto extra porque trae la trayectoria esperada de tasas.
function rpm(fecha: string, ipom: boolean): EventoCalendario {
  return {
    tipo: 'RPM',
    fecha,
    hora_cl: '18:00',
    titulo: ipom ? 'RPM Banco Central de Chile (con IPoM)' : 'RPM Banco Central de Chile',
    factor: 'diferencial de tasas (TPM)',
    impacto: 'alto',
    nota: ipom
      ? 'Reunión con IPoM: trae proyecciones y forward guidance de la trayectoria de tasas.'
      : undefined,
  }
}

// Las 8 RPM 2026 (fecha = día en que se anuncia la decisión de TPM).
export const CALENDARIO_RPM_2026: EventoCalendario[] = [
  rpm('2026-01-27', false),
  rpm('2026-03-24', true),
  rpm('2026-04-28', false),
  rpm('2026-06-16', true),
  rpm('2026-07-28', false),
  rpm('2026-09-08', true),
  rpm('2026-10-27', false),
  rpm('2026-12-15', true),
]

const TZ = 'America/Santiago'
const DIA_MS = 24 * 3600 * 1000

// 'YYYY-MM-DD' de hoy en horario de Chile (en-CA da formato ISO). Evita el
// off-by-one que aparece si comparamos contra UTC cerca de medianoche.
function hoyEnChile(now: Date): string {
  return now.toLocaleDateString('en-CA', { timeZone: TZ })
}

// Días calendario entre dos fechas ISO (positivo si `hasta` es posterior).
function diasEntre(desdeISO: string, hastaISO: string): number {
  const a = Date.parse(desdeISO + 'T00:00:00Z')
  const b = Date.parse(hastaISO + 'T00:00:00Z')
  return Math.round((b - a) / DIA_MS)
}

// Fecha legible en español: "martes 16 de junio de 2026". T12:00Z evita rollover de TZ.
function formatearFecha(fechaISO: string): string {
  return new Date(fechaISO + 'T12:00:00Z').toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

export interface RPMRelativa {
  evento: EventoCalendario
  diasRestantes: number // >0 futura, 0 hoy, <0 ya ocurrió
}

// Próxima RPM en o después de hoy (hora de Chile). null si se agotó el calendario.
export function getProximaRPM(
  now: Date = new Date(),
  calendario = CALENDARIO_RPM_2026,
): RPMRelativa | null {
  const hoy = hoyEnChile(now)
  for (const ev of calendario) {
    if (ev.fecha >= hoy) return { evento: ev, diasRestantes: diasEntre(hoy, ev.fecha) }
  }
  return null
}

// RPM ocurrida en los últimos `ventanaDias` días: su comunicado ya debería existir,
// así el agente sabe que debe buscar la decisión/sesgo en las noticias recientes.
export function getRPMReciente(
  now: Date = new Date(),
  ventanaDias = 3,
  calendario = CALENDARIO_RPM_2026,
): RPMRelativa | null {
  const hoy = hoyEnChile(now)
  let reciente: RPMRelativa | null = null
  for (const ev of calendario) {
    if (ev.fecha < hoy && diasEntre(ev.fecha, hoy) <= ventanaDias) {
      reciente = { evento: ev, diasRestantes: -diasEntre(ev.fecha, hoy) }
    }
  }
  return reciente
}

// Bloque de texto para inyectar en el contexto del agente y en el briefing.
export function contextoCalendarioRPM(now: Date = new Date()): string {
  const lineas: string[] = []

  const prox = getProximaRPM(now)
  if (prox) {
    const d = prox.diasRestantes
    const cuando = d === 0 ? 'HOY' : d === 1 ? 'mañana' : `en ${d} días`
    lineas.push(
      `- Próxima RPM: ${formatearFecha(prox.evento.fecha)} (${cuando}, decisión ~${prox.evento.hora_cl} CL).` +
        (prox.evento.nota ? ` ${prox.evento.nota}` : ''),
    )
  } else {
    lineas.push('- No quedan RPM en el calendario cargado — actualizar al calendario del próximo año.')
  }

  const reciente = getRPMReciente(now)
  if (reciente) {
    const hace = -reciente.diasRestantes
    lineas.push(
      `- RPM reciente: ${formatearFecha(reciente.evento.fecha)} (hace ${hace} día${hace === 1 ? '' : 's'}). ` +
        'Busca el comunicado/decisión de TPM y su sesgo en las noticias recientes.',
    )
  }

  return lineas.join('\n')
}

// ── Calendario FOMC 2026 ────────────────────────────────────────────────────
// Fuente: Federal Reserve, "FOMC Meeting calendars and information".
// `sep = true` → reunión con Summary of Economic Projections (dot plot):
// impacto extra porque muestra la trayectoria esperada de tasas de la Fed.
// La decisión se anuncia a las 14:00 ET del segundo día de reunión.
function fomc(fecha: string, sep: boolean): EventoCalendario {
  return {
    tipo: 'FOMC',
    fecha,
    hora_cl: '15:00', // 14:00 ET ≈ 15:00-16:00 Chile según horario de verano
    titulo: sep ? 'Reunión FOMC (con dot plot / SEP)' : 'Reunión FOMC',
    factor: 'Fed / política monetaria EE.UU.',
    impacto: 'alto',
    nota: sep
      ? 'Incluye Summary of Economic Projections (dot plot): muestra trayectoria esperada de tasas Fed.'
      : undefined,
  }
}

export const CALENDARIO_FOMC_2026: EventoCalendario[] = [
  fomc('2026-01-28', false),
  fomc('2026-03-18', true),
  fomc('2026-04-29', false),
  fomc('2026-06-17', true),
  fomc('2026-07-29', false),
  fomc('2026-09-16', true),
  fomc('2026-10-28', false),
  fomc('2026-12-09', true),
]

// ── Calendario NFP 2026 ─────────────────────────────────────────────────────
// Non-Farm Payrolls (BLS Employment Situation Report): primer viernes de cada mes,
// 8:30 ET (≈ 9:30-10:30 Chile). Uno de los datos con mayor impacto en el DXY.
// Las fechas exactas las publica BLS con antelación; las de 2H 2026 son aproximadas
// (primer viernes del mes). Verificar en https://www.bls.gov/schedule/news_release/empsit.htm
function nfp(fecha: string, nota?: string): EventoCalendario {
  return {
    tipo: 'NFP',
    fecha,
    hora_cl: '09:30',
    titulo: 'NFP — Nóminas no agrícolas EE.UU.',
    factor: 'DXY / expectativas Fed',
    impacto: 'alto',
    nota,
  }
}

export const CALENDARIO_NFP_2026: EventoCalendario[] = [
  nfp('2026-01-09'),
  nfp('2026-02-06'),
  nfp('2026-03-06'),
  nfp('2026-04-03'),
  nfp('2026-05-08'),
  nfp('2026-06-05'),
  nfp('2026-07-10'),
  nfp('2026-08-07'),
  nfp('2026-09-04'),
  nfp('2026-10-02'),
  nfp('2026-11-06'),
  nfp('2026-12-04'),
]

// ── Calendario IPC Chile 2026 ───────────────────────────────────────────────
// Publicado por INE (Instituto Nacional de Estadísticas), típicamente el día 8
// de cada mes (o hábil siguiente). Impacto en diferencial de tasas:
// IPC sobre lo esperado → BCCh puede demorar baja de TPM → peso se fortalece.
// Fechas aproximadas; verificar en https://www.ine.gob.cl/estadisticas/macro/indices-de-precios
function ipcCl(fecha: string): EventoCalendario {
  return {
    tipo: 'IPC_CL',
    fecha,
    hora_cl: '09:00',
    titulo: 'IPC Chile — Índice de Precios al Consumidor',
    factor: 'diferencial de tasas (TPM) / BCCh',
    impacto: 'medio',
    nota: 'Sobre lo esperado → BCCh puede demorar baja de TPM → peso se fortalece (USD/CLP baja).',
  }
}

export const CALENDARIO_IPC_CL_2026: EventoCalendario[] = [
  ipcCl('2026-01-08'),
  ipcCl('2026-02-06'),
  ipcCl('2026-03-09'),
  ipcCl('2026-04-08'),
  ipcCl('2026-05-08'),
  ipcCl('2026-06-08'),
  ipcCl('2026-07-08'),
  ipcCl('2026-08-10'),
  ipcCl('2026-09-08'),
  ipcCl('2026-10-08'),
  ipcCl('2026-11-09'),
  ipcCl('2026-12-08'),
]

// ── Calendario unificado: todos los catalizadores ──────────────────────────

const TODOS_LOS_CALENDARIOS: EventoCalendario[] = [
  ...CALENDARIO_RPM_2026,
  ...CALENDARIO_FOMC_2026,
  ...CALENDARIO_NFP_2026,
  ...CALENDARIO_IPC_CL_2026,
]

export interface EventoRelativo {
  evento: EventoCalendario
  diasRestantes: number // >0 futuro, 0 hoy, <0 pasado
}

// Eventos dentro de una ventana de días (pasado negativo o futuro positivo).
// Por defecto: próximos 14 días + hoy.
export function getEventosProximos(
  now: Date = new Date(),
  diasAdelante = 14,
  calendarios = TODOS_LOS_CALENDARIOS,
): EventoRelativo[] {
  const hoy = hoyEnChile(now)
  return calendarios
    .map((ev) => ({ evento: ev, diasRestantes: diasEntre(hoy, ev.fecha) }))
    .filter((e) => e.diasRestantes >= 0 && e.diasRestantes <= diasAdelante)
    .sort((a, b) => a.diasRestantes - b.diasRestantes)
}

// Bloque de texto completo (RPM + FOMC + NFP + IPC Chile) para inyectar al agente
// y al briefing. Reemplaza contextoCalendarioRPM() en nuevos contextos.
export function contextoCalendarioCompleto(now: Date = new Date()): string {
  const proximos = getEventosProximos(now, 14)
  const lineas: string[] = []

  if (proximos.length === 0) {
    lineas.push('- Sin catalizadores agendados en los próximos 14 días.')
  } else {
    for (const { evento, diasRestantes } of proximos) {
      const cuando =
        diasRestantes === 0 ? 'HOY' : diasRestantes === 1 ? 'mañana' : `en ${diasRestantes} días`
      const hora = evento.hora_cl ? ` ~${evento.hora_cl} CL` : ''
      const nota = evento.nota ? ` ${evento.nota}` : ''
      lineas.push(
        `- [${evento.tipo}] ${formatearFecha(evento.fecha)} (${cuando}${hora}): ${evento.titulo} | factor: ${evento.factor} | impacto: ${evento.impacto}.${nota}`,
      )
    }
  }

  return lineas.join('\n')
}
