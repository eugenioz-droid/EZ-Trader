# Programa de Trabajo - EZ Trader

**Sistema web personal de análisis de noticias y apoyo para trading CDF (USD/CLP)**

**Objetivo:** Web personal que recopila noticias automáticamente, las analiza con IA, muestra cotizaciones en tiempo real, guarda historial y permite consultar a un agente para apoyar decisiones de trading.

**Stack:** Next.js (Cloudflare Workers vía OpenNext) | Supabase (BD + pg_cron) | Anthropic Claude API (Sonnet/Opus/Haiku)

---

## Arquitectura general

```
FRONTEND (Next.js en Cloudflare Workers via OpenNext)
├─ Tab USD/CLP: Noticias | Gráfico+Cotización | Factores | Agente (chat)
└─ Tab futuro: otros instrumentos (misma estructura)

BACKEND (Next.js API Routes en Cloudflare Workers)
├─ GET  /api/noticias
├─ GET  /api/cotizacion
├─ GET  /api/historial
├─ GET  /api/factores
├─ GET  /api/alertas      POST /api/alertas
├─ GET  /api/conversacion
├─ POST /api/consulta-agente
├─ GET  /api/cron  (llamado por Supabase pg_cron)
├─ GET  /api/analisis-historico  [PENDIENTE 3.11]
└─ POST /api/auth  GET /api/auth/logout

CRON JOB (Supabase pg_cron - cada 5 min)
├─ Obtiene noticias RSS (6 feeds incl. geopolítica Medio Oriente)
├─ Obtiene precios: USDCLP (Twelve Data), Cobre/DXY/Petróleo (Yahoo), Fed/TPM (FRED)
├─ Evalúa reglas de alerta (cobre, DXY, USDCLP)
└─ Clasifica noticias nuevas con Haiku → genera alertas alto impacto

BASE DE DATOS (Supabase PostgreSQL)
├─ instrumentos, factores, fuentes, series
├─ datos_mercado, noticias, analisis_ia
├─ reglas_alerta, alertas
├─ conversaciones, mensajes
└─ uso_ia (ledger tokens/costo Claude)
```

---

## Fase 1: Setup - Cuentas, repositorio y estructura

| N°   | Descripción                                              | Realizado | Quién  |
|------|----------------------------------------------------------|-----------|--------|
| 1.1  | Crear cuenta Vercel                                      | ☑        | TÚ     |
| 1.2  | Crear cuenta Supabase                                    | ☑        | TÚ     |
| 1.3  | Crear repositorio "EZ-Trader" en GitHub                  | ☑        | TÚ     |
| 1.4  | Conectar carpeta local con GitHub (git init + push)      | ☑        | TÚ     |
| 1.5  | Crear estructura de carpetas del proyecto                | ☑        | YO     |
| 1.6  | Crear proyecto en Supabase (para BD)                     | ☑        | TÚ     |
| 1.7  | Conectar repositorio GitHub con Cloudflare Workers Builds (CI/CD automático) — reemplazó Netlify | ☑ | TÚ+YO |

---

## Fase 2: Definición y diseño de BD

> Esta fase es crítica. Necesitamos definir bien antes de programar para no hacer retrabajos.

| N°   | Descripción                                              | Realizado | Quién  |
|------|----------------------------------------------------------|-----------|--------|
| 2.1  | Definir fuentes de noticias y datos (ver docs/fuentes-datos.md) | ☑  | TÚ+YO  |
| 2.2  | Definir factores que afectan USD/CLP (ver docs/factores-usd-clp.md) | ☑ | TÚ+YO  |
| 2.3  | Definir foco del dashboard y gráficos (ver docs/diseno-mvp.md) | ☑  | TÚ+YO  |
| 2.4  | Definir modelo de uso y operación del agente (ver docs/diseno-mvp.md) | ☑ | TÚ+YO |
| 2.5  | Diseñar estructura de tablas en BD (ver docs/bd-diseno.md + migraciones)| ☑ | YO |
| 2.6  | Crear tablas en Supabase (ejecutar migraciones 0001 y 0002)| ☑      | TÚ+YO  |

---

## Fase 3: Backend - APIs y Cron Job

| N°   | Descripción                                              | Realizado | Quién  |
|------|----------------------------------------------------------|-----------|--------|
| 3.0  | Instalar Node.js (portable) y agregarlo al PATH de Git Bash (PREREQUISITO)| ☑ | TÚ |
| 3.1  | Setup inicial Next.js (estructura del proyecto)          | ☑        | YO     |
| 3.2  | Configurar variables de entorno + cliente Supabase       | ☑        | YO     |
| 3.3  | Integrar fuente de noticias (Google News RSS)            | ☑        | YO     |
| 3.4  | Integrar API financiera USD/CLP (Twelve Data)            | ☑        | YO     |
| 3.5  | Integrar dato de mercado: Cobre (Yahoo Finance HG=F)     | ☑        | YO     |
| 3.6  | Integrar dato de mercado: DXY (Yahoo Finance DX-Y.NYB)   | ☑        | YO     |
| 3.7  | Integrar dato de mercado: Diferencial tasas TPM/Fed [Tier 1]| ☑     | YO     |
|      | → Fed: FRED/DFF. TPM Chile: **mindicador.cl** (API chilena gratis, sin key, al día) ✓. Reemplazó el proxy FRED lagged y el BCCh que nunca respondió | | |
| 3.8  | Crear endpoint GET /api/noticias (con filtros)           | ☑        | YO     |
| 3.9  | Crear endpoint GET /api/cotizacion                       | ☑        | YO     |
| 3.10 | Crear endpoint GET /api/datos-mercado (cobre, DXY, tasas)| ☑        | YO     |
| 3.11 | Crear endpoint GET /api/analisis-historico               | ☐        | YO     |
| 3.12 | Configurar Cron Job (Supabase pg_cron → cada 5 min desde 2026-06-03) | ☑ | TÚ+YO |
| 3.13 | Guardar noticias, cotización y datos de mercado en BD    | ☑        | YO     |
| 3.14 | Testing de endpoints y cron (verificar que funciona)     | ☑        | TÚ+YO  |
| 3.15 | Crear motor de alertas por reglas (cobre, DXY, precio) — integrado al cron| ☑ | YO |
| 3.16 | Afinar cadencia de feeds críticos → cron 5 min + feed geopolítico Medio Oriente agregado | ☑ | TÚ+YO |
| 3.17 | Integrar dato de mercado: Petróleo [Tier 2] (Yahoo CL=F) | ☑        | YO     |
| 3.18 | [Post-MVP] Integrar dato de mercado: VIX [Tier 2]        | ☐        | YO     |
| 3.19 | Crear cuentas/keys de APIs: Twelve Data ☑ FRED ☑ Banco Central (pendiente correo) | ☑* | TÚ |

---

## Fase 4: Frontend - Dashboard

| N°   | Descripción                                              | Realizado | Quién  |
|------|----------------------------------------------------------|-----------|--------|
| 4.1  | Crear layout principal (header, tabs, panels)            | ☑        | YO     |
| 4.2  | Panel de noticias (tarjetas con título, resumen, impacto)| ☑        | YO     |
| 4.3  | Panel de cotización USD/CLP en tiempo real               | ☑        | YO     |
| 4.4  | Panel de factores de mercado (cobre, DXY, tasas + dirección)| ☑     | YO     |
| 4.4.a| Indicador de alineación de factores (sesgo direccional cuando los Tier 1 coinciden)| ☑ | YO |
| 4.5  | Filtros por fuente de noticias                           | ☑        | YO     |
| 4.6  | Panel del agente (chat lateral)                          | ☑        | YO     |
| 4.7  | Indicador de última actualización (header + cotización)  | ☑        | YO     |
| 4.7.a| Revisar fuentes RSS más actuales (FXStreet + investingLive agregadas)| ☑ | TÚ+YO |
| 4.12 | Gráfico histórico USD/CLP (SVG, columna central)         | ☑        | YO     |
| 4.14 | Briefing descargable para GPT (puente mientras no hay agente)| ☑    | YO     |
| 4.8  | Responsive (funciona en móvil y desktop)                 | ☑        | YO     |
| 4.9  | Estructura para segundo tab (otro instrumento, vacío)    | ☐        | YO     |
| 4.10 | Mostrar alertas en UI (badge/notificación en panel colapsable)| ☑  | YO     |
| 4.11 | [Post-MVP] Botón "Refresh live" (fetch on-demand de noticias)| ☐   | YO     |
| 4.12 | Gráfico USD/CLP superpuesto con Cobre/DXY/Petróleo + selector de período (1d/1sem/1mes/3mes) ✓| ☑ | YO  |
| 4.13 | Pines de noticias en el gráfico — versión interina por palabras clave (mejora con IA en Fase 7)| ☑ | YO |

---

## Fase 5: Migración a Cloudflare

> Reemplaza Netlify como plataforma de deploy. Razones: firewall corporativo bloquea
> *.netlify.app y los créditos de build se agotaron. Cloudflare Pages + Workers Paid
> ($5/mes) resuelve ambos problemas y cubre todas las apps futuras en el mismo plan.
> Requiere adaptador OpenNext (recomendado por Cloudflare para Next.js App Router).

| N°   | Descripción                                              | Realizado | Quién  |
|------|----------------------------------------------------------|-----------|--------|
| 5.1  | Crear cuenta Cloudflare y activar Workers Paid ($5/mes)  | ☑        | TÚ     |
| 5.2  | Instalar OpenNext + Wrangler en el proyecto              | ☑        | YO     |
| 5.3  | Crear open-next.config.ts y wrangler.toml                | ☑        | YO     |
| 5.4  | Ajustar next.config.mjs y scripts de build para Cloudflare| ☑       | YO     |
| 5.5  | Conectar repositorio GitHub con Cloudflare Workers       | ☑        | TÚ     |
| 5.6  | Migrar variables de entorno a Cloudflare (wrangler secret bulk + [vars])| ☑ | TÚ+YO |
| 5.7  | Testing del deploy: app, login, APIs y middleware        | ☑        | TÚ+YO  |
| 5.8  | Actualizar URL del cron en Supabase al nuevo dominio     | ☑        | TÚ+YO  |
| 5.9  | Monitoreo post-migración (logs, errores)                 | ☑        | TÚ+YO  |
| 5.10 | Dar de baja Netlify                                      | ☑        | TÚ     |

---

## Fase 6: Testing, ajustes y Deploy

| N°   | Descripción                                              | Realizado | Quién  |
|------|----------------------------------------------------------|-----------|--------|
| 6.1  | Testing completo del flujo (noticias → BD → frontend)    | ☑        | TÚ+YO  |
| 6.2  | Verificar que cron ejecuta correctamente cada 15 min     | ☑        | TÚ+YO  |
| 6.3  | Deploy en producción y verificar (ahora Cloudflare)      | ☑        | YO     |
| 6.4  | Ajustes finales según lo que veas en uso real            | ☑        | YO     |

---

## Fase 7: Agregar agente conversacional

> Filas ordenadas por dependencia lógica. El bloque de setup + seguridad
> (7.1, 7.10–7.13) es prerrequisito para exponer el agente sin riesgo de robo de tokens.
> ✅ PROVEEDOR CONFIRMADO (2026-06-02): **Anthropic (Claude API)**. Cuenta pagada con
> saldo inicial de US$5, límite mensual US$500 (se reinicia el 30). OpenAI descartado
> (rechazó tarjetas chilenas).
>
> **Arquitectura de modelos (decidida 2026-06-02):**
> - **Agente de estrategia (chat, día a día):** `claude-sonnet-4-6` — "power" para macro.
> - **Análisis profundo (on-demand, botón):** `claude-opus-4-8` — el usuario decide cuándo
>   gastar más (mejor para ponderar contradicciones, credibilidad de medios, difusión de noticias).
> - **Clasificación de noticias (cron, Fase 8):** `claude-haiku-4-5-20251001` — ultra barato.
> - El modelo de cada rol va en **variable de entorno** (no hardcodeado) para poder cambiarlo
>   sin tocar código y para soportar selección por usuario en un futuro SaaS.

| N°   | Descripción                                              | Realizado | Quién  |
|------|----------------------------------------------------------|-----------|--------|
| 7.1  | Confirmar proveedor de IA → **Anthropic Claude** ✓       | ☑        | TÚ+YO  |
| 7.10 | Configurar API key y variables de entorno (local ✓ / Cloudflare pendiente)| ☑* | TÚ+YO  |
| 7.11 | Implementar auth gate: login + middleware ✓ (ya hecho)   | ☑        | YO     |
| 7.12 | Configurar tope de gasto mensual en proveedor de IA      | ☑        | TÚ     |
| 7.14 | Modelo de cada rol en variable de entorno (no hardcode)  | ☑        | YO     |
| 7.15 | Tabla de uso/costo de tokens (ledger 0005) + registrar cada llamada| ☑ | YO     |
| 7.2  | Crear endpoint POST /api/consulta-agente (param profundidad: Sonnet/Opus)| ☑ | YO |
| 7.13 | Agregar rate limiting + max_tokens + límite de input     | ☑        | YO     |
| 7.3  | Diseñar prompt del agente (contexto + noticias del día) — v1| ☑     | TÚ+YO  |
| 7.4  | Conectar chat del frontend con el agente                 | ☑        | YO     |
| 7.16 | Botón "Análisis profundo" en el chat (dispara Opus)      | ☑        | YO     |
| 7.5  | Guardar historial de conversaciones en BD + multi-turn (Claude recibe últimos 3 intercambios) | ☑ | YO |
| 7.6  | Testing del agente (calidad de respuestas)               | ☐        | TÚ     |
| 7.7  | Sistema de trazabilidad de estrategias → **MOVIDO a Fase 11** (consolidado)| ➡️ | TÚ+YO  |
| 7.8  | Alertas interpretadas por el agente (capa sobre reglas)  | ☑        | YO     |
| 7.9  | [Fase 2] Reporting rápido (resumen de fin de semana)     | ☐        | YO     |

---

## Fase 8: IA para clasificación de noticias

> Clasificador Haiku implementado en `app/lib/clasificador.ts`. Se ejecuta en cada cron.
> Bug crítico corregido 2026-06-03: el upsert sin UNIQUE constraint silenciaba los inserts.
> Migración 0006 aplicada (UNIQUE en analisis_ia.noticia_id).

| N°   | Descripción                                              | Realizado | Quién  |
|------|----------------------------------------------------------|-----------|--------|
| 8.1  | Modelo para clasificación: Haiku (`claude-haiku-4-5-20251001`) | ☑   | TÚ+YO  |
| 8.2  | Prompt para clasificar impacto (alto/medio/bajo) + confianza | ☑    | TÚ+YO  |
| 8.3  | Prompt para detectar factor afectado (11 factores: A1–B6) | ☑       | TÚ+YO  |
| 8.4  | Integración en el cron + alertas automáticas alto impacto ≥0.65 | ☑  | YO     |
| 8.5  | Mostrar clasificación en tarjetas (impacto/factor/dirección/confianza) — código listo en PanelNoticias, se activa al llegar datos Haiku | ☑ | YO |
| 8.6  | Testing de calidad de análisis (requiere Haiku corriendo con noticias frescas) | ☐ | TÚ |
| 8.7–8.12 | Análisis fino por factor (China, Fed, Geopolítica, BCCh, AFP, IPC) | ☑ (en prompt) | YO |

---

## Fase 9: [FUTURO] Producto comercial multi-usuario (SaaS)

> Visión a futuro. La herramienta personal y el producto comercial son **el mismo código
> en distintas etapas** si se toman decisiones baratas desde ya (9.1 y 9.2 ya hechas).
> Mantener el descargo de "no es asesoría financiera" en todo (ver docs/estrategia.md).
>
> **PUENTE CLAVE (decidido 2026-06-03):** el Sistema de Estrategias (Fase 11) es el natural
> punto de entrada al multi-usuario. Al construirlo, su modelo de datos debe quedar
> **multi-user-ready desde el día 1** (columna `usuario_id` nullable + diseño con RLS en
> mente), aunque el login multi-usuario real (9.3) se construya después. Misma filosofía
> de "puerta abierta" que 9.1/9.2: costo casi nulo ahora, evita reescritura después.

| N°   | Descripción                                              | Realizado | Quién  |
|------|----------------------------------------------------------|-----------|--------|
| 9.1  | [Puerta abierta] Modelo en env var, no hardcode          | ☑        | YO     |
| 9.2  | [Puerta abierta] Medir tokens/costo por llamada (uso_ia ledger = tarea 7.15) | ☑ | YO |
| 9.3  | Auth multi-usuario real (Supabase Auth) + RLS por usuario| ☐        | YO     |
| 9.4  | Estrategias propias por usuario (factores/instrumentos/prompts configurables)| ☐ | YO |
| 9.5  | Selección de modelo por usuario (ellos eligen Opus = pagan más)| ☐    | YO     |
| 9.6  | Medición y cobro de tokens con margen (Stripe + topes por usuario)| ☐ | TÚ+YO |
| 9.7  | Rate limiting + topes duros por usuario (anti-abuso de API key)| ☐    | YO     |
| 9.8  | Términos de servicio + revisión legal (no asesoría financiera)| ☐     | TÚ     |
| 9.9  | Ponderación de noticias por difusión/credibilidad del medio (señal pre-IA)| ☐ | YO |

---

## Fase 10: Mejoras UX post-MVP (backlog)

> Definidas 2026-06-03. Diseñadas para ser extensibles a multi-instrumento.
> El sistema de estrategias se separó a Fase 11 (era 10.2 + 7.7 duplicados).

| N°    | Descripción                                                          | Realizado | Quién  |
|-------|----------------------------------------------------------------------|-----------|--------|
| 10.1  | Acceso a conversaciones anteriores (selector de chat en PanelAgente) | ☐        | YO     |
| 10.2  | Pines de noticias con color por impacto superpuestos en el gráfico   | ☐        | YO     |
| 10.3  | Segundo tab de instrumento (estructura básica)                        | ☐        | YO     |
| 10.4  | **Ampliar/auditar fuentes de noticias**: revisar qué medios relevantes quedan fuera y sumar RSS directos rápidos (Reuters/Bloomberg markets, económico chileno). Hoy: 1 fuente directa (investingLive) + 5 búsquedas Google News | ☐ | TÚ+YO |
| 10.5  | [Post-MVP] Botón Refresh on-demand de noticias                       | ☐        | YO     |
| 10.6  | TPM real para TPM → **RESUELTO con mindicador.cl** (no se necesitó el BCCh) | ☑    | YO     |

---

## Fase 11: Sistema de Estrategias (trazabilidad + base multi-usuario)

> Consolida lo que estaba duplicado en 7.7 y 10.2. Es el **puente al SaaS (Fase 9)**:
> se construye multi-user-ready (columna `usuario_id` nullable desde el día 1) aunque
> el usuario hoy sea uno solo. Permite registrar tesis de entrada, gestionar el ciclo
> de vida de una operación y medir resultados — base para que el agente aprenda del
> historial del usuario y, a futuro, para estrategias por usuario en el SaaS.

| N°    | Descripción                                                          | Realizado | Quién  |
|-------|----------------------------------------------------------------------|-----------|--------|
| 11.1  | Diseño de tabla `estrategias`/`operaciones` (instrumento, sesgo, entrada, stop, target, tesis, estado, resultado) + `usuario_id` nullable | ☐ | TÚ+YO |
| 11.2  | Migración + endpoints CRUD (crear/listar/cerrar operación)           | ☐        | YO     |
| 11.3  | UI: panel "Mis estrategias" (registrar entrada con tesis, ver abiertas/cerradas, P&L) | ☐ | YO |
| 11.4  | Vincular operación con contexto del momento (factores + noticias + respuesta del agente) | ☐ | YO |
| 11.5  | Que el agente lea el historial de estrategias del usuario en su contexto | ☐    | YO     |
| 11.6  | [Multi-instrumento] Estrategias por instrumento (ya soportado por diseño) | ☐   | YO     |

---

## Notas generales

### Símbolos
- `☐` = Pendiente
- `☑` = Realizado
- `☑*` = Realizado pero con cambios pendientes

### Tiempo estimado
- Fase 1: 1-2 días
- Fase 2: 1-2 días (importante no saltársela)
- Fases 3-4: 7-10 días
- Fase 5: 1-2 días (migración a Cloudflare)
- Fase 6: 1 día (testing y ajustes post-migración)
- Fases 7-8: después, cuando confirmes proveedor de IA

### Quién hace qué
- **TÚ** = Crear cuentas, tomar decisiones, testing, aprobar diseños
- **YO** = Programar, configurar, debuggear, hacer deploy
- **TÚ+YO** = Decisiones conjuntas que requieren tu criterio + mi conocimiento técnico

### Costos estimados (MVP sin IA)
- **Vercel:** $0
- **Supabase:** $0
- **APIs de noticias/cotización:** $0 (usar fuentes gratuitas)
- **TOTAL MVP:** $0/mes
