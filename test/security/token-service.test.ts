import { describe, it, expect } from 'vitest';
import { TokenService } from '../../src/infrastructure/security/TokenService.js';
import type { TokenPurpose } from '../../src/application/ports/output/UserTokenRepository.js';

// Fake repo en memoria que replica la semántica (no usado + no expirado).
function fakeRepo() {
  const rows: any[] = [];
  let seq = 1;
  return {
    rows,
    create: async (userId: number, purpose: TokenPurpose, tokenHash: string, expiresAt: Date) => { rows.push({ id: seq++, userId, purpose, tokenHash, expiresAt, usedAt: null }); },
    findValid: async (purpose: TokenPurpose, tokenHash: string) => {
      const r = rows.find((x) => x.purpose === purpose && x.tokenHash === tokenHash && !x.usedAt && x.expiresAt > new Date());
      return r ? { id: r.id, userId: r.userId } : null;
    },
    markUsed: async (id: number) => { const r = rows.find((x) => x.id === id); if (r) r.usedAt = new Date(); },
    invalidatePending: async (userId: number, purpose: TokenPurpose) => { rows.forEach((x) => { if (x.userId === userId && x.purpose === purpose && !x.usedAt) x.usedAt = new Date(); }); },
  } as any;
}

describe('TokenService', () => {
  it('emite un token consumible una sola vez', async () => {
    const repo = fakeRepo(); const svc = new TokenService(repo);
    const token = await svc.issue(7, 'email_verify', 60);
    expect(token).toBeTruthy();
    expect(repo.rows[0].tokenHash).not.toBe(token); // se guarda el hash, no el token
    expect(await svc.consume('email_verify', token)).toBe(7);
    expect(await svc.consume('email_verify', token)).toBeNull(); // ya usado
  });

  it('rechaza token de otro propósito y token vacío', async () => {
    const repo = fakeRepo(); const svc = new TokenService(repo);
    const token = await svc.issue(1, 'email_verify', 60);
    expect(await svc.consume('password_reset', token)).toBeNull();
    expect(await svc.consume('email_verify', '')).toBeNull();
  });

  it('emitir de nuevo invalida el token anterior', async () => {
    const repo = fakeRepo(); const svc = new TokenService(repo);
    const first = await svc.issue(1, 'email_verify', 60);
    await svc.issue(1, 'email_verify', 60);
    expect(await svc.consume('email_verify', first)).toBeNull();
  });

  it('un token expirado no se consume', async () => {
    const repo = fakeRepo(); const svc = new TokenService(repo);
    const token = await svc.issue(1, 'email_verify', -1); // ya vencido
    expect(await svc.consume('email_verify', token)).toBeNull();
  });
});
