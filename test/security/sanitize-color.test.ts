import { describe, it, expect } from 'vitest';
import { sanitizeBlogHtml } from '../../src/infrastructure/security/sanitize.js';

describe('sanitizeBlogHtml — color de texto', () => {
  it('conserva color de texto válido (hex y rgb) en span', () => {
    const hex = sanitizeBlogHtml('<span style="color:#e11d48">rojo</span>');
    expect(hex).toMatch(/<span/);
    expect(hex).toMatch(/color:\s*#e11d48/i);

    const rgb = sanitizeBlogHtml('<span style="color:rgb(1, 2, 3)">x</span>');
    expect(rgb).toMatch(/color:\s*rgb\(/i);
  });

  it('descarta estilos peligrosos o no permitidos, conservando solo color', () => {
    const out = sanitizeBlogHtml('<span style="background:url(javascript:alert(1));color:#fff">x</span>');
    expect(out).not.toMatch(/javascript/i);
    expect(out).not.toMatch(/background/i);
    expect(out).toMatch(/color:\s*#fff/i);
  });

  it('elimina valores de color no válidos (p. ej. expresiones o palabras clave)', () => {
    const out = sanitizeBlogHtml('<span style="color:expression(alert(1))">x</span>');
    expect(out).not.toMatch(/expression/i);
  });

  it('sigue eliminando script y handlers on*', () => {
    const out = sanitizeBlogHtml('<span style="color:#000" onclick="alert(1)">x</span><script>alert(2)</script>');
    expect(out).not.toMatch(/onclick/i);
    expect(out).not.toContain('<script');
  });
});
