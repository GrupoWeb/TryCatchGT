import { authenticator } from 'otplib';
import QRCode from 'qrcode';

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
