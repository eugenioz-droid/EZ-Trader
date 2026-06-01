# Factores que mueven USD/CLP — Base de conocimiento del agente

> **Propósito:** Este documento es la base de conocimiento que el agente de análisis usará para
> interpretar datos de mercado y noticias, y traducirlos en una lectura direccional del peso chileno.
> NO está escrito para lectura humana casual: cada factor incluye dirección del efecto, canal de
> transmisión y cómo leer la señal, para que el agente razone con precisión.
>
> Este documento es la base de la tabla `factores` en la BD (ver Fase 2.5). Se actualiza editando
> aquí y reflejando los cambios en la tabla.

---

## Convención de lectura

Para cada factor:
- **Tipo:** `dato de mercado` (número, vía API) o `noticia` (texto, requiere interpretación)
- **Tier:** 1 (dominante) / 2 (fuerte) / 3 (episódico pero violento)
- **Dirección:** cómo afecta a USD/CLP
- **Canal:** mecanismo por el que afecta al peso
- **Señal ↑ USD/CLP:** lo que debilita el peso (sube el dólar)
- **Señal ↓ USD/CLP:** lo que fortalece el peso (baja el dólar)
- **MVP:** si entra o no en la primera versión

**Nota sobre dirección:** "USD/CLP sube" = peso más débil = se necesitan más pesos por dólar.

---

## Regla de oro para el agente (jerarquía de resolución de conflictos)

Cuando las señales se contradicen, el agente debe resolver así:

1. **En condiciones normales:** mandan el **cobre** y el **dólar global (DXY)**. Si ambos apuntan
   en la misma dirección, esa es la lectura dominante.
2. **Durante un shock de noticias agudo** (geopolítica, sorpresa de la Fed, intervención del Banco
   Central): la noticia puede **anular temporalmente** a los datos de mercado. El agente debe
   priorizar el evento mientras esté activo.
3. **El cobre es el árbitro de largo plazo.** Una divergencia entre cobre y peso tiende a corregirse.

---

## CAPA A — Datos de mercado (números, tiempo real, vía API)

### A1. Cobre `[Tier 1] [MVP: SÍ]`
- **Dirección:** Inversa fuerte. Correlación histórica -0.7 a -0.85.
- **Canal:** Chile produce ~28% del cobre mundial; ~50% de sus exportaciones. Más ingreso por cobre = más dólares entrando al país = peso más fuerte.
- **Señal ↑ USD/CLP:** cobre cae.
- **Señal ↓ USD/CLP:** cobre sube.
- **Nota para el agente:** Es el factor #1. Ante duda, el cobre manda.

### A2. Dólar global / DXY `[Tier 1] [MVP: SÍ]`
- **Dirección:** Directa.
- **Canal:** USD/CLP contiene al dólar. Si el dólar se fortalece contra todo, también contra el peso.
- **Señal ↑ USD/CLP:** DXY sube.
- **Señal ↓ USD/CLP:** DXY baja.

### A3. Diferencial de tasas (TPM Chile vs Fed) `[Tier 1] [MVP: SÍ]`
- **Dirección:** Directa sobre el atractivo del peso (carry trade).
- **Canal:** Si Chile baja tasas más rápido que EE.UU., el peso pierde atractivo para inversores → capital sale → peso débil.
- **Señal ↑ USD/CLP:** se reduce el diferencial a favor de Chile (Chile baja tasas o Fed sube).
- **Señal ↓ USD/CLP:** aumenta el diferencial a favor de Chile.

### A4. Petróleo `[Tier 2] [MVP: NO]`
- **Dirección:** Directa.
- **Canal:** Chile importa ~98% de su petróleo. Petróleo caro = peor balanza comercial = peso débil. Además, petróleo alto → inflación global → Fed más dura → dólar fuerte. Ambos canales empujan igual.
- **Señal ↑ USD/CLP:** petróleo sube.
- **Señal ↓ USD/CLP:** petróleo baja.
- **Nota para el agente:** Es el principal canal por donde entran los shocks geopolíticos al peso.

### A5. VIX (índice de miedo) `[Tier 2] [MVP: NO]`
- **Dirección:** Directa.
- **Canal:** El peso es moneda emergente ("risk-on"). Cuando sube el miedo global, el capital huye de emergentes hacia el dólar refugio → peso débil.
- **Señal ↑ USD/CLP:** VIX sube (risk-off).
- **Señal ↓ USD/CLP:** VIX baja (risk-on).

> **Oro — excluido deliberadamente.** El oro sube tanto cuando el dólar está débil (ayudaría al peso)
> como cuando hay miedo (perjudica al peso). Da una señal contradictoria para el CLP. El VIX y el DXY
> cubren mejor "miedo" y "dirección del dólar" por separado. No se monitorea.

---

## CAPA B — Noticias / eventos (texto, requieren interpretación del agente)

### B1. China `[Tier 2] [MVP: parcial]`
- **Dirección:** Indirecta, vía cobre.
- **Canal:** China es el mayor comprador de cobre chileno. Datos chinos fuertes (PMI, PIB, estímulos, sector inmobiliario sano) → más demanda de cobre → peso fuerte.
- **Señal ↑ USD/CLP:** datos chinos débiles, crisis inmobiliaria, desaceleración.
- **Señal ↓ USD/CLP:** estímulo chino, PMI fuerte, recuperación.

### B2. Fed / FOMC / macro EE.UU. (CPI, empleo) `[Tier 2] [MVP: NO]`
- **Dirección:** Directa vía dólar y tasas.
- **Canal:** Decisiones y datos que cambian las expectativas de tasas de EE.UU. mueven el dólar global.
- **Señal ↑ USD/CLP:** Fed más dura (hawkish), CPI alto, empleo fuerte → dólar sube.
- **Señal ↓ USD/CLP:** Fed más blanda (dovish), datos débiles → dólar baja.

### B3. Geopolítica (guerras, conflictos, shocks de suministro) `[Tier 2] [MVP: NO]`
- **Dirección:** Generalmente ↑ USD/CLP.
- **Canal:** Doble vía — (1) sube el petróleo (Chile importador), (2) risk-off que fortalece el dólar refugio. Puede anular temporalmente al cobre.
- **Señal ↑ USD/CLP:** escalada de conflictos, amenazas al suministro de crudo, pánico global.
- **Señal ↓ USD/CLP:** distensión, resolución de conflictos.
- **Nota para el agente:** Evento de alta prioridad. Mientras esté activo, prima sobre los datos de mercado normales.

### B4. Intervención del Banco Central de Chile `[Tier 3] [MVP: NO]`
- **Dirección:** Diseñada para mover el peso en la dirección que el BCCh decida (normalmente frenar una depreciación).
- **Canal:** Venta directa de dólares o programa de intervención (ej. US$25 mil millones en 2022).
- **Señal:** Anuncio de intervención para defender el peso → ↓ USD/CLP brusco. Alta prioridad.

### B5. Política local (elecciones, reformas, retiros AFP) `[Tier 3] [MVP: NO]`
- **Dirección:** Variable según el evento.
- **Canal:** Incertidumbre política o salidas de capital (los retiros de AFP inyectaron liquidez y debilitaron el peso fuertemente).
- **Señal ↑ USD/CLP:** incertidumbre, reformas percibidas como anti-mercado, nuevos retiros.
- **Señal ↓ USD/CLP:** estabilidad política, resultados pro-mercado.

### B6. Inflación local (IPC Chile) `[Tier 3] [MVP: NO]`
- **Dirección:** Indirecta vía expectativas de tasas.
- **Canal:** IPC alto → expectativa de que el BCCh suba o mantenga tasas → puede fortalecer el peso.
- **Señal ↓ USD/CLP:** IPC sobre lo esperado (sesgo a tasas altas).
- **Señal ↑ USD/CLP:** IPC bajo lo esperado (sesgo a recortes).

---

## Alcance del MVP

**Se implementan ahora (Capa A, Tier 1):** Cobre, DXY, Diferencial de tasas.
Son números, fáciles de obtener por API, y cubren el grueso del movimiento.

**Se capturan como noticias desde el inicio pero su análisis fino llega con la IA (Fase 7):** China.

**Se agregan después** (tareas ya documentadas en el programa): Petróleo, VIX, Fed/FOMC, Geopolítica, Intervención BCCh, Política local, IPC.

---

## Cómo actualizar este documento

1. Editar este archivo (agregar/quitar factor, ajustar tier o dirección).
2. Reflejar el cambio en la tabla `factores` de la BD.
3. El sistema y el agente toman los factores activos desde la tabla, no desde código.
4. Registrar la fecha y el motivo del cambio abajo.

### Historial de cambios
- 2026-05-30 — Versión inicial. Definidos 11 factores en 2 capas. Oro excluido por señal contradictoria. MVP = Tier 1 (cobre, DXY, tasas) + China parcial.
