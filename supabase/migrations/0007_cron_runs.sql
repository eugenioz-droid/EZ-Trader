-- ============================================================
-- EZ TRADER  |  Registro de corridas del cron (observabilidad)
-- Migración 0007  |  2026-06-03
-- ============================================================
-- Propósito (robustez "C"): guardar el resultado de cada corrida del cron/refresh
-- para detectar fallos silenciosos. Hoy los fallos (rss-parser, Yahoo, Stooq, Haiku)
-- se perdían en los logs de Workers; con esto quedan en BD y se muestran en la UI.
-- ============================================================

create table cron_runs (
  id           bigint generated always as identity primary key,
  origen       text not null default 'cron' check (origen in ('cron', 'refresh')),
  ejecutado_at timestamptz not null default now(),
  duracion_ms  integer,
  ok           boolean not null default true,  -- false si algún paso reportó error
  detalle      jsonb not null default '{}'     -- resultados completos (noticias/precios/clasificacion/alertas)
);
comment on table cron_runs is 'Una fila por corrida de cron/refresh. Base para detectar fallos silenciosos y latencia.';
create index idx_cron_runs_ejecutado on cron_runs (ejecutado_at desc);

alter table cron_runs enable row level security;
grant all on table cron_runs to service_role;
grant usage, select on all sequences in schema public to service_role;
