import crypto from 'node:crypto';
import { env } from '../../config/env.js';

// Clave AES-256 derivada de ENCRYPTION_KEY (independiente de SESSION_SECRET; ver
// M7). Si no se define ENCRYPTION_KEY, cae a SESSION_SECRET por compatibilidad.
// Cambiar la clave que estuviera en uso vuelve ilegibles los secretos MFA cifrados.
const key = crypto.scryptSync(env.encryptionKey, 'tcgt-mfa-salt-v1', 32);

/** Cifra un texto con AES-256-GCM. Prefijo "enc:" para distinguir de legado. */
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return 'enc:' + Buffer.concat([iv, tag, enc]).toString('base64');
}

/** Descifra; si el valor no está cifrado (legado en claro), lo devuelve tal cual. */
export function decryptSecret(stored: string | null): string | null {
  if (!stored) return null;
  if (!stored.startsWith('enc:')) return stored;
  try {
    const raw = Buffer.from(stored.slice(4), 'base64');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const enc = raw.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/** Hash rápido para tokens de alta entropía (códigos de respaldo). */
export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/** Código legible sin caracteres ambiguos (para backup codes). */
export function randomCode(length = 10): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}
