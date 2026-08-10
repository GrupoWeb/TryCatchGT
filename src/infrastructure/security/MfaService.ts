import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'node:crypto';

// Tolerancia de ±1 intervalo (30s) para desfases de reloj.
authenticator.options = { window: 1 };

const ISSUER = 'TryCatch GT';

export function generateMfaSecret(): string {
  return authenticator.generateSecret();
}

export function mfaKeyUri(accountName: string, secret: string): string {
  return authenticator.keyuri(accountName, ISSUER, secret);
}

export async function mfaQrDataUrl(accountName: string, secret: string): Promise<string> {
  return QRCode.toDataURL(mfaKeyUri(accountName, secret));
}

export function verifyMfaToken(token: string, secret: string): boolean {
  try {
    return authenticator.check((token || '').replace(/\s+/g, ''), secret);
  } catch {
    return false;
  }
}

// Alfabeto sin caracteres ambiguos (0/o, 1/l/i) para códigos legibles.
const BACKUP_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

/** Genera códigos de respaldo de un solo uso, formato "xxxxx-xxxxx". */
export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = crypto.randomBytes(10);
    let raw = '';
    for (let j = 0; j < 10; j++) raw += BACKUP_ALPHABET[bytes[j] % BACKUP_ALPHABET.length];
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  return codes;
}

/** Normaliza un código para comparación: minúsculas y solo alfanuméricos. */
export function normalizeBackupCode(code: string): string {
  return (code || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
