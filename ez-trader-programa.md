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
| 2.5  | Diseñar estructura de tablas en BD (con Opus)            | ☐        | YO     |
| 2.6  | Crear tablas en Supabase según diseño                    | ☐        | YO     |

---

## Fase 3: Backend - APIs y Cron Job

| N°   | Descripción                                              | Realizado | Quién  |
|------|----------------------------------------------------------|-----------|--------|
| 3.0  | Instalar Node.js (portable) y agregarlo al PATH de Git Bash (PREREQUISITO)| ☑ | TÚ |
| 3.1  | Setup inicial Next.js (estructura del proyecto)          | ☑        | YO     |
| 3.2  | Configurar variables de entorno (Supabase, APIs externas)| ☐        | YO     |
| 3.3  | Integrar fuente de noticias (RSS o API definida en 2.1)  | ☐        | YO     |
| 3.4  | Integrar API financiera para cotización USD/CLP          | ☐        | YO     |
| 3.5  | Integrar dato de mercado: Cobre [Tier 1]                 | ☐        | YO     |
| 3.6  | Integrar dato de mercado: Dólar global DXY [Tier 1]      | ☐        | YO     |
| 3.7  | Integrar dato de mercado: Diferencial tasas TPM/Fed [Tier 1]| ☐     | YO     |
| 3.8  | Crear endpoint GET /api/noticias (con filtros)           | ☐        | YO     |
| 3.9  | Crear endpoint GET /api/cotizacion                       | ☐        | YO     |
| 3.10 | Crear endpoint GET /api/datos-mercado (cobre, DXY, tasas)| ☐        | YO     |
| 3.11 | Crear endpoint GET /api/analisis-historico               | ☐        | YO     |
| 3.12 | Crear Cron Job en Supabase (cada 15 min)                 | ☐        | YO     |
| 3.13 | Guardar noticias, cotización y datos de mercado en BD    | ☐        | YO     |
| 3.14 | Testing de endpoints y cron (verificar que funciona)     | ☐        | TÚ+YO  |
| 3.15 | Crear motor de alertas por reglas (umbrales: cobre, DXY, precio, noticia alto impacto)| ☐ | YO |
| 3.16 | Afinar cadencia de feeds críticos para ganar latencia al bróker| ☐  | TÚ+YO  |
| 3.17 | [Post-MVP] Integrar dato de mercado: Petróleo [Tier 2]   | ☐        | YO     |
| 3.18 | [Post-MVP] Integrar dato de mercado: VIX [Tier 2]        | ☐        | YO     |
| 3.19 | Crear cuentas/keys de APIs: Twelve Data, FRED, Banco Central BDE (prerequisito de 3.3–3.7)| ☐ | TÚ |

---

## Fase 4: Frontend - Dashboard

| N°   | Descripción                                              | Realizado | Quién  |
|------|----------------------------------------------------------|-----------|--------|
| 4.1  | Crear layout principal (header, tabs, panels)            | ☐        | YO     |
| 4.2  | Panel de noticias (tarjetas con título, resumen, impacto)| ☐        | YO     |
| 4.3  | Panel de cotización USD/CLP en tiempo real               | ☐        | YO     |
| 4.4  | Panel de factores de mercado (cobre, DXY, tasas + dirección)| ☐     | YO     |
| 4.4.a| Indicador de alineación de factores (sesgo direccional cuando los Tier 1 coinciden)| ☐ | YO |
| 4.5  | Filtros por factor, por impacto, por fecha               | ☐        | YO     |
| 4.6  | Panel del agente (chat lateral)                          | ☐        | YO     |
| 4.7  | Indicador de última actualización                        | ☐        | YO     |
| 4.8  | Responsive (funciona en móvil y desktop)                 | ☐        | YO     |
| 4.9  | Estructura para segundo tab (otro instrumento, vacío)    | ☐        | YO     |
| 4.10 | Mostrar alertas en UI (badge/notificación en panel colapsable)| ☐  | YO     |
| 4.11 | [Post-MVP] Botón "Refresh live" (fetch on-demand de noticias)| ☐   | YO     |
| 4.12 | [Post-MVP] Gráfico USD/CLP superpuesto con Cobre (ver divergencias)| ☐ | YO  |
| 4.13 | [Post-MVP] Línea de precio con marcadores de noticias de alto impacto| ☐ | YO |

---

## Fase 5: Testing, ajustes y Deploy

| N°   | Descripción                                              | Realizado | Quién  |
|------|----------------------------------------------------------|-----------|--------|
| 5.1  | Testing completo del flujo (noticias → BD → frontend)    | ☐        | TÚ+YO  |
| 5.2  | Verificar que cron ejecuta correctamente cada 15 min     | ☐        | TÚ+YO  |
| 5.3  | Deploy a Netlify y verificar en producción               | ☐        | YO     |
| 5.4  | Monitoreo post-launch (logs, errores)                    | ☐        | TÚ+YO  |
| 5.5  | Ajustes finales según lo que veas en uso real            | ☐        | YO     |

---

## Fase 6: Agregar agente conversacional

| N°   | Descripción                                              | Realizado | Quién  |
|------|----------------------------------------------------------|-----------|--------|
| 6.1  | Elegir servicio de IA para el agente                     | ☐        | TÚ+YO  |
| 6.2  | Crear endpoint POST /api/consulta-agente                 | ☐        | YO     |
| 6.3  | Diseñar prompt del agente (contexto + noticias del día)  | ☐        | TÚ+YO  |
| 6.4  | Conectar chat del frontend con el agente                 | ☐        | YO     |
| 6.5  | Guardar historial de conversaciones en BD                | ☐        | YO     |
| 6.6  | Testing del agente (calidad de respuestas)               | ☐        | TÚ     |
| 6.7  | Capacidad de planificación de estrategias (agente, ver docs/estrategia.md)| ☐ | TÚ+YO |
| 6.8  | Alertas interpretadas por el agente (capa sobre las de reglas)| ☐    | YO     |
| 6.9  | [Fase 2] Reporting rápido (resumen de fin de semana)     | ☐        | YO     |

---

## Fase 7: Agregar IA para clasificación de noticias

| N°   | Descripción                                              | Realizado | Quién  |
|------|----------------------------------------------------------|-----------|--------|
| 7.1  | Elegir servicio de IA (gratis o pago según presupuesto)  | ☐        | TÚ+YO  |
| 7.2  | Crear prompt para clasificar impacto (alto/medio/bajo)   | ☐        | TÚ+YO  |
| 7.3  | Crear prompt para detectar factor afectado (taxonomía de docs/factores-usd-clp.md) | ☐ | TÚ+YO  |
| 7.4  | Integrar clasificación en el cron job                    | ☐        | YO     |
| 7.5  | Mostrar clasificación en tarjetas de noticias            | ☐        | YO     |
| 7.6  | Testing de calidad de análisis                           | ☐        | TÚ     |
| 7.7  | Análisis fino de factor-noticia: China [Tier 2]          | ☐        | YO     |
| 7.8  | Análisis de factor-noticia: Fed/FOMC/macro EE.UU. [Tier 2]| ☐       | YO     |
| 7.9  | Análisis de factor-noticia: Geopolítica [Tier 2]         | ☐        | YO     |
| 7.10 | Análisis de factor-noticia: Intervención BCCh [Tier 3]   | ☐        | YO     |
| 7.11 | Análisis de factor-noticia: Política local/AFP [Tier 3]  | ☐        | YO     |
| 7.12 | Análisis de factor-noticia: IPC Chile [Tier 3]           | ☐        | YO     |

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
- Fase 5: 2-3 días
- Fases 6-7: después, cuando tengas presupuesto

### Quién hace qué
- **TÚ** = Crear cuentas, tomar decisiones, testing, aprobar diseños
- **YO** = Programar, configurar, debuggear, hacer deploy
- **TÚ+YO** = Decisiones conjuntas que requieren tu criterio + mi conocimiento técnico

### Costos estimados (MVP sin IA)
- **Vercel:** $0
- **Supabase:** $0
- **APIs de noticias/cotización:** $0 (usar fuentes gratuitas)
- **TOTAL MVP:** $0/mes
