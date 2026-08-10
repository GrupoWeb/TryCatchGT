import { describe, it, expect } from 'vitest';
import { SaveBlogPost } from '../../src/application/use-cases/SaveBlogPost.js';
import { BlogHtmlSanitizer } from '../../src/infrastructure/security/BlogHtmlSanitizer.js';

function fakeRepo() {
  const rec: any = {};
  return {
    findById: async () => null,
    findBySlug: async () => null,
    save: async (p: any) => { rec.saved = p; return p; },
    _rec: rec,
  } as any;
}

describe('SaveBlogPost — saneado de HTML al guardar (XSS almacenado)', () => {
  it('elimina script y handlers on*, conserva el formato seguro', async () => {
    const repo = fakeRepo();
    const uc = new SaveBlogPost(repo, new BlogHtmlSanitizer());
    await uc.execute({
      title: 'Artículo de prueba',
      content: '<img src=x onerror=alert(1)><script>alert(2)</script><p>ok</p>',
      category: 'General',
      author: 'TryCatch GT',
      status: 'published',
    });
    const saved = repo._rec.saved.content as string;
    expect(saved).toContain('<p>ok</p>');
    expect(saved).not.toMatch(/onerror/i);
    expect(saved).not.toContain('<script');
  });
});
