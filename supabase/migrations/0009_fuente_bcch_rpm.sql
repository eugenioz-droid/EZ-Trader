-- ============================================================
-- EZ TRADER  |  Fuente: Banco Central de Chile (RPM/TPM)
-- Migración 0009  |  2026-06-03  |  Tarea 10.4.3 (calidad de señal)
-- ============================================================
-- El BCCh no publica RSS y su comunicado RPM vive en páginas JS. Capturamos la
-- decisión y su cobertura vía un feed de Google News acotado (ver app/lib/noticias.ts).
-- Esta fuente da atribución limpia; se enlaza al factor A3 (diferencial de tasas).
-- El calendario anticipatorio de las 8 RPM 2026 vive como constante en
-- app/lib/calendario.ts (data fija, no necesita BD).
-- NOT EXISTS para idempotencia (fuentes.nombre no tiene UNIQUE).
-- ============================================================

insert into fuentes (nombre, tipo, url_base, factor_id, activo)
select 'Banco Central de Chile (RPM)', 'rss', 'https://www.bcentral.cl',
       (select id from factores where codigo = 'A3'), true
where not exists (select 1 from fuentes where nombre = 'Banco Central de Chile (RPM)');
