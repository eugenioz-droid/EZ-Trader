-- ============================================================
-- EZ TRADER  |  Esquema inicial de base de datos
-- Migración 0001  |  2026-05-31  |  Postgres / Supabase
-- ============================================================
-- Notas de diseño:
--  * Timestamps en timestamptz (se guarda UTC). Clave en una app de
--    trading que cruza husos (Chile / EE.UU.).
--  * IDs: bigint generated always as identity.
--  * Validaciones con CHECK (no enums de Postgres): más fácil de evolucionar.
--  * Acceso: el backend (API routes / cron) usa la service_role key, que
--    omite RLS. RLS queda habilitado SIN políticas públicas → las claves
--    anónimas no pueden leer/escribir. El frontend NO toca estas tablas
--    directo: pasa por las API routes del backend.
--  * Multi-instrumento desde el inicio (tabla instrumentos).
-- ============================================================

-- Función para mantener updated_at al día (usada por triggers)
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 1. INSTRUMENTOS -----------------------------------------------
create table instrumentos (
  id          bigint generated always as identity primary key,
  simbolo     text not null unique,            -- 'USD/CLP'
  nombre      text not null,
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);
comment on table instrumentos is 'Instrumentos operables. MVP: USD/CLP. Diseñado para múltiples (tabs futuros).';

-- 2. FACTORES ----------------------------------------------------
create table factores (
  id                bigint generated always as identity primary key,
  codigo            text not null unique,       -- 'A1','A2','B1'...
  nombre            text not null,
  capa              text not null check (capa in ('mercado','noticia')),
  tier              smallint not null check (tier in (1,2,3)),
  direccion         text,                       -- cómo afecta a USD/CLP
  canal_transmision text,
  es_mvp            boolean not null default false,
  activo            boolean not null default true,
  notas             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
comment on table factores is 'Factores que mueven USD/CLP. Configurable. Base: docs/factores-usd-clp.md';
create trigger trg_factores_updated before update on factores
  for each row execute function set_updated_at();

-- 3. FUENTES -----------------------------------------------------
create table fuentes (
  id             bigint generated always as identity primary key,
  nombre         text not null,
  tipo           text not null check (tipo in ('api_datos','rss','web')),
  url_base       text,
  factor_id      bigint references factores(id) on delete set null,
  instrumento_id bigint references instrumentos(id) on delete set null,
  config         jsonb not null default '{}',   -- detalles por fuente (códigos de serie, endpoints)
  activo         boolean not null default true,
  created_at     timestamptz not null default now()
);
comment on table fuentes is 'Fuentes de datos y noticias. Base: docs/fuentes-datos.md. config: detalles por fuente (ej. códigos de serie del Banco Central).';

-- 4. SERIES (catálogo de time-series numéricas) -----------------
create table series (
  id             bigint generated always as identity primary key,
  codigo         text not null unique,          -- 'USDCLP','COBRE','DXY','TPM','FED'
  nombre         text not null,
  unidad         text,                          -- 'CLP','USD/lb','indice','%'
  tipo           text not null check (tipo in ('precio_instrumento','factor_mercado')),
  instrumento_id bigint references instrumentos(id) on delete set null,
  factor_id      bigint references factores(id) on delete set null,
  fuente_id      bigint references fuentes(id) on delete set null,
  activo         boolean not null default true,
  created_at     timestamptz not null default now()
);
comment on table series is 'Catálogo de series numéricas que ingerimos. El precio del instrumento y cada factor de mercado es una serie.';

-- 5. DATOS_MERCADO (observaciones de las series) ----------------
create table datos_mercado (
  id           bigint generated always as identity primary key,
  serie_id     bigint not null references series(id) on delete cascade,
  valor        numeric not null,
  fecha_dato   timestamptz not null,            -- a qué momento corresponde el valor
  capturado_at timestamptz not null default now(),
  unique (serie_id, fecha_dato)                 -- evita duplicados al re-consultar
);
comment on table datos_mercado is 'Series de tiempo (cotización USD/CLP, cobre, DXY, tasas...).';
create index idx_datos_mercado_serie_fecha on datos_mercado (serie_id, fecha_dato desc);

-- 6. NOTICIAS ----------------------------------------------------
create table noticias (
  id             bigint generated always as identity primary key,
  titulo         text not null,
  resumen        text,
  contenido      text,
  url            text unique,                    -- dedup por URL
  fuente_id      bigint references fuentes(id) on delete set null,
  instrumento_id bigint references instrumentos(id) on delete set null,  -- relevancia inicial (por fuente)
  idioma         text default 'es',
  publicado_at   timestamptz,                    -- cuándo lo publicó la fuente
  capturado_at   timestamptz not null default now(),
  created_at     timestamptz not null default now()
);
comment on table noticias is 'Noticias crudas del cron. Dedup por url. La clasificación fina llega en analisis_ia (Fase 7).';
create index idx_noticias_publicado on noticias (publicado_at desc);
create index idx_noticias_instrumento on noticias (instrumento_id);

-- 7. ANALISIS_IA (clasificación por IA, Fase 7) -----------------
create table analisis_ia (
  id                 bigint generated always as identity primary key,
  noticia_id         bigint not null references noticias(id) on delete cascade,
  instrumento_id     bigint references instrumentos(id) on delete set null,
  factor_id          bigint references factores(id) on delete set null,
  impacto            text check (impacto in ('alto','medio','bajo')),
  direccion_estimada text check (direccion_estimada in ('sube','baja','neutral')),
  resumen_ia         text,
  confianza          numeric check (confianza >= 0 and confianza <= 1),
  modelo_usado       text,
  prompt_version     text,                       -- versionado de prompts
  created_at         timestamptz not null default now()
);
comment on table analisis_ia is 'Clasificación de noticias por IA. Separada de noticias para versionar prompts y re-analizar. direccion_estimada: efecto sobre USD/CLP.';
create index idx_analisis_noticia on analisis_ia (noticia_id);

-- 8. REGLAS_ALERTA (configurable) -------------------------------
create table reglas_alerta (
  id          bigint generated always as identity primary key,
  codigo      text not null unique,
  nombre      text not null,
  descripcion text,
  serie_id    bigint references series(id) on delete cascade,
  condicion   jsonb not null,                    -- {operador:'variacion_pct', umbral:-2, ventana:'1d'}
  severidad   text not null default 'media' check (severidad in ('baja','media','alta')),
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);
comment on table reglas_alerta is 'Reglas configurables para alertas rápidas (sin IA). condicion en jsonb para flexibilidad.';

-- 9. ALERTAS (disparos) -----------------------------------------
create table alertas (
  id             bigint generated always as identity primary key,
  tipo           text not null check (tipo in ('regla','agente')),
  regla_id       bigint references reglas_alerta(id) on delete set null,
  noticia_id     bigint references noticias(id) on delete set null,
  instrumento_id bigint references instrumentos(id) on delete set null,
  severidad      text not null default 'media' check (severidad in ('baja','media','alta')),
  titulo         text not null,
  mensaje        text,
  contexto       jsonb not null default '{}',
  leida          boolean not null default false,
  disparada_at   timestamptz not null default now()
);
comment on table alertas is 'Alertas disparadas. tipo regla (rápida, sin IA) o agente (interpretada).';
create index idx_alertas_disparada on alertas (disparada_at desc);
create index idx_alertas_no_leidas on alertas (leida) where leida = false;

-- 10. CONVERSACIONES (agente, Fase 6) ---------------------------
create table conversaciones (
  id             bigint generated always as identity primary key,
  titulo         text,
  instrumento_id bigint references instrumentos(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
comment on table conversaciones is 'Hilos de conversación con el agente (Fase 6).';
create trigger trg_conversaciones_updated before update on conversaciones
  for each row execute function set_updated_at();

-- 11. MENSAJES ---------------------------------------------------
create table mensajes (
  id              bigint generated always as identity primary key,
  conversacion_id bigint not null references conversaciones(id) on delete cascade,
  rol             text not null check (rol in ('user','assistant','system')),
  contenido       text not null,
  modelo_usado    text,
  tokens          integer,
  created_at      timestamptz not null default now()
);
comment on table mensajes is 'Mensajes de cada conversación con el agente.';
create index idx_mensajes_conversacion on mensajes (conversacion_id, created_at);

-- ============================================================
-- RLS: habilitar en todas, sin políticas públicas.
-- El backend usa service_role (omite RLS). El frontend pasa por
-- las API routes; NO usa la anon key contra estas tablas.
-- ============================================================
alter table instrumentos   enable row level security;
alter table factores       enable row level security;
alter table fuentes        enable row level security;
alter table series         enable row level security;
alter table datos_mercado  enable row level security;
alter table noticias       enable row level security;
alter table analisis_ia    enable row level security;
alter table reglas_alerta  enable row level security;
alter table alertas        enable row level security;
alter table conversaciones enable row level security;
alter table mensajes       enable row level security;
