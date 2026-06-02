# Programa de Trabajo - EZ Trader

**Sistema web personal de análisis de noticias y apoyo para trading CDF (USD/CLP)**

**Objetivo:** Web personal que recopila noticias automáticamente, las analiza con IA, muestra cotizaciones en tiempo real, guarda historial y permite consultar a un agente para apoyar decisiones de trading.

**Stack:** Next.js (Netlify) | Supabase (BD + Cron + Edge Functions) | IA (por definir en Fase 7)

---

## Arquitectura general

```
FRONTEND (Next.js en Vercel)
├─ Tab USD/CLP: Panel noticias | Cotización + gráficos | Agente (chat)
└─ Tab futuro: otros instrumentos (misma estructura)

BACKEND (Supabase Edge Functions)
├─ GET /noticias
├─ GET /cotizacion
├─ GET /analisis-historico
└─ POST /consulta-agente

CRON JOB (Supabase - cada 15 min)
└─ Obtiene noticias → clasifica con IA → guarda en BD

BASE DE DATOS (Supabase)
├─ noticias, cotizaciones, analisis, conversaciones
└─ (diseño detallado: Fase 2)
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
| 1.7  | Conectar repositorio GitHub con Netlify (deploy automático)| ☑      | TÚ+YO  |

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
| 3.7  | Integrar dato de mercado: Diferencial tasas TPM/Fed [Tier 1]| ☐     | YO     |
| 3.8  | Crear endpoint GET /api/noticias (con filtros)           | ☑        | YO     |
| 3.9  | Crear endpoint GET /api/cotizacion                       | ☑        | YO     |
| 3.10 | Crear endpoint GET /api/datos-mercado (cobre, DXY, tasas)| ☑        | YO     |
| 3.11 | Crear endpoint GET /api/analisis-historico               | ☐        | YO     |
| 3.12 | Configurar Cron Job (Supabase cada 15 min)               | ☑        | TÚ+YO  |
| 3.13 | Guardar noticias, cotización y datos de mercado en BD    | ☑        | YO     |
| 3.14 | Testing de endpoints y cron (verificar que funciona)     | ☑        | TÚ+YO  |
| 3.15 | Crear motor de alertas por reglas (cobre, DXY, precio) — integrado al cron| ☑ | YO |
| 3.16 | Afinar cadencia de feeds críticos para ganar latencia al bróker| ☐  | TÚ+YO  |
| 3.17 | [Post-MVP] Integrar dato de mercado: Petróleo [Tier 2]   | ☐        | YO     |
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
| 4.10 | Mostrar alertas en UI (badge/notificación en panel colapsable)| ☐  | YO     |
| 4.11 | [Post-MVP] Botón "Refresh live" (fetch on-demand de noticias)| ☐   | YO     |
| 4.12 | [Post-MVP] Gráfico USD/CLP superpuesto con Cobre (ver divergencias)| ☐ | YO  |
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
| 5.10 | Dar de baja Netlify                                      | ☐        | TÚ     |

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
> ⚠️ Proveedor de IA pendiente de confirmar: OpenAI tuvo problemas de pago con tarjetas
> chilenas. Posible alternativa: Gemini (Google AI Studio, tiene tier gratis).

| N°   | Descripción                                              | Realizado | Quién  |
|------|----------------------------------------------------------|-----------|--------|
| 7.1  | Confirmar proveedor de IA (OpenAI vs Gemini) y modelos   | ☐        | TÚ+YO  |
| 7.10 | Configurar API key y variables de entorno (local + Cloudflare)| ☐   | TÚ+YO  |
| 7.11 | Implementar auth gate: login + middleware ✓ (ya hecho)   | ☑        | YO     |
| 7.12 | Configurar tope de gasto mensual en proveedor de IA      | ☐        | TÚ     |
| 7.2  | Crear endpoint POST /api/consulta-agente                 | ☐        | YO     |
| 7.13 | Agregar rate limiting + max_tokens + límite de input     | ☐        | YO     |
| 7.3  | Diseñar prompt del agente (contexto + noticias del día)  | ☐        | TÚ+YO  |
| 7.4  | Conectar chat del frontend con el agente                 | ☐        | YO     |
| 7.5  | Guardar historial de conversaciones en BD                | ☐        | YO     |
| 7.6  | Testing del agente (calidad de respuestas)               | ☐        | TÚ     |
| 7.7  | Capacidad de planificación de estrategias (ver docs/estrategia.md)| ☐ | TÚ+YO |
| 7.8  | Alertas interpretadas por el agente (capa sobre reglas)  | ☐        | YO     |
| 7.9  | [Fase 2] Reporting rápido (resumen de fin de semana)     | ☐        | YO     |

---

## Fase 8: Agregar IA para clasificación de noticias

| N°   | Descripción                                              | Realizado | Quién  |
|------|----------------------------------------------------------|-----------|--------|
| 8.1  | Elegir modelo para clasificación (mismo proveedor que agente, tier mini)| ☐ | TÚ+YO |
| 8.2  | Crear prompt para clasificar impacto (alto/medio/bajo)   | ☐        | TÚ+YO  |
| 8.3  | Crear prompt para detectar factor afectado (ver docs/factores-usd-clp.md)| ☐ | TÚ+YO |
| 8.4  | Integrar clasificación en el cron job                    | ☐        | YO     |
| 8.5  | Mostrar clasificación en tarjetas de noticias            | ☐        | YO     |
| 8.6  | Testing de calidad de análisis                           | ☐        | TÚ     |
| 8.7  | Análisis fino de factor-noticia: China [Tier 2]          | ☐        | YO     |
| 8.8  | Análisis de factor-noticia: Fed/FOMC/macro EE.UU. [Tier 2]| ☐       | YO     |
| 8.9  | Análisis de factor-noticia: Geopolítica [Tier 2]         | ☐        | YO     |
| 8.10 | Análisis de factor-noticia: Intervención BCCh [Tier 3]   | ☐        | YO     |
| 8.11 | Análisis de factor-noticia: Política local/AFP [Tier 3]  | ☐        | YO     |
| 8.12 | Análisis de factor-noticia: IPC Chile [Tier 3]           | ☐        | YO     |

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
