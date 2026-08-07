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
