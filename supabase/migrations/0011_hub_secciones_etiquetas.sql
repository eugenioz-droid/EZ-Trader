-- ============================================================
-- EZ TRADER  |  Hub público — secciones y etiquetas de noticias
-- Migración 0011  |  2026-06-08  |  Fase 1 del programa v2.00
-- ============================================================
-- Pivot a hub de noticias económicas. Agrega:
--  * Tabla `secciones`: lo que el público navega (dólar, cobre, BTC,
--    S&P 500, IPSA, oro, UF/inflación). Distinta de `instrumentos`
--    (que es la capa pro de trading): una sección no siempre es algo
--    operable (S&P 500 e IPSA son índices, UF es indicador).
--  * En `analisis_ia`: secciones_impacto (jsonb, multi), geografia,
--    relevancia 0–1. Dos niveles de relevancia, por diseño:
--    - relevancia (general): qué tan destacable es para CUALQUIER lector,
--      sin atarla a una divisa. Ordena la PORTADA. Se explica intuitivo
--      ("mueve mercados globales", "afecta tu bolsillo"), no como impacto
--      sobre un par cambiario.
--    - secciones_impacto (por sección): la MISMA noticia tiene un impacto
--      y dirección distintos según la sección donde se mira. Ej: "Fed sube
--      tasas" = alto/sube para dólar, medio/baja para cobre. La página
--      /[seccion] lee el impacto de esa sección; la portada usa relevancia.
--      (impacto/direccion_estimada legados quedan como compat de la sección
--       dólar y la capa pro de trading.)
--  * En `noticias`: slug para URLs públicas /noticia/[slug].
-- RLS: las tablas existentes ya tienen RLS sin políticas públicas
-- (el backend usa service_role). La lectura pública del hub se hará
-- vía API routes con service_role, igual que hoy.
-- ============================================================

-- 1. SECCIONES ---------------------------------------------------
create table secciones (
  id          bigint generated always as identity primary key,
  codigo      text not null unique,            -- 'dolar','cobre','bitcoin'...
  nombre      text not null,                   -- 'Dólar', 'Cobre'...
  tipo        text not null check (tipo in ('instrumento','indice','indicador')),
  descripcion text,                            -- bajada divulgativa para la página de la sección
  orden       smallint not null default 0,     -- orden de aparición en la navegación
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);
comment on table secciones is 'Secciones navegables del hub público (una página + gráfico + noticias c/u). Distinta de instrumentos (capa pro de trading).';

insert into secciones (codigo, nombre, tipo, descripcion, orden) values
  ('dolar',        'Dólar',          'instrumento', 'El precio del dólar en pesos chilenos y qué lo mueve.',                 1),
  ('cobre',        'Cobre',          'instrumento', 'El principal producto de exportación de Chile y su precio global.',    2),
  ('bitcoin',      'Bitcoin',        'instrumento', 'La criptomoneda más grande y las noticias que mueven su precio.',      3),
  ('sp500',        'S&P 500',        'indice',      'El índice que mide las 500 mayores empresas de EE.UU.',                4),
  ('ipsa',         'IPSA',           'indice',      'El principal índice de la Bolsa de Santiago.',                         5),
  ('oro',          'Oro',            'instrumento', 'El refugio clásico de los inversionistas en tiempos de incertidumbre.',6),
  ('uf-inflacion', 'UF e inflación', 'indicador',   'La Unidad de Fomento y el costo de la vida en Chile.',                 7);

-- 2. NOTICIAS: slug para URLs públicas --------------------------
alter table noticias add column slug text unique;
comment on column noticias.slug is 'Slug único para la URL pública /noticia/[slug]. Se genera al guardar (Tarea 1.5).';

-- 3. ANALISIS_IA: etiquetas del hub -----------------------------
-- secciones_impacto: jsonb array. Una entrada por sección que la noticia
--   toca, con su impacto y dirección PROPIOS de esa sección. Ej:
--     [{"seccion":"dolar","impacto":"alto","direccion":"sube"},
--      {"seccion":"cobre","impacto":"medio","direccion":"baja"}]
--   Vacío ([]) para noticias generales sin instrumento claro: se muestran
--   como highlight general en portada usando solo `relevancia`.
--   jsonb (no tabla puente) por ahora: simple de poblar desde Haiku y de
--   leer por sección. Si escala, se normaliza a tabla.
-- secciones_lista: columna derivada (códigos planos) para filtrar rápido
--   "dame noticias de la sección X" con índice GIN, sin desarmar el jsonb.
alter table analisis_ia add column secciones_impacto jsonb   not null default '[]';
alter table analisis_ia add column secciones_lista   text[]  not null default '{}';
alter table analisis_ia add column geografia         text    check (geografia in ('nacional','internacional','ambas'));
alter table analisis_ia add column relevancia        numeric check (relevancia >= 0 and relevancia <= 1);

comment on column analisis_ia.secciones_impacto is 'jsonb: impacto+dirección por sección. Ej [{"seccion":"dolar","impacto":"alto","direccion":"sube"}]. [] = noticia general.';
comment on column analisis_ia.secciones_lista   is 'Códigos planos de las secciones que toca (derivado de secciones_impacto) para filtrar con índice GIN.';
comment on column analisis_ia.geografia         is 'Alcance geográfico: nacional | internacional | ambas.';
comment on column analisis_ia.relevancia        is 'Relevancia 0–1 GENERAL para el público (ordena portada). El impacto por sección vive en secciones_impacto.';

-- Índices para los filtros de la portada y las páginas de sección.
create index idx_analisis_secciones  on analisis_ia using gin (secciones_lista);
create index idx_analisis_relevancia on analisis_ia (relevancia desc);
create index idx_analisis_geografia  on analisis_ia (geografia);
