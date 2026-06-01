-- ============================================================
-- EZ TRADER  |  Datos iniciales (seed)
-- Migración 0002  |  2026-05-31
-- ============================================================
-- Carga: instrumento USD/CLP, los 11 factores, las series MVP,
-- las fuentes y reglas de alerta de arranque.
-- Las FKs se resuelven por código/símbolo (no por id) para que
-- funcione sin importar los ids generados.
-- ============================================================

-- INSTRUMENTOS ---------------------------------------------------
insert into instrumentos (simbolo, nombre, activo) values
  ('USD/CLP', 'Dólar estadounidense / Peso chileno', true);

-- FACTORES (base: docs/factores-usd-clp.md) ---------------------
insert into factores (codigo, nombre, capa, tier, es_mvp, direccion, canal_transmision) values
  ('A1', 'Cobre',                       'mercado', 1, true,  'Inversa fuerte: cobre sube -> USD/CLP baja', 'Chile ~28% producción mundial; ~50% exportaciones'),
  ('A2', 'Dólar global (DXY)',          'mercado', 1, true,  'Directa: DXY sube -> USD/CLP sube',          'USD/CLP contiene al dólar'),
  ('A3', 'Diferencial de tasas TPM/Fed','mercado', 1, true,  'Carry: menos diferencial a favor de Chile -> peso débil', 'Atractivo del peso para inversores'),
  ('A4', 'Petróleo',                    'mercado', 2, false, 'Directa: petróleo sube -> USD/CLP sube',     'Chile importador (~98%) + inflación global'),
  ('A5', 'VIX (miedo)',                 'mercado', 2, false, 'Directa: VIX sube -> USD/CLP sube',          'Risk-off: capital huye de emergentes'),
  ('B1', 'China',                       'noticia', 2, true,  'Indirecta vía cobre',                        'Mayor comprador de cobre chileno'),
  ('B2', 'Fed / FOMC / macro EE.UU.',   'noticia', 2, false, 'Directa vía dólar y tasas',                  'Expectativas de tasas EE.UU.'),
  ('B3', 'Geopolítica',                 'noticia', 2, false, 'Generalmente USD/CLP sube',                  'Petróleo + risk-off (refugio dólar)'),
  ('B4', 'Intervención BCCh',           'noticia', 3, false, 'Según decida el Banco Central',              'Venta directa de dólares / programa'),
  ('B5', 'Política local / AFP',        'noticia', 3, false, 'Variable según evento',                      'Incertidumbre / salidas de capital'),
  ('B6', 'IPC Chile',                   'noticia', 3, false, 'Indirecta vía expectativas de tasas',        'IPC alto -> sesgo a tasas altas');

-- FUENTES (base: docs/fuentes-datos.md) -------------------------
insert into fuentes (nombre, tipo, url_base, factor_id, instrumento_id, config, activo) values
  ('Twelve Data', 'api_datos', 'https://api.twelvedata.com', null, null,
     '{"nota":"USD/CLP, cobre, DXY intradía. Key gratis 800 req/dia"}', true),
  ('Banco Central de Chile (BDE)', 'api_datos', 'https://si3.bcentral.cl/SieteRestWS/SieteRestWS.ashx',
     (select id from factores where codigo='A3'), null,
     '{"serie_tpm":"F022.TPM.TIN.D001.NO.Z.D","serie_dolar_observado":"F073.TCO.PRE.Z.M","auth":"user/pass"}', true),
  ('FRED (St. Louis Fed)', 'api_datos', 'https://api.stlouisfed.org/fred',
     (select id from factores where codigo='A3'), null,
     '{"nota":"Tasa Fed y macro EE.UU. Key gratis"}', true),
  ('Reuters RSS', 'rss', 'https://www.reuters.com', null, null,
     '{"feeds":["markets","business","world"]}', true),
  ('Investing.com USD/CLP', 'rss', 'https://es.investing.com/currencies/usd-clp-news',
     null, (select id from instrumentos where simbolo='USD/CLP'), '{}', true),
  ('Diario Financiero', 'web', 'https://www.df.cl', null,
     (select id from instrumentos where simbolo='USD/CLP'), '{}', true),
  ('Federal Reserve RSS', 'rss', 'https://www.federalreserve.gov/feeds/feeds.htm',
     (select id from factores where codigo='B2'), null, '{}', true);

-- SERIES (numéricas MVP) ----------------------------------------
insert into series (codigo, nombre, unidad, tipo, instrumento_id, factor_id, fuente_id, activo) values
  ('USDCLP', 'Cotización USD/CLP', 'CLP', 'precio_instrumento',
     (select id from instrumentos where simbolo='USD/CLP'), null,
     (select id from fuentes where nombre='Twelve Data'), true),
  ('COBRE', 'Precio del cobre', 'USD/lb', 'factor_mercado', null,
     (select id from factores where codigo='A1'),
     (select id from fuentes where nombre='Twelve Data'), true),
  ('DXY', 'Índice dólar (DXY)', 'indice', 'factor_mercado', null,
     (select id from factores where codigo='A2'),
     (select id from fuentes where nombre='Twelve Data'), true),
  ('TPM', 'Tasa Política Monetaria Chile', '%', 'factor_mercado', null,
     (select id from factores where codigo='A3'),
     (select id from fuentes where nombre='Banco Central de Chile (BDE)'), true),
  ('FED', 'Tasa de referencia Fed', '%', 'factor_mercado', null,
     (select id from factores where codigo='A3'),
     (select id from fuentes where nombre='FRED (St. Louis Fed)'), true),
  -- Post-MVP (inactivas hasta Fase 3.17/3.18)
  ('PETROLEO', 'Petróleo (Brent/WTI)', 'USD/bbl', 'factor_mercado', null,
     (select id from factores where codigo='A4'),
     (select id from fuentes where nombre='Twelve Data'), false),
  ('VIX', 'Índice de volatilidad VIX', 'indice', 'factor_mercado', null,
     (select id from factores where codigo='A5'),
     (select id from fuentes where nombre='Twelve Data'), false);

-- REGLAS DE ALERTA (arranque) -----------------------------------
insert into reglas_alerta (codigo, nombre, descripcion, serie_id, condicion, severidad) values
  ('R-COBRE-CAIDA', 'Cobre cae fuerte', 'El cobre cae más de 2% en el día (peso bajo presión)',
     (select id from series where codigo='COBRE'),
     '{"operador":"variacion_pct","umbral":-2,"ventana":"1d"}', 'alta'),
  ('R-DXY-SALTO', 'DXY salta', 'El dólar global sube más de 1% en el día',
     (select id from series where codigo='DXY'),
     '{"operador":"variacion_pct","umbral":1,"ventana":"1d"}', 'media'),
  ('R-USDCLP-MOV', 'USD/CLP se mueve fuerte', 'El par se mueve más de 1.5% en el día (reaccionar)',
     (select id from series where codigo='USDCLP'),
     '{"operador":"variacion_pct_abs","umbral":1.5,"ventana":"1d"}', 'alta');
