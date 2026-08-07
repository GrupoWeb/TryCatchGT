import { describe, it, expect } from 'vitest';
import { authenticator } from 'otplib';
import { generateBackupCodes, normalizeBackupCode, verifyMfaToken, generateMfaSecret } from '../../src/infrastructure/security/MfaService.js';

describe('MfaService', () => {
  it('generateBackupCodes: cantidad, formato y unicidad', () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(10);
    for (const c of codes) expect(c).toMatch(/^[a-z0-9]{5}-[a-z0-9]{5}$/);
    expect(new Set(codes).size).toBe(10);
  });

  it('normalizeBackupCode: minúsculas y sin símbolos', () => {
    expect(normalizeBackupCode(' ABc-1 2 ')).toBe('abc12');
  });

  it('verifyMfaToken valida el TOTP del secreto y rechaza uno incorrecto', () => {
    const secret = generateMfaSecret();
    expect(verifyMfaToken(authenticator.generate(secret), secret)).toBe(true);
    expect(verifyMfaToken('000000', secret)).toBe(false);
    expect(verifyMfaToken('', secret)).toBe(false);
  });
});
