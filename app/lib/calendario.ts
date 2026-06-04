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

export type TipoEvento = 'RPM' // 10.4.4 ampliará: 'NFP' | 'CPI_US' | 'FOMC' | 'IPC_CL' | 'TPM'...

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
