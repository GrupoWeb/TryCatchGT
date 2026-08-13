import rateLimit from 'express-rate-limit';
import { Request } from 'express';

const json = { success: false, error: 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.' };

// Assets estáticos: no cuentan para el límite global (una sola página carga muchos
// y son baratos de servir). El healthcheck del contenedor también se exime (tiene
// su propio healthLimiter y golpea cada pocos segundos).
const ASSET_RE = /\.(?:js|mjs|css|map|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|eot|txt|xml|json|pdf|mp4|webm)$/i;
const ASSET_PREFIX = ['/media/', '/uploads/', '/css/', '/js/', '/dev/'];

/**
 * Límite global suave por IP para todo el sitio (páginas + API). Acota floods de
 * bots/escáneres sin estorbar la navegación normal. Los endpoints sensibles llevan
 * además su propio limitador (auth/form/upload) encima de este.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: json,
  skip: (req: Request) =>
    req.path === '/api/health' || ASSET_RE.test(req.path) || ASSET_PREFIX.some((p) => req.path.startsWith(p)),
});

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

// Health check público: generoso para monitoreo/healthcheck del contenedor
// (localhost cada 15 s), pero acota un flood externo contra un endpoint sin auth.
export const healthLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
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
