import { describe, it, expect } from 'vitest';
import { User } from '../../src/domain/entities/User.js';
import { Email } from '../../src/domain/value-objects/Email.js';
import { BlogPost, slugify, estimateReadingTime } from '../../src/domain/entities/BlogPost.js';
import { ProjectRequest } from '../../src/domain/entities/ProjectRequest.js';

describe('User', () => {
  it('normaliza username y aplica defaults seguros', () => {
    const u = new User({ username: '  ADMIN ', passwordHash: 'h' });
    expect(u.username).toBe('admin');
    expect(u.role).toBe('admin');
    expect(u.isActive).toBe(true);
    expect(u.status).toBe('active');
    expect(u.failedLoginAttempts).toBe(0);
    expect(u.mustChangePassword).toBe(false);
    expect(u.deletedAt).toBeNull();
  });

  it('label usa displayName → fullName → username', () => {
    expect(new User({ username: 'x', passwordHash: 'h', displayName: 'Dee', fullName: 'Full' }).label).toBe('Dee');
    expect(new User({ username: 'x', passwordHash: 'h', fullName: 'Full' }).label).toBe('Full');
    expect(new User({ username: 'x', passwordHash: 'h' }).label).toBe('x');
  });

  it('isLocked refleja lockedUntil futuro/pasado', () => {
    expect(new User({ username: 'x', passwordHash: 'h', lockedUntil: new Date(Date.now() + 60000) }).isLocked).toBe(true);
    expect(new User({ username: 'x', passwordHash: 'h', lockedUntil: new Date(Date.now() - 60000) }).isLocked).toBe(false);
    expect(new User({ username: 'x', passwordHash: 'h' }).isLocked).toBe(false);
  });

  it('canLogin es false si inactivo, deshabilitado o eliminado', () => {
    expect(new User({ username: 'x', passwordHash: 'h' }).canLogin).toBe(true);
    expect(new User({ username: 'x', passwordHash: 'h', isActive: false }).canLogin).toBe(false);
    expect(new User({ username: 'x', passwordHash: 'h', status: 'disabled' }).canLogin).toBe(false);
    expect(new User({ username: 'x', passwordHash: 'h', deletedAt: new Date() }).canLogin).toBe(false);
  });
});

describe('Email', () => {
  it('acepta correos válidos y normaliza a minúsculas', () => {
    expect(new Email('  Foo@Bar.COM ').getValue()).toBe('foo@bar.com');
  });
  it('rechaza correos inválidos', () => {
    expect(() => new Email('no-es-correo')).toThrow();
    expect(Email.isValid('a@b.co')).toBe(true);
    expect(Email.isValid('a@b')).toBe(false);
  });
});

describe('BlogPost', () => {
  it('slugify quita acentos y símbolos', () => {
    expect(slugify('Ciberseguridad en WordPress: ¡Guía!')).toBe('ciberseguridad-en-wordpress-guia');
  });
  it('estimateReadingTime es al menos 1', () => {
    expect(estimateReadingTime('una dos tres')).toBe(1);
    expect(estimateReadingTime(Array(400).fill('palabra').join(' '))).toBe(2);
  });
  it('genera slug desde el título y valida contenido mínimo', () => {
    const p = new BlogPost({ title: 'Hola Mundo', content: '<p>contenido suficientemente largo</p>' });
    expect(p.slug).toBe('hola-mundo');
    expect(p.status).toBe('draft');
    expect(() => new BlogPost({ title: 'ab', content: 'x' })).toThrow();
  });
});

describe('ProjectRequest', () => {
  it('valida nombre y descripción mínima', () => {
    expect(() => new ProjectRequest({ clientName: '', clientEmail: 'a@b.com', projectType: 'Web', description: 'larga que pasa' })).toThrow();
    expect(() => new ProjectRequest({ clientName: 'Juan', clientEmail: 'a@b.com', projectType: 'Web', description: 'corta' })).toThrow();
    const r = new ProjectRequest({ clientName: 'Juan', clientEmail: 'a@b.com', projectType: 'Web', description: 'descripción suficientemente larga' });
    expect(r.status).toBe('pending');
    expect(r.clientEmail.getValue()).toBe('a@b.com');
  });
});
