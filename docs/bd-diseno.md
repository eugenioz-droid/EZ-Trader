# Diseño de base de datos - EZ Trader

> El esquema ejecutable está en `supabase/migrations/0001_schema_inicial.sql` (tablas) y
> `0002_datos_iniciales.sql` (datos de arranque). Este documento explica el porqué.

---

## Las tablas en lenguaje simple

| Tabla | Qué guarda | Se usa desde |
|-------|------------|--------------|
| `instrumentos` | Los instrumentos operables (hoy: USD/CLP) | MVP |
| `factores` | Los 11 factores que mueven el peso (cobre, DXY, etc.) | MVP |
| `fuentes` | De dónde sacamos datos y noticias (Twelve Data, Banco Central, RSS...) | MVP |
| `series` | Catálogo de series numéricas (USDCLP, COBRE, DXY, TPM, FED) | MVP |
| `datos_mercado` | Los valores en el tiempo de esas series (la cotización, el precio del cobre...) | MVP |
| `noticias` | Las noticias crudas que recopila el cron | MVP |
| `analisis_ia` | La clasificación de cada noticia hecha por IA (impacto, factor, dirección) | Fase 7 |
| `reglas_alerta` | Reglas configurables para las alertas rápidas | Fase 3 |
| `alertas` | Las alertas disparadas | Fase 3 / 6 |
| `conversaciones` + `mensajes` | El historial del chat con el agente | Fase 6 |

---

## Decisiones clave (las que evitan rehacer trabajo)

### 1. Multi-instrumento desde el inicio
Aunque el MVP es solo USD/CLP, existe la tabla `instrumentos` y las tablas relevantes apuntan a
ella. Agregar un segundo instrumento (otro tab) es **insertar una fila**, no rediseñar la base.

### 2. "Series" separadas de "factores"
Son cosas distintas:
- Una **serie** es un número en el tiempo que ingerimos (el precio del cobre, el DXY).
- Un **factor** es el concepto que mueve el peso.
A veces un factor = una serie (Cobre). A veces un factor usa varias series (el *diferencial de tasas*
se calcula con dos series: TPM y FED). Y la cotización USD/CLP es una serie pero no es un factor (es
el precio del instrumento). Separarlos evita un modelo rígido.

### 3. Noticias crudas ≠ análisis de IA
`noticias` guarda lo que llega tal cual. `analisis_ia` guarda la interpretación de la IA, en una
tabla aparte. Beneficios:
- El MVP funciona **sin IA** (mostramos noticias por fuente relevante).
- Cuando llegue la IA, se agrega encima sin tocar lo anterior.
- Podemos **re-analizar** y **versionar prompts** (`prompt_version`) para mejorar sin perder historial.

### 4. Lo configurable vive en tablas, no en código
`factores`, `fuentes` y `reglas_alerta` se editan desde la base. Agregar un factor nuevo o una regla
de alerta no requiere reprogramar nada. (Era tu requisito desde el doc de factores.)

### 5. No guardar lo que se puede calcular
La "alineación de factores" (tu señal de entrada) NO se guarda como dato: se calcula al momento
desde `datos_mercado`. Una sola fuente de verdad → sin inconsistencias. El backtest de la estrategia
se hace re-jugando las series históricas.

### 6. Seguridad: todo pasa por el backend
RLS (Row Level Security) está activo en todas las tablas, sin permisos públicos. El backend
(API routes + cron) usa la `service_role key` del lado servidor. El frontend NO accede directo a la
base: pide los datos a nuestras API routes. Modelo simple y seguro para un usuario único.

### 7. Detalles técnicos que importan
- **Timestamps en UTC** (`timestamptz`): clave porque cruzamos husos Chile/EE.UU.
- **Dedup de noticias** por `url` única y de datos por `(serie, fecha)`: el cron puede correr cada
  15 min sin duplicar.
- **Validaciones con CHECK** en vez de tipos enum: más fácil agregar valores después.
- **Índices** en las consultas frecuentes (noticias por fecha, datos por serie/fecha, alertas).

---

## Cómo aplicar el esquema (Tarea 2.6)
1. Entrar al proyecto en Supabase → **SQL Editor**.
2. Pegar y ejecutar `0001_schema_inicial.sql`.
3. Pegar y ejecutar `0002_datos_iniciales.sql`.
4. Verificar en **Table Editor** que aparezcan las 11 tablas con datos en factores/fuentes/series.

---

## Historial
- 2026-05-31 — Diseño inicial (Opus). 11 tablas. Multi-instrumento, series≠factores, noticias≠IA,
  configurables en tablas, RLS vía service_role, versionado de prompts. Migraciones 0001 y 0002.
