import { describe, it, expect } from 'vitest';
import { wrapCrmEmail, htmlToPlainText } from '../../src/domain/services/crmEmailShell.js';

describe('wrapCrmEmail', () => {
  it('envuelve el cuerpo con la marca y estilos en línea', () => {
    const html = wrapCrmEmail('<p>Hola</p>', 'Asunto');
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('TryCatch');
    expect(html).toContain('<p>Hola</p>');
    // Estilos en línea (no CSS externo) para clientes de correo reales.
    expect(html).toContain('style=');
    expect(html).not.toContain('<link');
  });

  it('inserta el cuerpo sin escaparlo pero escapa el asunto', () => {
    const html = wrapCrmEmail('<strong>ok</strong>', 'A & B <x>');
    expect(html).toContain('<strong>ok</strong>');
    expect(html).toContain('A &amp; B &lt;x&gt;');
    expect(html).not.toContain('<title>A & B <x></title>');
  });

  it('usa un asunto por defecto cuando viene vacío', () => {
    expect(wrapCrmEmail('<p>x</p>', '')).toContain('<title>TryCatch GT</title>');
  });
});

describe('htmlToPlainText', () => {
  it('convierte bloques en saltos de línea y quita etiquetas', () => {
    expect(htmlToPlainText('<p>Uno</p><p>Dos</p>')).toBe('Uno\nDos');
    expect(htmlToPlainText('a<br>b')).toBe('a\nb');
  });

  it('decodifica entidades básicas y colapsa espacios', () => {
    expect(htmlToPlainText('<p>A &amp; B</p>')).toBe('A & B');
    expect(htmlToPlainText('<p>x</p><p></p><p></p><p>y</p>')).toBe('x\n\ny');
  });
});
