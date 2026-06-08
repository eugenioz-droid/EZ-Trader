create table sintesis_diaria (
  id            bigserial primary key,
  fecha         date not null unique,           -- una por día (fecha Chile)
  texto         text not null,
  modelo        text,
  generado_at   timestamptz default now()
);

comment on table sintesis_diaria is 'Síntesis diaria generada por Sonnet: resumen de factores + noticias del día. Una fila por día.';

alter table sintesis_diaria enable row level security;

-- Lectura pública (no requiere login)
create policy "sintesis_publica" on sintesis_diaria
  for select using (true);
