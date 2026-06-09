import Anthropic from '@anthropic-ai/sdk'
import { anthropic, MODELOS, registrarUso } from './anthropic'
import { supabaseAdmin } from './supabase'

const FACTOR_LABEL: Record<string, string> = {
  A1: 'Cobre', A2: 'DXY', A3: 'Tasas', A4: 'Petróleo',
  A5: 'VIX', B1: 'China', B2: 'Fed', B3: 'Geopolítica',
  B4: 'BCCh', B5: 'Política', B6: 'IPC',
}

const DIRECCION_LABEL: Record<string, string> = {
  sube: '↑ USD/CLP (peso débil)',
  baja: '↓ USD/CLP (peso fuerte)',
  neutral: 'neutro',
}

// Versión del prompt. Al cambiarla, todas las noticias quedan re-elegibles.
// v2: agrega etiquetas del hub público (secciones_impacto, geografia, relevancia)
// además de la clasificación USD/CLP existente (impacto/factor/direccion).
const PROMPT_VERSION = 'v2'

// Secciones válidas del hub (deben coincidir con la tabla `secciones`).
const SECCIONES_VALIDAS = ['dolar', 'cobre', 'bitcoin', 'sp500', 'ipsa', 'oro', 'uf-inflacion'] as const

// Máximo de noticias a clasificar por llamada al cron (control de costo).
// Con Haiku: ~15 noticias ≈ $0.003 por batch. Con ~50 noticias nuevas/día → ~$0.01/día.
const MAX_POR_BATCH = 15

// System prompt estable → se cachea con prompt caching después del primer uso.
// Describe el contexto de trading y los factores/impactos posibles.
const SYSTEM_PROMPT = `Eres un clasificador de noticias económicas para un hub público chileno. El hub tiene secciones por instrumento y, además, una capa de trading USD/CLP.

Para cada noticia determina:

— CLASIFICACIÓN USD/CLP (para la capa de trading del dólar) —
1. IMPACTO sobre USD/CLP: "alto" (mueve el par significativamente), "medio" (influye pero no es dominante), "bajo" (ruido o poco relevante)
2. FACTOR principal (un código): A1=Cobre, A2=DXY/Dólar global, A3=Tasas/carry, A4=Petróleo, A5=VIX/miedo, B1=China, B2=Fed/FOMC/macro EEUU, B3=Geopolítica, B4=BCCh/intervención, B5=Política Chile/AFP, B6=IPC Chile, NINGUNO=no relevante
3. DIRECCIÓN sobre USD/CLP: "sube" (peso débil), "baja" (peso fuerte), "neutral"
4. RESUMEN en 1 oración en español (máx. 15 palabras)
5. CONFIANZA: número 0.0–1.0

— ETIQUETAS DEL HUB (para la portada pública y las páginas por sección) —
6. SECCIONES: lista de las secciones que la noticia afecta, cada una con su PROPIO impacto y dirección EN ESA SECCIÓN. Secciones válidas: dolar, cobre, bitcoin, sp500, ipsa, oro, uf-inflacion. Una noticia puede tocar varias (ej. "Fed sube tasas" afecta dolar y sp500). Si es una noticia general sin instrumento claro, deja la lista vacía [].
   - impacto por sección: "alto" | "medio" | "bajo"
   - direccion por sección: "sube" | "baja" | "neutral" (qué le pasa al PRECIO de esa sección)
7. GEOGRAFIA: "nacional" (Chile), "internacional" (global), o "ambas".
8. RELEVANCIA: número 0.0–1.0 de qué tan destacable es para CUALQUIER lector del hub, independiente de una divisa. Una noticia puede ser bajo impacto para USD/CLP pero muy relevante para el público (ej. Bitcoin en máximo histórico → relevancia alta). Ordena la portada.

Responde SOLO con un array JSON, sin explicaciones. Cada elemento tiene exactamente estas claves: id, impacto, factor, direccion, resumen, confianza, secciones, geografia, relevancia. Donde "secciones" es un array de objetos {seccion, impacto, direccion}.

Ejemplo:
[{"id":1,"impacto":"alto","factor":"A1","direccion":"baja","resumen":"China anuncia estímulo que impulsa demanda de cobre.","confianza":0.9,"secciones":[{"seccion":"cobre","impacto":"alto","direccion":"sube"},{"seccion":"dolar","impacto":"medio","direccion":"baja"}],"geografia":"internacional","relevancia":0.8}]`

interface NoticiaInput {
  id: number
  titulo: string
  resumen: string | null
}

interface SeccionImpacto {
  seccion: string
  impacto: 'alto' | 'medio' | 'bajo'
  direccion: 'sube' | 'baja' | 'neutral'
}

interface ClasificacionItem {
  id: number
  impacto: 'alto' | 'medio' | 'bajo'
  factor: string
  direccion: 'sube' | 'baja' | 'neutral'
  resumen: string
  confianza: number
  // Etiquetas del hub (PROMPT_VERSION v2). Opcionales por robustez: si Haiku no
  // las devuelve en alguna respuesta, la noticia se guarda igual sin etiquetas.
  secciones?: SeccionImpacto[]
  geografia?: 'nacional' | 'internacional' | 'ambas'
  relevancia?: number
}

// Normaliza y valida las etiquetas del hub que vienen de Haiku. Descarta secciones
// inválidas y acota valores fuera de rango: nunca confiar ciegamente en el LLM.
function normalizarEtiquetas(item: ClasificacionItem): {
  secciones_impacto: SeccionImpacto[]
  secciones_lista: string[]
  geografia: string | null
  relevancia: number | null
} {
  const impactosOk = ['alto', 'medio', 'bajo']
  const direccionesOk = ['sube', 'baja', 'neutral']
  const secciones = Array.isArray(item.secciones)
    ? item.secciones.filter(
        (s) =>
          s &&
          SECCIONES_VALIDAS.includes(s.seccion as (typeof SECCIONES_VALIDAS)[number]) &&
          impactosOk.includes(s.impacto) &&
          direccionesOk.includes(s.direccion),
      )
    : []
  const geografia =
    item.geografia && ['nacional', 'internacional', 'ambas'].includes(item.geografia)
      ? item.geografia
      : null
  const relevancia =
    typeof item.relevancia === 'number' ? Math.min(1, Math.max(0, item.relevancia)) : null
  return {
    secciones_impacto: secciones,
    secciones_lista: secciones.map((s) => s.seccion),
    geografia,
    relevancia,
  }
}

// Llama a Haiku con un batch de noticias y retorna las clasificaciones.
async function llamarHaiku(noticias: NoticiaInput[]): Promise<{ items: ClasificacionItem[]; uso: Anthropic.Usage }> {
  const userContent = noticias
    .map((n) => `ID ${n.id}: ${n.titulo}${n.resumen ? ' — ' + n.resumen.slice(0, 150) : ''}`)
    .join('\n')

  const resp = await anthropic.messages.create({
    model: MODELOS.clasificacion,
    // v2 produce respuestas grandes: cada noticia trae secciones[] (objetos
    // anidados) + geografia + relevancia, además de la clasificación USD/CLP.
    // Con 1000 tokens y 15 noticias el JSON se truncaba a la mitad → parse fallaba
    // → 0 clasificadas (bug del backfill v2). ~150 tok/noticia × 15 ≈ 2250 + margen.
    max_tokens: 3000,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' }, // el prompt estable se cachea
      },
    ],
    messages: [{ role: 'user', content: `Clasifica estas ${noticias.length} noticias:\n\n${userContent}` }],
  })

  const texto = resp.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text ?? '[]'

  let items: ClasificacionItem[] = []
  try {
    // Extrae el JSON aunque venga con texto antes/después
    const match = texto.match(/\[[\s\S]*\]/)
    if (match) items = JSON.parse(match[0])
  } catch {
    // Si el array completo no parsea (p.ej. respuesta truncada por max_tokens),
    // rescatamos los objetos individuales que SÍ estén completos en vez de perder
    // el batch entero. Cada objeto debe tener un "id" para ser válido.
    items = rescatarObjetos(texto)
    if (items.length === 0) {
      console.error('Clasificador: error parseando JSON de Haiku:', texto.slice(-200))
    } else {
      console.warn(`Clasificador: JSON parcial, rescatados ${items.length} objetos`)
    }
  }

  return { items, uso: resp.usage }
}

// Rescata objetos JSON completos de un texto posiblemente truncado. Recorre llave
// por llave equilibrando { } y parsea cada bloque cerrado. Tolera que el último
// objeto quede a medias (se descarta).
function rescatarObjetos(texto: string): ClasificacionItem[] {
  const items: ClasificacionItem[] = []
  let nivel = 0
  let inicio = -1
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (c === '{') {
      if (nivel === 0) inicio = i
      nivel++
    } else if (c === '}') {
      nivel--
      if (nivel === 0 && inicio >= 0) {
        try {
          const obj = JSON.parse(texto.slice(inicio, i + 1))
          if (obj && typeof obj.id === 'number') items.push(obj)
        } catch {
          // objeto inválido, se ignora
        }
        inicio = -1
      }
    }
  }
  return items
}

// Obtiene los IDs de series y factores para los FK en analisis_ia.
async function getRef() {
  const [{ data: instrumento }, { data: factores }] = await Promise.all([
    supabaseAdmin.from('instrumentos').select('id').eq('simbolo', 'USD/CLP').single(),
    supabaseAdmin.from('factores').select('id, codigo'),
  ])
  const factorMap = new Map((factores ?? []).map((f) => [f.codigo, f.id]))
  return { instrumentoId: instrumento?.id ?? null, factorMap }
}

// Crea alertas en la tabla `alertas` para noticias de impacto ALTO con confianza ≥ 0.65.
// Evita duplicados: no re-alerta la misma noticia.
async function crearAlertasAltoImpacto(
  rows: Array<{ noticia_id: number; instrumento_id: number | null; impacto: string; direccion_estimada: string; resumen_ia: string | null; confianza: number | null; factor_id: number | null }>,
  items: ClasificacionItem[],
  instrumentoId: number | null
): Promise<void> {
  const altas = rows.filter(
    (r) => r.impacto === 'alto' && (r.confianza === null || r.confianza >= 0.65)
  )
  if (altas.length === 0) return

  // IDs de noticias ya alertadas (para dedup)
  const noticiaIds = altas.map((r) => r.noticia_id)
  const { data: yaAlertadas } = await supabaseAdmin
    .from('alertas')
    .select('noticia_id')
    .in('noticia_id', noticiaIds)

  const yaSet = new Set((yaAlertadas ?? []).map((a) => a.noticia_id))

  const alertasNuevas = altas
    .filter((r) => !yaSet.has(r.noticia_id))
    .map((r) => {
      const item = items.find((i) => i.id === r.noticia_id)
      const factorLabel = item ? (FACTOR_LABEL[item.factor] ?? item.factor) : 'Mercado'
      const dirLabel = item ? (DIRECCION_LABEL[item.direccion] ?? '') : ''
      const confianzaTexto = r.confianza !== null ? ` (IA ${Math.round(r.confianza * 100)}%)` : ''
      return {
        tipo: 'agente' as const,
        noticia_id: r.noticia_id,
        instrumento_id: instrumentoId,
        severidad: 'alta' as const,
        titulo: `[Haiku] ${factorLabel} · ${dirLabel}`,
        mensaje: r.resumen_ia ? `${r.resumen_ia}${confianzaTexto}` : `Noticia de alto impacto detectada${confianzaTexto}`,
        contexto: { factor: item?.factor, direccion: item?.direccion, confianza: r.confianza },
      }
    })

  if (alertasNuevas.length > 0) {
    const { error } = await supabaseAdmin.from('alertas').insert(alertasNuevas)
    if (error) console.error('Clasificador: error creando alertas:', error.message)
  }
}

// Clasifica las noticias nuevas (sin analisis_ia) y guarda los resultados.
export async function clasificarNoticiasNuevas(): Promise<number> {
  const desde = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()

  // Pool de candidatas: las noticias más recientes (orden correcto, query chica).
  // NO usar .not('id','in', [cientos de ids]): con cientos de IDs la URL se vuelve
  // gigante y PostgREST IGNORA el ORDER BY → devolvía noticias viejas y las nuevas
  // NUNCA se clasificaban (bug raíz de "sin badges" en noticias recientes).
  const { data: recientes, error: errNoticias } = await supabaseAdmin
    .from('noticias')
    .select('id, titulo, resumen')
    .gte('publicado_at', desde)
    .order('publicado_at', { ascending: false })
    .limit(80)
  if (errNoticias) {
    console.error('Clasificador: error buscando noticias recientes:', errNoticias.message)
    return 0
  }
  if (!recientes || recientes.length === 0) return 0

  // Cuáles del pool ya están clasificadas (IN acotado a ≤80 ids = URL corta y segura).
  const idsPool = recientes.map((n) => n.id)
  const { data: yaClasif } = await supabaseAdmin
    .from('analisis_ia')
    .select('noticia_id')
    .eq('prompt_version', PROMPT_VERSION)
    .in('noticia_id', idsPool)
  const clasifSet = new Set((yaClasif ?? []).map((a) => a.noticia_id))

  // Las primeras MAX_POR_BATCH sin clasificar, ordenadas por publicado_at desc (más nuevas primero).
  const sinAnalisis = recientes.filter((n) => !clasifSet.has(n.id)).slice(0, MAX_POR_BATCH)
  if (sinAnalisis.length === 0) return 0

  const { instrumentoId, factorMap } = await getRef()

  let totalClasificadas = 0
  let tokensIn = 0, tokensOut = 0, tokensCacheWrite = 0, tokensCacheRead = 0

  // Procesar en batch
  try {
    const { items, uso } = await llamarHaiku(sinAnalisis)

    // Acumular tokens
    tokensIn += uso.input_tokens ?? 0
    tokensOut += uso.output_tokens ?? 0
    tokensCacheWrite += (uso as unknown as Record<string, number>).cache_creation_input_tokens ?? 0
    tokensCacheRead += (uso as unknown as Record<string, number>).cache_read_input_tokens ?? 0

    // Guardar en analisis_ia
    const rows = items
      .filter((item) => {
        const validos = ['alto', 'medio', 'bajo']
        return validos.includes(item.impacto)
      })
      .map((item) => {
        const etiquetas = normalizarEtiquetas(item)
        return {
          noticia_id: item.id,
          instrumento_id: instrumentoId,
          factor_id: factorMap.get(item.factor) ?? null,
          impacto: item.impacto as 'alto' | 'medio' | 'bajo',
          direccion_estimada: (['sube', 'baja', 'neutral'].includes(item.direccion)
            ? item.direccion
            : 'neutral') as 'sube' | 'baja' | 'neutral',
          resumen_ia: item.resumen?.slice(0, 300) ?? null,
          confianza: typeof item.confianza === 'number' ? Math.min(1, Math.max(0, item.confianza)) : null,
          modelo_usado: MODELOS.clasificacion,
          prompt_version: PROMPT_VERSION,
          // Etiquetas del hub (v2)
          secciones_impacto: etiquetas.secciones_impacto,
          secciones_lista: etiquetas.secciones_lista,
          geografia: etiquetas.geografia,
          relevancia: etiquetas.relevancia,
        }
      })

    if (rows.length > 0) {
      const { error } = await supabaseAdmin
        .from('analisis_ia')
        .insert(rows)
      if (error) {
        console.error('Clasificador: error guardando analisis_ia:', error.message)
      } else {
        totalClasificadas += rows.length
        // Crear alertas para noticias de ALTO impacto con confianza razonable (≥0.65)
        await crearAlertasAltoImpacto(rows, items, instrumentoId)
      }
    }
  } catch (err) {
    console.error('Clasificador: error en batch Haiku:', err)
  }

  // Registrar uso en el ledger (una fila por invocación del cron)
  await registrarUso({
    proposito: 'clasificacion',
    modelo: MODELOS.clasificacion,
    uso: {
      input_tokens: tokensIn,
      output_tokens: tokensOut,
      cache_creation_input_tokens: tokensCacheWrite,
      cache_read_input_tokens: tokensCacheRead,
    },
    metadata: {
      noticias_clasificadas: totalClasificadas,
      prompt_version: PROMPT_VERSION,
    },
  })

  return totalClasificadas
}
