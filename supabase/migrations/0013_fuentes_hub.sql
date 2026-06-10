-- ============================================================
-- EZ TRADER  |  Fuentes nuevas del hub público (Fase 2)
-- Migración 0013  |  2026-06-09
-- ============================================================
-- Feeds RSS nuevos para poblar más secciones del hub (cripto, bolsa USA,
-- economía Chile, commodities). El fuente_nombre de cada feed en
-- app/lib/noticias.ts debe coincidir con el `nombre` de aquí, o la noticia
-- se guarda con fuente_id null. tipo='rss'. Verificados: Cooperativa, La
-- Tercera, CNBC, Investing (desde red local). CoinTelegraph se valida en
-- Workers (red corporativa local lo bloquea).
-- ============================================================

insert into fuentes (nombre, tipo, url_base, factor_id, instrumento_id, config, activo) values
  ('CoinTelegraph',          'rss', 'https://es.cointelegraph.com',  null, null, '{"seccion":"bitcoin"}', true),
  ('Cooperativa Economía',   'rss', 'https://www.cooperativa.cl',    null, null, '{"seccion":"nacional"}', true),
  ('La Tercera Pulso',       'rss', 'https://www.latercera.com',     null, null, '{"seccion":"nacional"}', true),
  ('CNBC Markets',           'rss', 'https://www.cnbc.com',          null, null, '{"seccion":"sp500"}', true),
  ('Investing Commodities',  'rss', 'https://www.investing.com',     null, null, '{"seccion":"commodities"}', true)
on conflict do nothing;
