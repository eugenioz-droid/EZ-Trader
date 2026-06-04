import Anthropic from '@anthropic-ai/sdk'
import { anthropic, MODELOS, registrarUso } from './anthropic'
import { supabaseAdmin } from './supabase'
import { contextoCalendarioRPM } from './calendario'

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

// ── Construye el snapshot de mercado + noticias recientes para el contexto ──
async function construirContexto(): Promise<string> {
  // Últimos valores de cada serie Tier 1
  const { data: series } = await supabaseAdmin
    .from('series')
    .select('id, codigo, nombre, unidad')
    .eq('activo', true)
    .in('codigo', ['USDCLP', 'COBRE', 'DXY', 'TPM', 'FED', 'PETROLEO', 'VIX'])

  const factores = await Promise.all(
    (series ?? []).map(async (s) => {
      const { data } = await supabaseAdmin
        .from('datos_mercado')
        .select('valor, fecha_dato')
        .eq('serie_id', s.id)
        .order('fecha_dato', { ascending: false })
        .limit(1)
        .single()
      return `- ${s.nombre} (${s.codigo}): ${data?.valor ?? 'sin dato'}${s.unidad ? ' ' + s.unidad : ''}`
    })
  )

  // Noticias recientes
  const { data: noticias } = await supabaseAdmin
    .from('noticias')
    .select('titulo, resumen, publicado_at, fuentes ( nombre )')
    .order('publicado_at', { ascending: false })
    .limit(15)

  const lineasNoticias = (noticias ?? []).map((n) => {
    const fuente = (n.fuentes as { nombre?: string } | null)?.nombre ?? 'fuente'
    return `- [${fuente}] ${n.titulo}`
  })

  const ahora = new Date().toISOString()
  return `## Contexto de mercado (al ${ahora})

### Datos de mercado (último valor)
${factores.length ? factores.join('\n') : 'Sin datos de mercado disponibles.'}

### Calendario de política monetaria (BCCh)
${contextoCalendarioRPM()}

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
