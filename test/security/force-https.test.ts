import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Recarga env.ts con un process.env fresco para observar cómo se resuelve forceHttps.
async function loadEnv(overrides: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return (await import('../../src/config/env.js')).env;
}

describe('env.forceHttps — desacoplado de NODE_ENV (C4)', () => {
  const saved = { NODE_ENV: process.env.NODE_ENV, FORCE_HTTPS: process.env.FORCE_HTTPS };
  beforeEach(() => { delete process.env.NODE_ENV; delete process.env.FORCE_HTTPS; });
  afterEach(() => {
    process.env.NODE_ENV = saved.NODE_ENV; process.env.FORCE_HTTPS = saved.FORCE_HTTPS;
    if (saved.NODE_ENV === undefined) delete process.env.NODE_ENV;
    if (saved.FORCE_HTTPS === undefined) delete process.env.FORCE_HTTPS;
  });

  it('production sin FORCE_HTTPS → forceHttps true (sigue a producción)', async () => {
    const env = await loadEnv({ NODE_ENV: 'production', FORCE_HTTPS: undefined });
    expect(env.isProduction).toBe(true);
    expect(env.forceHttps).toBe(true);
  });

  it('production + FORCE_HTTPS=false → production pero sin forzar https', async () => {
    const env = await loadEnv({ NODE_ENV: 'production', FORCE_HTTPS: 'false' });
    expect(env.isProduction).toBe(true);
    expect(env.forceHttps).toBe(false);
  });

  it('development + FORCE_HTTPS=true → puede forzar https en local', async () => {
    const env = await loadEnv({ NODE_ENV: 'development', FORCE_HTTPS: 'true' });
    expect(env.isProduction).toBe(false);
    expect(env.forceHttps).toBe(true);
  });
});
