-- ============================================================
-- EZ TRADER  |  Unique constraint en analisis_ia.noticia_id
-- Migración 0006  |  2026-06-03
-- ============================================================
-- Problema detectado: el código usaba upsert con onConflict:'noticia_id'
-- pero no existía un UNIQUE constraint en esa columna. PostgreSQL rechaza
-- el ON CONFLICT sin constraint, lo que hacía que Haiku clasificara noticias
-- pero nunca guardara nada → cero alertas de tipo 'agente'.
--
-- ANTES DE APLICAR: si hay filas duplicadas en analisis_ia, eliminarlas:
--   DELETE FROM analisis_ia
--   WHERE id NOT IN (
--     SELECT MIN(id) FROM analisis_ia GROUP BY noticia_id
--   );
-- ============================================================

ALTER TABLE analisis_ia
  ADD CONSTRAINT analisis_ia_noticia_id_unique UNIQUE (noticia_id);

COMMENT ON CONSTRAINT analisis_ia_noticia_id_unique ON analisis_ia
  IS 'Una sola clasificación por noticia (por prompt_version). Sin esto el upsert falla silenciosamente.';
