import dotenv from 'dotenv';

dotenv.config();

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Falta la variable de entorno obligatoria: ${key}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: (process.env.NODE_ENV || 'development') === 'production',
  db: {
    host: required('DB_HOST', 'localhost'),
    port: Number(process.env.DB_PORT) || 3306,
    user: required('DB_USER', 'root'),
    password: process.env.DB_PASSWORD ?? 'root',
    name: required('DB_NAME', 'trycatch_db'),
  },
  // Credenciales del admin inicial: solo se usan para sembrar el primer usuario
  // en la tabla `users` si está vacía. Cambia la contraseña en .env.
  admin: {
    user: process.env.ADMIN_USER || 'admin',
    password: process.env.ADMIN_PASSWORD || 'cambia-esta-clave',
  },
  session: {
    // Secreto para firmar la cookie de sesión (HMAC). Cámbialo en producción.
    secret: process.env.SESSION_SECRET || 'dev-session-secret-cambia-esto',
    maxAgeMs: 1000 * 60 * 60 * 8, // 8 horas
    cookieName: 'tcgt_session',
  },
  contact: {
    email: process.env.CONTACT_EMAIL || 'ing.jolon@gmail.com',
    // Número de WhatsApp en formato internacional, solo dígitos (ej. 50255555555).
    whatsapp: (process.env.WHATSAPP_NUMBER || '50200000000').replace(/\D/g, ''),
    whatsappMessage: process.env.WHATSAPP_MESSAGE || 'Hola TryCatch GT, vengo desde su sitio web.',
  },
  security: {
    // Orígenes permitidos para CORS (coma-separados). Vacío = solo mismo origen.
    corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  },
} as const;

const INSECURE_DEFAULTS = {
  session: 'dev-session-secret-cambia-esto',
  admin: 'cambia-esta-clave',
};

/** En producción, aborta el arranque si los secretos siguen en sus defaults o son débiles. */
export function assertSecureSecrets(): void {
  if (!env.isProduction) return;
  const problems: string[] = [];
  if (env.session.secret === INSECURE_DEFAULTS.session || env.session.secret.length < 16) problems.push('SESSION_SECRET (≥16 chars aleatorios)');
  if (env.admin.password === INSECURE_DEFAULTS.admin || env.admin.password.length < 8) problems.push('ADMIN_PASSWORD (≥8 chars)');
  if (problems.length) {
    throw new Error(`Configura secretos fuertes antes de producción: ${problems.join(', ')}`);
  }
}
