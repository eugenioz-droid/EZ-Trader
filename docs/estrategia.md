# Estrategia de trading - EZ Trader

> **Descargo:** Este documento es educativo y de apoyo a la decisión. NO es asesoría financiera.
> Ninguna estrategia garantiza ganancias. Antes de operar con dinero real, conviene probar en papel
> (paper trading) y validar con histórico. Alimenta el rol de planificación del agente (Tarea 6.7).

---

## Perfil del usuario
- Tiempo limitado (no puede monitorear pantallas todo el día).
- Opera CFDs USD/CLP.
- Busca decisiones bien pensadas que mejoren las probabilidades a su favor.

## Por qué swing (y no day trading)
La evidencia es clara: el **swing trading es el mejor fit para perfiles part-time**. No exige
monitoreo constante, tiene mayor tasa de éxito por holding más largo (días a semanas), y captura
movimientos grandes. La intuición del usuario (entrar el lunes, cerrar al final de semana o cuando
convenga) es coherente con las buenas prácticas, no solo una solución por falta de tiempo.

---

## Estrategia propuesta: Swing macro por alineación de factores

Lo que el usuario ya hace (mirar cobre, dólar, tasas) es **global macro trading**. Para el peso
chileno encaja porque la correlación cobre–dólar es muy fuerte (~-0.81, de las más consistentes
del mercado).

### El marco
1. **Planificación (fin de semana):** revisar el estado de los factores Tier 1 (cobre, DXY,
   diferencial de tasas) y los catalizadores de la semana (FOMC, datos de China, IPC Chile).
2. **Entrada:** tomar posición **cuando los factores se alinean** en una dirección.
   - Cobre ↑ + DXY ↓ + tasas a favor del peso → sesgo **short USD/CLP** (apostar a peso fuerte).
   - Cobre ↓ + DXY ↑ + tasas en contra → sesgo **long USD/CLP** (apostar a peso débil).
3. **Filtro de no-entrada:** si los factores se contradicen → poca convicción → **no operar**.
4. **Gestión:** las alertas por reglas avisan si un factor se da vuelta o si llega un catalizador
   de alto impacto → reevaluar la tesis.
5. **Salida:** al final de la semana, o antes si la tesis se rompe.

### Nota sobre el carry
El peso (emergente) paga más interés que el dólar (carry positivo). Estar short USD/CLP (largo en
peso) acumula carry a favor; estar long USD/CLP lo paga. Es un matiz a considerar en posiciones que
se mantienen varios días. Precaución: un diferencial grande no garantiza que se mantenga.

### Lo que más importa: gestión de riesgo
Más que la entrada perfecta, lo que define resultados es la **gestión de riesgo**: tamaño de la
posición, stop-loss, no arriesgar de más en una sola operación. Es justo lo que el bróker dice
asesorar y no hace. El agente debe ayudar acá (Tarea 6.7).

---

## Cómo esto ajusta el producto
- **Indicador de alineación de factores** en el dashboard: cuando los 3 factores Tier 1 coinciden,
  mostrar un sesgo direccional claro. Es la señal de entrada de mayor probabilidad de esta estrategia.
  (Tarea agregada en Fase 4.)
- El agente planificador (6.7) se enmarca en este método: "¿están los factores alineados para una
  posición esta semana? ¿cuál es el riesgo?".
- La ventana de planificación de fin de semana conecta con el reporting de fin de semana (6.9).

---

## Pendiente / a validar
- Probar la estrategia en papel antes de dinero real.
- Con el tiempo, medir: ¿las entradas por alineación de factores tuvieron mejor resultado que las de
  factores en conflicto? (esto valida o ajusta el método con datos propios).

### Historial
- 2026-05-31 — Versión inicial. Validado swing para perfil part-time. Propuesto marco "swing macro
  por alineación de factores". Agregado indicador de alineación al dashboard. Énfasis en gestión de
  riesgo como rol del agente.
