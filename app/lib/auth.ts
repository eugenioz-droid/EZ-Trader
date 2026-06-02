// Configuración de autenticación compartida entre middleware y endpoint de login.
// Mantener libre de APIs de Node: el middleware corre en el Edge Runtime.

export const COOKIE_NAME = 'ez_auth'

// El valor de la cookie es el AUTH_SECRET (string largo aleatorio).
// Como la cookie es httpOnly, JS del navegador no puede leerla (anti-XSS),
// y al ser aleatoria no se puede adivinar. Para revocar accesos: rotar AUTH_SECRET.
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 días en segundos
