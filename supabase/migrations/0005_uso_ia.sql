-- ============================================================
-- EZ TRADER  |  Ledger de uso/costo de IA (tokens)
-- Migración 0005  |  2026-06-02  |  Postgres / Supabase
-- ============================================================
-- Propósito:
--  * Registrar CADA llamada a la API de Claude (chat, análisis profundo,
--    clasificación de noticias) con tokens y costo estimado.
--  * Hoy: que el usuario entienda cuánto gasta y en qué.
--  * Futuro (SaaS, Fase 9): base para cobrar por uso con margen. Cuando exista
--    multi-usuario, se agrega columna usuario_id y RLS por usuario.
--  * Se rastrean tokens de prompt caching aparte: el cache read es ~10x más
--    barato y conviene medir cuánto ahorra.
-- ============================================================

create table uso_ia (
  id                  bigint generated always as identity primary key,
  -- Para qué se usó la IA. 'agente' = chat normal (Sonnet),
  -- 'agente_profundo' = botón análisis profundo (Opus),
  -- 'clasificacion' = clasificación de noticias en el cron (Haiku).
  proposito           text not null check (proposito in ('agente','agente_profundo','clasificacion')),
  modelo              text not null,                  -- id exacto del modelo usado
  tokens_in           integer not null default 0,     -- input (no cacheado)
  tokens_out          integer not null default 0,     -- output generado
  tokens_cache_write  integer not null default 0,     -- input escrito a caché (cuesta +25%)
  tokens_cache_read   integer not null default 0,     -- input leído de caché (~10% del precio)
  costo_usd           numeric(12,8) not null default 0, -- costo estimado calculado en código
  -- Enlaces opcionales al objeto que originó la llamada
  conversacion_id     bigint references conversaciones(id) on delete set null,
  noticia_id          bigint references noticias(id) on delete set null,
  exito               boolean not null default true,  -- false si la llamada falló (igual deja rastro)
  metadata            jsonb not null default '{}',    -- extra: profundidad, latencia_ms, error, etc.
  created_at          timestamptz not null default now()
);
comment on table uso_ia is 'Ledger de uso/costo de la API de Claude. Una fila por llamada. Base para entender gasto hoy y cobrar por uso en el futuro (Fase 9).';
create index idx_uso_ia_created on uso_ia (created_at desc);
create index idx_uso_ia_proposito on uso_ia (proposito, created_at desc);

-- RLS: habilitado sin políticas públicas (igual que el resto del esquema).
-- El backend usa service_role (omite RLS); el frontend pasa por API routes.
alter table uso_ia enable row level security;

-- service_role ya tiene GRANT ALL por 0003, pero esa migración corrió antes
-- de que existiera esta tabla. Re-aplicar para cubrir uso_ia.
grant all on table uso_ia to service_role;
grant usage, select on all sequences in schema public to service_role;
