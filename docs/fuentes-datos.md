# Fuentes de datos y noticias - EZ Trader

> Recomendación de fuentes para cada factor de `docs/factores-usd-clp.md`. Criterio de selección:
> **gratis** + **baja latencia** (coherente con la tesis de velocidad del producto). Mapeado por factor.

---

## Nota importante sobre la "ventaja de velocidad"

Separar dos planos:

- **Precio/tick en tiempo real:** el bróker lo tiene en vivo y gratis no se le gana (el tick
  profesional es de pago; los tiers gratis traen minutos de retraso). Para swing semanal, minutos
  de retraso son aceptables.
- **Noticias y catalizadores:** AQUÍ está la ventaja real. Los RSS (Reuters, Fed) son muy rápidos y
  monitorear los factores permite detectar el catalizador **antes** que la alerta tardía del bróker.

La ventaja competitiva de EZ-Trader vive en el lado **noticias/contexto**, no en el tick del precio.

---

## CAPA A — Datos de mercado (números)

### Cotización USD/CLP
| Fuente | Tier gratis | Latencia | Uso |
|--------|-------------|----------|-----|
| **Twelve Data** (pick MVP) | 800 llamadas/día | Minutos | Intradía USD/CLP, multi-activo |
| Finnhub | 60 llamadas/min + WebSocket | Casi real-time (WS) | Backup / streaming |
| Banco Central Chile (dólar observado) | Ilimitado, oficial | **Diario** | Referencia oficial e histórico, NO intradía |
| ExchangeRate-API | Sin key | Por hora | Solo referencia, muy lento |

### Cobre `[Tier 1]`
| Fuente | Tier gratis | Notas |
|--------|-------------|-------|
| **Twelve Data** (pick MVP) | 800/día | Cubre commodities incl. cobre |
| Metals-API / Commodities-API / API Ninjas | Freemium con key | Fallback específico de metales |

### Dólar global DXY `[Tier 1]`
| Fuente | Tier gratis | Notas |
|--------|-------------|-------|
| **Twelve Data** (pick MVP) | 800/día | Índice DXY |
| Finnhub | 60/min | Backup |

### Diferencial de tasas TPM vs Fed `[Tier 1]`
| Lado | Fuente | Notas |
|------|--------|-------|
| **TPM Chile** | **Banco Central API BDE** (oficial, gratis) | Serie `F022.TPM.TIN.D001.NO.Z.D`. Requiere registro gratis (user/pass) |
| **Fed funds (EE.UU.)** | **FRED** (St. Louis Fed, oficial, gratis) | API oficial de datos macro EE.UU. Requiere key gratis |

> El **Banco Central API BDE** es un hallazgo clave: oficial, gratis, da dólar observado + TPM.
> Base URL: `https://si3.bcentral.cl/SieteRestWS/SieteRestWS.ashx`. Métodos GetSeries / SearchSeries.

### Petróleo y VIX `[Tier 2 - Post-MVP]`
- Petróleo: Twelve Data / Commodities-API.
- VIX: Twelve Data / Finnhub.

---

## CAPA B — Noticias / eventos (texto)

### Globales rápidas (lo que da la ventaja de velocidad)
| Fuente | Tipo | Para qué factor |
|--------|------|-----------------|
| **Reuters RSS** (markets, business, world) | Wire rápido | Geopolítica, mercados, general |
| **Federal Reserve RSS** (oficial) | Comunicados | Fed / FOMC |
| **FRED releases** | Datos macro EE.UU. | CPI, empleo |

### Chile (dólar/peso específico)
| Fuente | Notas |
|--------|-------|
| **Investing.com — USD/CLP news** | Noticias específicas del par, en español |
| **Bloomberg Línea** | Cotización + noticias Chile en tiempo real |
| **Diario Financiero (DF)** | Principal medio financiero chileno |
| Dólar Online (dolaronline.cl) | Noticias del cambio USD/CLP |

### China `[Tier 2]`
- Noticias rápidas: feed de China de Reuters.
- Análisis (más lento, mayor profundidad): Peterson Institute (RealTime), Carnegie (Michael Pettis).

---

## Stack recomendado para el MVP

**Datos de mercado:**
- **Twelve Data** (key gratis) → USD/CLP, cobre, DXY intradía. Una sola API cubre los 3.
- **Banco Central API BDE** (registro gratis) → dólar observado oficial + TPM.
- **FRED** (key gratis) → tasa Fed.

**Noticias:**
- **Reuters RSS** + **Investing.com USD/CLP** + **Diario Financiero** como base.
- **Federal Reserve RSS** para la Fed.

**APIs que requieren crear cuenta/key (acción del usuario):** Twelve Data, Finnhub (opcional/backup),
FRED, Banco Central BDE. Todas gratis.

---

## Pendientes de validar al implementar
- Confirmar si el tier gratis de Twelve Data entrega FX/commodities con retraso aceptable (vs. el
  retraso de 4h que aplica a algunas acciones).
- Confirmar disponibilidad de RSS estables de DF e Investing.com (algunos sitios limitan RSS).

### Historial
- 2026-05-31 — Versión inicial. Pick MVP: Twelve Data + Banco Central BDE + FRED para datos;
  Reuters/Investing/DF/Fed RSS para noticias. Aclarada la ventaja de velocidad (noticias > tick).
