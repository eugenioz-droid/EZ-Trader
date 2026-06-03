-- ============================================================
-- EZ TRADER  |  Activar VIX + fuente Financial Juice
-- Migración 0008  |  2026-06-03  |  Tarea 10.4 (calidad de señal)
-- ============================================================
-- VIX (risk-on/off, Tier 2) estaba definido pero inactivo. El agente filtra series
-- por activo=true, así que hay que activarlo para que entre a su contexto.
-- Financial Juice: nueva fuente de noticias (squawk en tiempo real).
-- ============================================================

-- Activar la serie VIX (ya existe en 0002 con activo=false)
update series set activo = true where codigo = 'VIX';

-- Fuente nueva para el feed de Financial Juice (las demás ya existen en 0002).
-- NOT EXISTS para idempotencia (fuentes.nombre no tiene UNIQUE).
insert into fuentes (nombre, tipo, url_base, activo)
select 'Financial Juice', 'rss', 'https://www.financialjuice.com', true
where not exists (select 1 from fuentes where nombre = 'Financial Juice');
