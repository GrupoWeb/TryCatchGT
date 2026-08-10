import { describe, it, expect } from 'vitest';
import { sniffImageMime } from '../../src/infrastructure/http/upload.js';

const pad = (buf: Buffer, len = 16) => Buffer.concat([buf, Buffer.alloc(Math.max(0, len - buf.length))]);

describe('sniffImageMime', () => {
  it('detecta formatos válidos por magic bytes', () => {
    expect(sniffImageMime(pad(Buffer.from([0xff, 0xd8, 0xff, 0xe0])))).toBe('image/jpeg');
    expect(sniffImageMime(pad(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))).toBe('image/png');
    expect(sniffImageMime(pad(Buffer.from('GIF89a....', 'ascii')))).toBe('image/gif');
    expect(sniffImageMime(pad(Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x24, 0, 0, 0]), Buffer.from('WEBP')])))).toBe('image/webp');
    expect(sniffImageMime(pad(Buffer.concat([Buffer.from([0, 0, 0, 0x20]), Buffer.from('ftypavif', 'ascii')])))).toBe('image/avif');
  });

  it('rechaza contenido que no es imagen (HTML, SVG, texto, corto)', () => {
    expect(sniffImageMime(pad(Buffer.from('<script>alert(1)</script>', 'ascii')))).toBeNull();
    expect(sniffImageMime(pad(Buffer.from('<svg xmlns="...">', 'ascii')))).toBeNull();
    expect(sniffImageMime(pad(Buffer.from('texto plano', 'ascii')))).toBeNull();
    expect(sniffImageMime(Buffer.from([0xff, 0xd8]))).toBeNull();
  });
});
