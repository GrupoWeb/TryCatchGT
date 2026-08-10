import { describe, it, expect } from 'vitest';
import { renderEmail } from '../../src/infrastructure/email/emailTemplate.js';

describe('renderEmail — plantilla de correo con marca', () => {
  const base = {
    title: 'Verifica tu correo',
    greeting: 'Hola Juan,',
    intro: 'Confirma tu dirección de correo.',
    ctaLabel: 'Verificar correo',
    ctaUrl: 'https://trycatchgt.org/api/auth/verify-email?token=abc',
    note: 'El enlace vence en 60 minutos.',
  };

  it('incluye el CTA (label + url) y la marca', () => {
    const html = renderEmail(base);
    expect(html).toContain('Verificar correo');
    expect(html).toContain('https://trycatchgt.org/api/auth/verify-email?token=abc');
    expect(html).toContain('TryCatch');
  });

  it('escapa los valores para evitar inyección de HTML', () => {
    const html = renderEmail({ ...base, greeting: 'Hola <script>alert(1)</script>' });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('la nota es opcional', () => {
    const html = renderEmail({ ...base, note: undefined });
    expect(html).toContain('Verificar correo');
    expect(html).not.toContain('vence en 60 minutos');
  });
});
