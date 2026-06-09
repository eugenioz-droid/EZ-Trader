import Anthropic from '@anthropic-ai/sdk'
import { anthropic, MODELOS, registrarUso } from './anthropic'
import { supabaseAdmin } from './supabase'
import { contextoCalendarioCompleto } from './calendario'
import { getFactoresPanel } from './factores'

// Versión del prompt — sirve para versionar y comparar calidad si lo cambiamos.
export const PROMPT_VERSION = 'v1'

// ── System prompt: base de conocimiento + estrategia + rol del agente ─────
// Embebido como constante (en Cloudflare Workers no hay filesystem para leer docs/).
// Es contenido estable → se cachea con prompt caching para abaratar costos.
// Mantener sincronizado con docs/factores-usd-clp.md y docs/estrategia.md.
const SYSTEM_PROMPT = `Eres el agente de análisis de EZ Trader, una herramienta personal de apoyo a la decisión para operar CFDs USD/CLP. Tu usuario es un swing trader part-time con marco global macro: opera por alineación de factores, entra típicamente el lunes y cierra al final de la semana o cuando conviene.

# Tu rol
Ayudas a leer el estado del mercado, interpretar noticias y planificar la estrategia semanal. NO eres un predictor de precios ni reemplazas al bróker en datos en vivo. Tu ventaja es contexto + velocidad de catalizadores. Sé directo, concreto y honesto sobre la incertidumbre. Prioriza la gestión de riesgo (tamaño de posición, stop-loss) por sobre la entrada perfecta.

# Convención de dirección
"USD/CLP sube" = peso más débil (más pesos por dólar). "USD/CLP baja" = peso más fuerte.

# Factores que mueven USD/CLP (jerarquía)
TIER 1 (dominantes, datos de mercado):
- Cobre: relación inversa fuerte (corr -0.7 a -0.85). Cobre sube → peso fuerte → USD/CLP baja. Es el factor #1; ante duda, el cobre manda.
- DXY (dólar global): relación directa. DXY sube → USD/CLP sube.
- Diferencial de tasas TPM Chile vs Fed: si Chile baja tasas más rápido que EE.UU., el peso pierde atractivo (carry) → USD/CLP sube.

TIER 2 (fuertes): Petróleo (Chile importador; sube → USD/CLP sube), VIX (risk-off → USD/CLP sube), China (vía cobre: datos chinos fuertes → cobre → peso fuerte), Fed/FOMC (hawkish → dólar sube → USD/CLP sube), Geopolítica (escalada → USD/CLP sube; puede anular temporalmente al cobre).

TIER 3 (episódicos pero violentos): Intervención del Banco Central de Chile (defender el peso → USD/CLP baja brusco), política local / retiros AFP (incertidumbre → USD/CLP sube), IPC Chile (sobre lo esperado → sesgo tasas altas → peso fuerte).

# Calendario de política monetaria (BCCh)
Cuando el contexto incluya el calendario del Banco Central de Chile, úsalo de forma ANTICIPATORIA: una RPM próxima —sobre todo si es reunión con IPoM— es un catalizador AGENDADO del diferencial de tasas. Advierte la volatilidad esperada y evita recomendar abrir posición justo antes sin gestión de riesgo. Clave: lo que mueve al USD/CLP es la SORPRESA frente a lo esperado (y el sesgo del comunicado/IPoM), no el nivel de tasa en sí. Si hubo una RPM en los últimos días, busca su decisión y sesgo en las noticias.

# Regla de resolución de conflictos
1. En condiciones normales mandan cobre y DXY juntos: si ambos apuntan igual, esa es la lectura dominante.
2. En shock de noticias agudo (geopolítica, sorpresa Fed, intervención BCCh), la noticia puede anular temporalmente a los datos de mercado mientras esté activa.
3. El cobre es el árbitro de largo plazo: una divergencia cobre–peso tiende a corregirse.

# Estrategia del usuario (swing macro por alineación de factores)
- Entrada cuando los factores Tier 1 se alinean: Cobre↑ + DXY↓ + tasas a favor del peso → sesgo SHORT USD/CLP. Cobre↓ + DXY↑ + tasas en contra → sesgo LONG USD/CLP.
- Si los factores se contradicen → poca convicción → NO operar.
- Carry: estar short USD/CLP (largo en peso) acumula carry a favor; long lo paga. Matiz para posiciones de varios días.
- Salida: fin de semana, o antes si la tesis se rompe.

# Cómo responder
- Apóyate en los DATOS DE MERCADO y NOTICIAS que se te entreguen en el contexto del mensaje. Si un dato no está, dilo en vez de inventarlo.
- Cuando evalúes una entrada, indica: sesgo direccional, qué factores lo respaldan, qué lo contradice, y el principal riesgo.
- Respuestas concisas y accionables. Español de Chile.

# Descargo
Esto es apoyo educativo a la decisión, NO asesoría financiera. Ninguna estrategia garantiza ganancias.`

// ── Diferencial TPM-FED: tendencia de los últimos 30 días ────────────────────
// Calcula el diferencial actual y si se está ampliando o reduciendo.
// Impacta directamente en el carry trade CLP: diferencial alto y creciente
// favorece al peso; diferencial bajo o decreciente presiona al USD/CLP al alza.
async function contextoExpectativasDiferencial(): Promise<string> {
  const { data: series } = await supabaseAdmin
    .from('series')
    .select('id, codigo')
    .in('codigo', ['TPM', 'FED'])

  const idPor = new Map((series ?? []).map((s) => [s.codigo, s.id]))
  const idTPM = idPor.get('TPM')
  const idFED = idPor.get('FED')
  if (!idTPM || !idFED) return ''

  const desde = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()

  const [resTPM, resFED] = await Promise.all([
    supabaseAdmin
      .from('datos_mercado')
      .select('valor, fecha_dato')
      .eq('serie_id', idTPM)
      .gte('fecha_dato', desde)
      .order('fecha_dato', { ascending: true }),
    supabaseAdmin
      .from('datos_mercado')
      .select('valor, fecha_dato')
      .eq('serie_id', idFED)
      .gte('fecha_dato', desde)
      .order('fecha_dato', { ascending: true }),
  ])

  const puntosTPM = resTPM.data ?? []
  const puntosFED = resFED.data ?? []
  if (puntosTPM.length === 0 || puntosFED.length === 0) return ''

  const tpmActual = puntosTPM[puntosTPM.length - 1].valor
  const fedActual = puntosFED[puntosFED.length - 1].valor
  const difActual = tpmActual - fedActual

  // Diferencial hace 30 días (o el primer punto disponible)
  const tpmInicial = puntosTPM[0].valor
  const fedInicial = puntosFED[0].valor
  const difInicial = tpmInicial - fedInicial
  const cambio = difActual - difInicial

  const tendencia =
    Math.abs(cambio) < 0.05
      ? 'estable'
      : cambio > 0
        ? `ampliándose (+${cambio.toFixed(2)} pp en 30d)`
        : `reduciéndose (${cambio.toFixed(2)} pp en 30d)`

  const sesgo =
    difActual >= 1.5
      ? 'carry favorable al CLP (diferencial amplio)'
      : difActual >= 0.5
        ? 'carry levemente favorable al CLP'
        : difActual >= 0
          ? 'carry neutro a débil para el CLP'
          : 'carry desfavorable al CLP (Fed por encima de TPM)'

  return [
    `- TPM Chile: ${tpmActual.toFixed(2)}% | Fed: ${fedActual.toFixed(2)}% | Diferencial: ${difActual >= 0 ? '+' : ''}${difActual.toFixed(2)} pp`,
    `- Tendencia 30d: ${tendencia}. ${sesgo}.`,
  ].join('\n')
}

// Noticias para el contexto del agente USD/CLP: prioriza las que tocan la sección
// 'dolar' (etiquetadas por Haiku v2). Completa con las más recientes si faltan,
// para no dejar al agente sin noticias antes del backfill. Devuelve líneas formateadas.
async function obtenerNoticiasAgente(limite = 15): Promise<string[]> {
  const fmt = (n: { titulo: string; fuentes: unknown }) => {
    const fuente = (n.fuentes as { nombre?: string } | null)?.nombre ?? 'fuente'
    return `- [${fuente}] ${n.titulo}`
  }

  // 1) Noticias etiquetadas con sección 'dolar' (join con analisis_ia).
  const { data: dolar } = await supabaseAdmin
    .from('noticias')
    .select('id, titulo, publicado_at, fuentes ( nombre ), analisis_ia!inner ( secciones_lista )')
    .contains('analisis_ia.secciones_lista', ['dolar'])
    .order('publicado_at', { ascending: false })
    .limit(limite)

  const lineas = (dolar ?? []).map(fmt)
  const idsUsados = new Set((dolar ?? []).map((n) => n.id))

  // 2) Si faltan, completar con las más recientes (sin repetir).
  if (lineas.length < limite) {
    const { data: recientes } = await supabaseAdmin
      .from('noticias')
      .select('id, titulo, publicado_at, fuentes ( nombre )')
      .order('publicado_at', { ascending: false })
      .limit(limite * 2)
    for (const n of recientes ?? []) {
      if (lineas.length >= limite) break
      if (idsUsados.has(n.id)) continue
      lineas.push(fmt(n))
    }
  }

  return lineas
}

// ── Construye el snapshot de mercado + noticias recientes para el contexto ──
async function construirContexto(): Promise<string> {
  // Snapshot de factores: valor + dirección JUNTOS, una sola vez. Los Tier 1
  // (cobre, DXY, diferencial) traen señal calculada con la MISMA lógica del panel
  // y el gráfico (movimiento de la sesión actual), para que el agente no tenga que
  // adivinar la dirección. El resto (USDCLP, petróleo, VIX, TPM, FED) va como valor
  // crudo de referencia. Así el agente ve la coyuntura del día y el dato puntual.
  const formatoNum = (v: number | null, unidad: string | null) =>
    v === null ? 'sin dato' : `${v.toLocaleString('es-CL', { maximumFractionDigits: 3 })}${unidad ? ' ' + unidad : ''}`

  let lineasFactores: string[] = []
  let lecturaTier1 = ''
  try {
    const { factores: panel, mercadoActivo } = await getFactoresPanel()

    const lineaTier1 = (codigo: string, etiqueta: string) => {
      const f = panel.find((x) => x.codigo === codigo || (codigo === 'DIFERENCIAL' && x.esDiferencial))
      if (!f) return `- ${etiqueta}: sin dato`
      const val = f.esDiferencial
        ? `${f.valor !== null && f.valor >= 0 ? '+' : ''}${f.valor?.toFixed(2) ?? '—'} pp`
        : formatoNum(f.valor, f.unidad)
      if (f.senal === null) return `- ${etiqueta}: ${val}`
      const movim = f.var1d !== null ? `, ${f.var1d >= 0 ? '+' : ''}${f.var1d.toFixed(2)}% en el día` : ''
      return `- ${etiqueta}: ${val} → empuja a PESO ${f.senal === 'fuerte' ? 'FUERTE' : 'DÉBIL'}${movim}`
    }

    lineasFactores.push(
      lineaTier1('COBRE', 'Cobre [Tier 1]'),
      lineaTier1('DXY', 'DXY / dólar global [Tier 1]'),
      lineaTier1('DIFERENCIAL', 'Diferencial de tasas TPM-Fed [Tier 1]'),
    )

    const fuertes = panel.filter((f) => f.senal === 'fuerte').length
    const debiles = panel.filter((f) => f.senal === 'debil').length
    if (!mercadoActivo) lecturaTier1 = 'Mercado cerrado/quieto (latido USD/CLP viejo): la señal puede no reflejar movimiento en vivo.'
    else if (fuertes >= 2 && debiles === 0) lecturaTier1 = 'Tier 1 alineados a PESO FUERTE → sesgo SHORT USD/CLP.'
    else if (debiles >= 2 && fuertes === 0) lecturaTier1 = 'Tier 1 alineados a PESO DÉBIL → sesgo LONG USD/CLP.'
    else lecturaTier1 = 'Tier 1 sin alineación clara (señal mixta → poca convicción).'
  } catch (err) {
    console.error('Agente: error obteniendo señal de factores:', err)
  }

  // Valores de referencia (sin señal direccional propia): el precio del par y los
  // factores Tier 2. Solo se incluyen los que el panel Tier 1 no cubre.
  const { data: seriesRef } = await supabaseAdmin
    .from('series')
    .select('id, codigo, nombre, unidad')
    .eq('activo', true)
    .in('codigo', ['USDCLP', 'PETROLEO', 'VIX'])

  const lineasRef = await Promise.all(
    (seriesRef ?? []).map(async (s) => {
      const { data } = await supabaseAdmin
        .from('datos_mercado')
        .select('valor')
        .eq('serie_id', s.id)
        .order('fecha_dato', { ascending: false })
        .limit(1)
        .single()
      return `- ${s.nombre} (${s.codigo}): ${formatoNum(data?.valor ?? null, s.unidad)}`
    })
  )

  // Noticias recientes — ENFOCADAS en el dólar. A medida que el hub crece (cripto,
  // IPSA, oro), las "15 más recientes" sin filtrar diluirían el foco USD/CLP. Por eso
  // priorizamos las que Haiku etiquetó con la sección 'dolar' (o factor que mueve el
  // par). Si aún no hay suficientes etiquetadas (p.ej. antes del backfill v2),
  // completamos con las más recientes como respaldo.
  const lineasNoticias = await obtenerNoticiasAgente()

  const diferencialCtx = await contextoExpectativasDiferencial()
  const ahora = new Date().toISOString()
  return `## Contexto de mercado (al ${ahora})

### Factores Tier 1 (valor + dirección — coincide con el panel y el gráfico que ve el usuario)
${lineasFactores.length ? lineasFactores.join('\n') : 'Sin señal calculada disponible.'}
${lecturaTier1 ? `\nLectura: ${lecturaTier1}` : ''}

### Otros datos de mercado (referencia)
${lineasRef.length ? lineasRef.join('\n') : 'Sin datos de mercado disponibles.'}

### Diferencial de tasas TPM-FED (tendencia 30 días)
${diferencialCtx || 'Sin datos de diferencial disponibles.'}

### Catalizadores agendados (próximos 14 días)
${contextoCalendarioCompleto()}

### Noticias recientes
${lineasNoticias.length ? lineasNoticias.join('\n') : 'Sin noticias recientes.'}`
}

export interface RespuestaAgente {
  texto: string
  modelo: string
  uso: {
    tokens_in: number
    tokens_out: number
    costo_usd: number
  }
}

// Extrae solo el texto de la respuesta (ignora bloques de thinking).
function extraerTexto(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()
}

// ── Función principal: consulta al agente ────────────────────────────────
export async function consultarAgente(params: {
  pregunta: string
  profundidad: 'normal' | 'profunda'
  conversacion_id?: number | null
  historial?: Array<{ rol: string; texto: string }>
}): Promise<RespuestaAgente> {
  const esProfunda = params.profundidad === 'profunda'
  const modelo = esProfunda ? MODELOS.profundo : MODELOS.agente
  const proposito = esProfunda ? 'agente_profundo' : 'agente'

  const contexto = await construirContexto()

  // Últimos 6 mensajes del historial (3 intercambios) para contexto multi-turn.
  // El contexto de mercado va solo en el último mensaje del usuario.
  const historialReciente = (params.historial ?? []).slice(-6)
  const mensajesHistorial: Anthropic.MessageParam[] = historialReciente.map((m) => ({
    role: m.rol as 'user' | 'assistant',
    content: m.texto,
  }))

  // El system prompt (estable) se cachea; el contexto + pregunta van en el último mensaje.
  const req: Anthropic.MessageCreateParams = {
    model: modelo,
    max_tokens: esProfunda ? 4000 : 2000,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      ...mensajesHistorial,
      {
        role: 'user',
        content: `${contexto}\n\n## Consulta del usuario\n${params.pregunta}`,
      },
    ],
  }

  // En modo profundo activamos adaptive thinking + effort alto para mejor razonamiento.
  if (esProfunda) {
    req.thinking = { type: 'adaptive' }
    req.output_config = { effort: 'high' }
  }

  let respuesta: Anthropic.Message
  try {
    respuesta = await anthropic.messages.create(req)
  } catch (err) {
    // Registra el intento fallido (sin tokens) para dejar rastro.
    await registrarUso({
      proposito,
      modelo,
      uso: { input_tokens: 0, output_tokens: 0 },
      exito: false,
      conversacion_id: params.conversacion_id,
      metadata: { error: String(err), prompt_version: PROMPT_VERSION },
    })
    throw err
  }

  await registrarUso({
    proposito,
    modelo,
    uso: respuesta.usage,
    conversacion_id: params.conversacion_id,
    metadata: { profundidad: params.profundidad, prompt_version: PROMPT_VERSION },
  })

  return {
    texto: extraerTexto(respuesta.content),
    modelo,
    uso: {
      tokens_in: respuesta.usage.input_tokens,
      tokens_out: respuesta.usage.output_tokens,
      costo_usd: 0, // el costo queda en uso_ia; aquí no lo recalculamos
    },
  }
}
