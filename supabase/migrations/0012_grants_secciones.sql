-- ============================================================
-- EZ TRADER  |  Grants para tablas nuevas (secciones)
-- Migración 0012  |  2026-06-09
-- ============================================================
-- 0003_grants.sql hizo GRANT ALL ON ALL TABLES, pero eso solo cubre las tablas
-- que existían en ese momento. La tabla `secciones` (migración 0011) quedó sin
-- permisos para service_role → "permission denied for table secciones" al leerla
-- desde el backend. Re-aplicamos los grants para cubrir las tablas nuevas.
-- ============================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Para que las FUTURAS tablas hereden el grant sin necesitar otra migración:
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
