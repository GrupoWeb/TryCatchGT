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
  // Fuerza HTTPS vía `upgrade-insecure-requests` en la CSP. Se desacopla de
  // isProduction (C4): por defecto sigue a producción, pero se puede apagar
  // (FORCE_HTTPS=false) para servir el stack local por http://localhost sin que el
  // navegador intente subir a https los assets y rompa CSS/JS. El resto del
  // endurecimiento (cookies Secure, secretos, trust proxy) sigue atado a producción.
  forceHttps: (() => {
    const v = process.env.FORCE_HTTPS;
    if (v === 'false' || v === '0') return false;
    if (v === 'true' || v === '1') return true;
    return (process.env.NODE_ENV || 'development') === 'production';
  })(),
  // URL base pública, para construir enlaces en correos (verificación, reset).
  appUrl: process.env.APP_URL || `http://localhost:${Number(process.env.PORT) || 3000}`,
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
  // Clave independiente para cifrar los secretos MFA (AES-256). Se separa de
  // SESSION_SECRET para poder rotar el secreto de sesión sin volver ilegibles los
  // secretos MFA. Fallback a SESSION_SECRET solo si no se define, para no romper
  // instalaciones existentes. Ver security/crypto.ts y M7 de la auditoría.
  encryptionKey: process.env.ENCRYPTION_KEY || process.env.SESSION_SECRET || 'dev-session-secret-cambia-esto',
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

/**
 * Verifica que los secretos no sigan en sus defaults o sean débiles. En producción
 * aborta el arranque; en desarrollo solo avisa (antes hacía un `return` mudo, con lo
 * que los secretos débiles pasaban inadvertidos incluso al probar en local — C4).
 */
export function assertSecureSecrets(): void {
  const problems: string[] = [];
  if (env.session.secret === INSECURE_DEFAULTS.session || env.session.secret.length < 16) problems.push('SESSION_SECRET (≥16 chars aleatorios)');
  if (env.admin.password === INSECURE_DEFAULTS.admin || env.admin.password.length < 8) problems.push('ADMIN_PASSWORD (≥8 chars)');
  if (!problems.length) return;
  if (env.isProduction) {
    throw new Error(`Configura secretos fuertes antes de producción: ${problems.join(', ')}`);
  }
  console.warn(`⚠️  Secretos débiles (aceptable solo en desarrollo): ${problems.join(', ')}`);
}
