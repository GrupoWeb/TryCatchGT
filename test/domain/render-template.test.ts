import { describe, it, expect } from 'vitest';
import { renderTemplate } from '../../src/domain/services/renderTemplate.js';
import { Contact } from '../../src/domain/entities/Contact.js';

const contact = new Contact({
  name: 'Café <Pineda>',
  email: 'ventas@cafe.com',
  company: 'Café Pineda',
  sector: 'Alimentos',
  location: 'Antigua',
  website: 'https://cafe.com',
});

describe('renderTemplate', () => {
  it('sustituye variables en asunto (texto plano) y cuerpo (HTML)', () => {
    const r = renderTemplate(
      'Hola {nombre} de {empresa}',
      '<p>Vi que {empresa} del sector {sector} está en {ubicacion}. Sitio: {sitio}</p>',
      contact,
    );
    expect(r.subject).toBe('Hola Café <Pineda> de Café Pineda');
    expect(r.bodyHtml).toContain('Café Pineda');
    expect(r.bodyHtml).toContain('Alimentos');
    expect(r.bodyHtml).toContain('Antigua');
    expect(r.bodyHtml).toContain('https://cafe.com');
  });

  it('escapa los valores en el cuerpo pero no en el asunto', () => {
    const r = renderTemplate('{nombre}', '<p>{nombre}</p>', contact);
    // Asunto: texto plano, sin escapar.
    expect(r.subject).toBe('Café <Pineda>');
    // Cuerpo: el < y > del nombre quedan escapados para no romper el HTML.
    expect(r.bodyHtml).toBe('<p>Café &lt;Pineda&gt;</p>');
  });

  it('deja intactas las variables desconocidas', () => {
    const r = renderTemplate('{desconocida}', '<p>{otra}</p>', contact);
    expect(r.subject).toBe('{desconocida}');
    expect(r.bodyHtml).toBe('<p>{otra}</p>');
  });

  it('usa el nombre como empresa cuando no hay empresa', () => {
    const sinEmpresa = new Contact({ name: 'Juan', email: 'j@x.com' });
    const r = renderTemplate('{empresa}', '<p>{empresa}</p>', sinEmpresa);
    expect(r.subject).toBe('Juan');
  });
});
