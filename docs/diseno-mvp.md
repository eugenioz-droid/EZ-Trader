# Diseño y decisiones de producto - EZ Trader MVP

> Este documento registra el PORQUÉ de las decisiones de diseño. Cuando surja la duda de
> "¿por qué hicimos esto así?", la respuesta está acá, fechada. El QUÉ (tareas) vive en
> `ez-trader-programa.md`. La base de conocimiento del agente vive en `docs/factores-usd-clp.md`.

---

## Propuesta de valor del MVP

EZ-Trader **no compite con la plataforma del bróker.** El bróker ya muestra el precio del USD/CLP
en tiempo real, mejor que cualquier gráfico que hagamos nosotros.

El valor de EZ-Trader está en lo que el bróker **no** entrega:
1. **Noticias consolidadas** y filtradas por relevancia para el peso.
2. **Monitoreo de factores** que mueven el USD/CLP (cobre, dólar global, tasas).
3. **Un agente** que interpreta todo junto y ayuda a tomar mejores decisiones.

Regla de diseño: si una función solo duplica lo que el trader ya ve en su bróker, no va.

---

## Composición del dashboard (MVP)

El dashboard del primer tab (USD/CLP) se centra en **noticias + factores + agente**:

| Panel | Qué muestra | Por qué |
|-------|-------------|---------|
| Noticias | Tarjetas con título, resumen, impacto, factor | Es el corazón: noticias consolidadas que el bróker no da |
| Cotización USD/CLP | Precio actual + variación del día | Referencia rápida, no para reemplazar al bróker |
| Factores de mercado | Cobre, DXY, diferencial de tasas + su dirección | Ver de un vistazo qué están haciendo los drivers del peso |
| Agente (chat) | Conversación para interpretar el contexto | El diferenciador clave del producto |
| Filtros | Por factor, impacto, fecha | Para navegar el volumen de noticias |

---

## Decisión sobre gráficos

**Los gráficos se sacaron del MVP.** Razones:

1. El agente entrega la interpretación en texto; un gráfico que solo confirma lo que el agente ya
   dijo es redundante.
2. El gráfico de precio lo ofrece el bróker, mejor.
3. Gráficos de vanidad (ej. "frecuencia de noticias por factor") se ven bien pero no ayudan a operar.

**Cuando se agreguen (post-MVP), solo estos dos**, porque muestran algo que ni el bróker ni el
agente entregan de un vistazo:

- **USD/CLP superpuesto con Cobre (invertido):** permite ver divergencias al instante. Si el cobre
  subió pero el peso no se fortaleció, algo raro pasa → oportunidad o advertencia. (Tarea 4.10)
- **Línea de precio con marcadores de noticias de alto impacto:** conecta visualmente "este salto
  fue por tal evento". Útil para aprender qué mueve el peso con el tiempo. (Tarea 4.11)

---

## Modelo de uso y operación del agente (Tarea 2.4)

### Cómo se usa la página (en palabras del usuario)
- **Uso principal — swing semanal:** abrir una posición (típicamente el lunes) con una estrategia
  clara y cerrarla al final de la semana, o durante, cuando convenga.
- **Consulta esporádica:** revisar de vez en cuando el contexto. → La Opción A (leer de la BD) cumple.
- **Reacción a contingencias:** a veces una posición empieza a moverse en contra y hay que decidir
  rápido.

### Tesis central del producto: VELOCIDAD
El bróker avisa cuando las cosas **ya ocurrieron** — tarde. EZ-Trader busca ser **al menos tan
rápido o más** que el bróker. La ventaja competitiva es la **latencia**: enterarse antes.
Misión de fondo: hacer lo que el bróker dice hacer pero no hace — asesorar para decidir bien y
mejorar las probabilidades a favor del usuario.

### Roles del agente
1. **Interpretar** el contexto (noticias + factores) → ¿hay oportunidad de posición USD/CLP?
2. **Planificar estrategias** junto al usuario, aplicando buenas prácticas de trading.
3. **[Fase 2] Reporting rápido** (ej. resumen de fin de semana).

> Framing: el agente es **apoyo a la decisión**, no garantiza resultados. Sugiere e interpreta;
> la decisión final es del usuario.

### Panel del agente
- Colapsable (se abre y cierra).
- Lee de nuestra BD (Opción A): el agente "busca las noticias del día" en nuestro almacén curado
  y ya clasificado, no en la web cruda. Más rápido, barato y filtrado.

### Botón "Refresh live" — DIFERIDO (post-MVP)
Fetch on-demand de noticias más allá del cron, para cuando el usuario llega tarde al lunes o
necesita frescura inmediata ante una contingencia. Se implementa después si no complica el MVP.

### Alertas proactivas — diseño en dos capas
**Reframe clave:** para VELOCIDAD, la IA NO es el camino rápido (agrega latencia). Por eso:

- **Capa rápida (reglas, sin IA):** dispara al instante ante umbrales sobre datos que ya tenemos
  (cobre cae >X%, DXY salta, precio se mueve >X%, llega noticia de alto impacto). Esto es lo que
  le gana al bróker en tiempo.
- **Capa de interpretación (agente, al abrir el panel):** tras la alerta, el agente explica qué
  significa y qué considerar. NO está en la ruta crítica de velocidad.

Resultado: velocidad (reglas) + inteligencia (agente) sin pagar latencia de IA en cada movimiento.

### Implicación de cadencia
Para ganarle al bróker, los feeds críticos (datos de mercado + noticias de alto impacto) podrían
necesitar polling más rápido que 15 min (ej. 1-5 min). A afinar según los límites de las APIs
gratuitas que elijamos.

---

## Historial de decisiones
- 2026-05-31 — Definido el foco del MVP (noticias + factores + agente). Gráficos diferidos a
  post-MVP; solo se conservan 2 (cobre-overlay y precio-con-marcadores). Agregado panel de factores
  de mercado al dashboard del MVP.
- 2026-05-31 — Definido modelo de uso (swing semanal) y tesis de velocidad (ganarle al bróker en
  latencia). Alertas en dos capas: reglas rápidas (sin IA) + interpretación del agente. Agente lee
  de la BD (Opción A). Botón "Refresh live" diferido. Agente suma rol de planificador de estrategias.
