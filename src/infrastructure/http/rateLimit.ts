import rateLimit from 'express-rate-limit';

const json = { success: false, error: 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.' };

// Login / verificación MFA: frena la fuerza bruta por IP.
export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: json,
});

// Formulario público de cotización: frena el spam de bots.
export const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: json,
});

// Subida de imágenes (panel): evita que un usuario autenticado llene el disco
// con subidas ilimitadas de hasta 4 MB (M8).
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: json,
});
