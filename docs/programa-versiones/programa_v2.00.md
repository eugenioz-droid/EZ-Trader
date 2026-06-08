# Programa de Trabajo — EZ Trader v2.00

**Hub público de noticias económicas con IA** (pivot desde la herramienta personal de trading v1.00)

> El programa v1.00 (`programa_v1.00.md`) está **completado** y se conserva como registro
> histórico. Todo su pipeline (cron, RSS, Haiku, precios, síntesis) y su dashboard se reutilizan:
> el dashboard se vuelve la **capa pro** detrás de login. Este documento renumera desde la Fase 1
> el trabajo del hub público.

---

## 1. Visión

Hub de noticias económicas para **público general chileno**, que recopila, clasifica y sintetiza
con IA lo que pasa en los mercados (nacional e internacional), organizado para que cualquiera
—no sólo un trader— entienda *qué está pasando y por qué*.

**Modelo:** Freemium.
- **Público (sin login):** portada curada, páginas por sección, noticias clasificadas, síntesis
  diaria, gráficos. Monetiza con publicidad (AdSense).
- **Pago / login:** agente IA, análisis profundo (Opus), alertas personalizadas, briefing,
  (futuro) estrategias.

**Métrica norte:** visitas. Todo lo público se diseña para tráfico orgánico (SEO) y retención
en portada.

---

## 2. Decisiones de producto (tomadas 2026-06-08)

| Decisión | Elección | Implicancia |
|----------|----------|-------------|
| Nicho | Público general económico (masivo) | Tono divulgativo, no sólo jerga de trading. Portada manda. |
| Estructura | Portada curada + páginas por sección + **etiquetas como filtro** | Una noticia, muchas etiquetas (sección × geografía × factor). Filtro "a tu pinta" sin login. |
| Monetización | Freemium (público + agente/funciones pagas) | Login sólo para lo "pro"; el resto abierto. |
| Estrategias | Diferida → **última fase** (capa pro) | Vuelve cuando el hub tenga audiencia que convertir. |

### Por qué "etiquetas como filtro" y no "secciones por geografía/matriz"
- La **portada** captura al público masivo: la mayoría entra a la home.
- Las **páginas por sección** (`/dolar`, `/cobre`, `/bitcoin`…) son URLs indexables → tráfico
  orgánico de Google, gratis y escalable.
- La **matriz** (sección × geografía) no se construye como navegación sino como **etiquetas**
  sobre cada noticia. "Fed sube tasas" sale en `/dolar` y filtrable como "internacional" sin
  duplicar estructura. El filtro "a tu pinta" sale casi gratis.

### Dos niveles de relevancia (noticias generales vs específicas)
> Decisión 2026-06-08. Una noticia se vive distinto según dónde se mira:
> - **En portada → `relevancia` general (0–1):** qué tan importante es para *cualquier* lector,
>   sin atarla a una divisa. Se explica intuitivo ("mueve mercados globales", "afecta tu bolsillo").
>   Las noticias generales (geopolítica amplia, macro) viven aquí como highlight, sin instrumento.
> - **En la página de cada sección → impacto/dirección PROPIOS de esa sección** (`secciones_impacto`).
>   La *misma* noticia puede ser alto impacto para el dólar y medio para el cobre. Al entrar a
>   `/dolar` ves su lectura para el dólar; a `/cobre`, la del cobre.
> Esto evita forzar "impacto sobre USD/CLP" a noticias que para el público son relevantes por otra razón.

### Secciones iniciales del hub
> Para el público da igual si es "instrumento" (se transa) o "índice/indicador" (se mide): todos
> son secciones con gráfico + noticias. Lo que manda es el interés masivo.

| Sección | Tipo | Por qué interesa al público |
|---------|------|------------------------------|
| Dólar (USD/CLP) | Instrumento | El chileno mira el dólar a diario |
| Cobre | Instrumento | "El sueldo de Chile" |
| Bitcoin / cripto | Instrumento | Enorme interés masivo, muchas búsquedas |
| S&P 500 | Índice | Termómetro de la bolsa de EE.UU. |
| IPSA | Índice | La bolsa chilena |
| Oro | Instrumento | Refugio clásico, interés en crisis |
| UF / inflación | Indicador | Muy chileno, alto volumen de búsqueda (candidato fuerte) |

Candidatos adicionales a evaluar en 2.x: petróleo (ya existe; afecta bencina), tasas/AFP.

---

## 3. Arquitectura objetivo

```
PÚBLICO (sin login)                          PRO (login — capa v1.00)
├─ / .............. portada curada           ├─ /app .......... dashboard trading (actual)
├─ /[seccion] ..... página por sección       ├─ agente IA (Sonnet/Opus)
├─ /noticia/[slug]  detalle de noticia       ├─ alertas personalizadas
├─ /tema/[factor] . página por factor         ├─ briefing descargable
└─ síntesis diaria pública                    └─ (futuro) estrategias

PIPELINE (cron v1.00 — se extiende)
├─ RSS multi-feed → dedup → Haiku clasifica
│    + NUEVO: etiqueta sección + geografía (nac/int) + score "destacable"
├─ precios de mercado (Yahoo/FRED/mindicador) + NUEVO: S&P500, IPSA, oro, UF…
├─ síntesis diaria (Sonnet)
└─ + NUEVO: curaduría de portada (top N por score)
```

---

## Fase 1: Cimientos del hub (datos + clasificación)

> Prerrequisito de todo lo visible. Sin etiquetas ricas no hay portada ni filtros.

| N°  | Descripción | Realizado | Quién |
|-----|-------------|-----------|-------|
| 1.1 | Definir taxonomía: secciones, geografía (nacional/internacional), factores (reusar A1–B6) | ☐ | TÚ+YO |
| 1.2 | Migración 0011: tabla `secciones` + `noticias.slug` + `analisis_ia` (secciones_impacto jsonb, secciones_lista, geografia, relevancia) | ☑ | YO |
| 1.3 | Extender prompt Haiku: + secciones_impacto (impacto+dirección POR sección) + geografía + relevancia general 0–1 | ☐ | YO |
| 1.4 | Backfill: re-clasificar noticias recientes con el nuevo prompt | ☐ | YO |
| 1.5 | Generar `slug` único por noticia (URLs `/noticia/[slug]`) | ☐ | YO |
| 1.6 | Endpoint público `GET /api/feed` (filtros: sección, geografía, factor, destacadas) | ☐ | YO |
| 1.7 | Testing de calidad de clasificación Haiku con noticias frescas (era 8.6, ahora crítico) | ☐ | TÚ |

---

## Fase 2: Cobertura de contenido (más fuentes, más secciones)

> Para público masivo: más volumen y variedad, sin perder calidad. Nacional + internacional.

| N°  | Descripción | Realizado | Quién |
|-----|-------------|-----------|-------|
| 2.1 | Ampliar feeds nacionales (Diario Financiero, Emol Economía, La Tercera/Pulso) | ☐ | TÚ+YO |
| 2.2 | Ampliar feeds internacionales (macro global, cripto, commodities) | ☐ | TÚ+YO |
| 2.3 | Confirmar set inicial de secciones (dólar, cobre, BTC, S&P 500, IPSA, oro, UF/inflación) | ☐ | TÚ+YO |
| 2.4 | Datos de mercado para cada sección nueva: S&P 500, IPSA, oro, UF (gráfico + factores) | ☐ | YO |
| 2.5 | Ponderación por difusión/credibilidad del medio (señal pre-IA, era 9.9) → alimenta score | ☐ | YO |

---

## Fase 3: UI pública — portada y navegación

> La cara del producto. Diseñada para retención en home y SEO en subpáginas.

| N°  | Descripción | Realizado | Quién |
|-----|-------------|-----------|-------|
| 3.1 | Rediseño de layout: separar shell público del shell "pro" (`/app`) | ☐ | YO |
| 3.2 | **Portada curada**: "lo más importante hoy" + síntesis diaria pública + grilla de destacadas | ☐ | YO |
| 3.3 | Barra de filtros por etiqueta (sección / nacional-internacional / factor) — el "a tu pinta" | ☐ | YO |
| 3.4 | Página por sección `/[seccion]`: gráfico + factores + noticias de esa sección | ☐ | YO |
| 3.5 | Página de detalle `/noticia/[slug]`: noticia + clasificación + relacionadas (SEO) | ☐ | YO |
| 3.6 | Página por factor/tema `/tema/[factor]` | ☐ | YO |
| 3.7 | Responsive + rendimiento (Core Web Vitals — importa para SEO y ads) | ☐ | YO |

---

## Fase 4: SEO y crecimiento de tráfico

> Sin esto, "público masivo" no ocurre. Es la fase que de verdad trae visitas. Empezar temprano.

| N°  | Descripción | Realizado | Quién |
|-----|-------------|-----------|-------|
| 4.1 | Metadatos dinámicos (title/description/OG) por noticia, sección y tema | ☐ | YO |
| 4.2 | `sitemap.xml` dinámico + `robots.txt` | ☐ | YO |
| 4.3 | Datos estructurados schema.org (NewsArticle) para Google News/Discover | ☐ | YO |
| 4.4 | URLs limpias y estables (slugs) — no romper enlaces | ☐ | YO |
| 4.5 | Registrar sitio en Google Search Console + medir indexación | ☐ | TÚ |
| 4.6 | (Opcional) Postular a Google News Publisher Center | ☐ | TÚ |

---

## Fase 5: Monetización (publicidad)

> Se activa cuando hay tráfico medible. No antes (AdSense rechaza sitios sin contenido/tráfico).

| N°  | Descripción | Realizado | Quién |
|-----|-------------|-----------|-------|
| 5.1 | Revisión legal mínima: "no es asesoría financiera" visible + términos + privacidad | ☐ | TÚ |
| 5.2 | Política de cookies / consentimiento (requerido por AdSense) | ☐ | YO |
| 5.3 | Postular y aprobar AdSense | ☐ | TÚ |
| 5.4 | Integrar slots de anuncios sin romper UX ni Core Web Vitals | ☐ | YO |
| 5.5 | Analítica de tráfico (qué secciones rinden) | ☐ | TÚ+YO |

---

## Fase 6: Capa Pro (freemium) — consolidar v1.00 detrás de login

> Lo ya construido (agente, alertas, briefing) pasa a ser el valor pagado. Multi-usuario real.

| N°  | Descripción | Realizado | Quién |
|-----|-------------|-----------|-------|
| 6.1 | Mover dashboard de trading actual a `/app` (sólo login) | ☐ | YO |
| 6.2 | Auth multi-usuario real (Supabase Auth) + RLS por usuario | ☐ | YO |
| 6.3 | Definir qué es gratis vs pago (agente, Opus, alertas personalizadas, briefing) | ☐ | TÚ+YO |
| 6.4 | Cobro (Stripe) + topes de uso de IA por usuario | ☐ | TÚ+YO |

---

## Fase 7: Sistema de estrategias (feature pro — diferida de v1.00)

> Era la Fase 11 del v1.00. Se retoma como feature pro cuando el hub tenga audiencia. Se construye
> multi-user-ready (`usuario_id` desde el día 1). Permite registrar tesis de entrada, gestionar el
> ciclo de vida de una operación y medir resultados; base para que el agente aprenda del historial.

| N°  | Descripción | Realizado | Quién |
|-----|-------------|-----------|-------|
| 7.1 | Diseño de tabla `estrategias`/`operaciones` (instrumento, sesgo, entrada, stop, target, tesis, estado, resultado) + `usuario_id` | ☐ | TÚ+YO |
| 7.2 | Migración + endpoints CRUD (crear/listar/cerrar operación) | ☐ | YO |
| 7.3 | UI: panel "Mis estrategias" (registrar entrada con tesis, ver abiertas/cerradas, P&L) | ☐ | YO |
| 7.4 | Vincular operación con contexto del momento (factores + noticias + respuesta del agente) | ☐ | YO |
| 7.5 | Que el agente lea el historial de estrategias del usuario en su contexto | ☐ | YO |
| 7.6 | Estrategias por instrumento (multi-instrumento, ya soportado por diseño) | ☐ | YO |

---

## 4. Orden recomendado y por qué

1. **Fase 1** (cimientos de datos) — todo lo demás depende de las etiquetas.
2. **Fases 2 y 3 en paralelo** (más contenido + portada/páginas) — para tener algo visible y poblado pronto.
3. **Fase 4** (SEO) apenas haya páginas públicas estables — es lento en dar fruto, conviene empezar temprano.
4. **Fase 5** (ads) sólo cuando Search Console muestre tráfico real.
5. **Fase 6** (pro/freemium) cuando el hub tenga audiencia que convertir.
6. **Fase 7** (estrategias) al final, como feature pro madura.

**No empezar por ads ni por login multi-usuario.** Primero contenido + portada + SEO → tráfico.
Monetización y cobro vienen después, cuando hay a quién mostrarle anuncios y a quién convertir.

---

## 5. Qué se reutiliza de v1.00

- ☑ Pipeline completo (cron, RSS, Haiku, precios, síntesis) — se reutiliza y extiende.
- ☑ Dashboard de trading — se mueve a `/app` como capa pro (Fase 6).
- ☑ Ledger de uso/costo de IA, alertas, briefing — pasan a la capa pro.
- ➡️ Fase 11 v1.00 (estrategias) → Fase 7 de este programa.
```
