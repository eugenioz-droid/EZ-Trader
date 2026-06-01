-- Fuentes de noticias rápidas (intradía) agregadas tras revisión de frescura
insert into fuentes (nombre, tipo, url_base, activo) values
  ('FXStreet', 'rss', 'https://www.fxstreet.com/rss/news', true),
  ('investingLive (ForexLive)', 'rss', 'https://investinglive.com/feed/news', true);
