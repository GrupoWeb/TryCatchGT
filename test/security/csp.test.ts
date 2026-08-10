import { describe, it, expect } from 'vitest';
import { buildCspDirectives } from '../../src/infrastructure/http/csp.js';

describe('CSP — img-src acotado (auditoría fase 3)', () => {
  it('img-src permite solo el propio origen y data:, sin el comodín https:', () => {
    const d = buildCspDirectives({ isProduction: true, forceHttps: true });
    expect(d.imgSrc).toEqual(["'self'", 'data:']);
    expect(d.imgSrc).not.toContain('https:');
  });

  it('mantiene objectSrc none y frameAncestors none', () => {
    const d = buildCspDirectives({ isProduction: true, forceHttps: true });
    expect(d.objectSrc).toEqual(["'none'"]);
    expect(d.frameAncestors).toEqual(["'none'"]);
  });

  it('solo añade upgradeInsecureRequests cuando forceHttps está activo', () => {
    expect(buildCspDirectives({ isProduction: true, forceHttps: true })).toHaveProperty('upgradeInsecureRequests');
    expect(buildCspDirectives({ isProduction: false, forceHttps: false })).not.toHaveProperty('upgradeInsecureRequests');
  });

  it('scriptSrc no usa unsafe-inline en producción', () => {
    expect(buildCspDirectives({ isProduction: true, forceHttps: true }).scriptSrc).not.toContain("'unsafe-inline'");
    expect(buildCspDirectives({ isProduction: false, forceHttps: false }).scriptSrc).toContain("'unsafe-inline'");
  });
});
