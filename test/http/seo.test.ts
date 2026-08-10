import { describe, it, expect } from 'vitest';
import { buildPostSeo, buildDefaultPostSeo, buildSitemap, buildRobots, SeoPost } from '../../src/infrastructure/http/seo.js';

const APP = 'https://trycatchgt.org';
const post: SeoPost = {
  slug: 'mi-articulo',
  title: 'Título del <b>artículo</b>',
  excerpt: 'Un resumen del artículo con <em>HTML</em> que debe limpiarse.',
  author: 'Juan Jolón',
  category: 'Technology',
  coverImage: '/api/media/5',
  publishedAt: new Date('2026-03-18T17:03:57.000Z'),
  updatedAt: new Date('2026-03-20T10:00:00.000Z'),
};

describe('buildPostSeo', () => {
  const html = buildPostSeo(post, APP);

  it('genera title, canonical y og absolutos', () => {
    expect(html).toContain('<title>Título del &lt;b&gt;artículo&lt;/b&gt; · TryCatch GT</title>');
    expect(html).toContain(`<link rel="canonical" href="https://trycatchgt.org/blog/mi-articulo" />`);
    expect(html).toContain('property="og:type" content="article"');
    expect(html).toContain('property="og:url" content="https://trycatchgt.org/blog/mi-articulo"');
  });

  it('hace absoluta la imagen de portada relativa', () => {
    expect(html).toContain('content="https://trycatchgt.org/api/media/5"');
  });

  it('incluye JSON-LD BlogPosting con fecha de publicación', () => {
    expect(html).toContain('"@type":"BlogPosting"');
    expect(html).toContain('"datePublished":"2026-03-18T17:03:57.000Z"');
  });

  it('la descripción va sin HTML', () => {
    expect(html).toContain('content="Un resumen del artículo con HTML que debe limpiarse."');
  });

  it('usa el og-image por defecto si no hay portada', () => {
    const noCover = buildPostSeo({ ...post, coverImage: '' }, APP);
    expect(noCover).toContain('content="https://trycatchgt.org/og-image.svg"');
  });
});

describe('buildDefaultPostSeo', () => {
  it('marca noindex para no indexar artículos inexistentes', () => {
    expect(buildDefaultPostSeo()).toContain('name="robots" content="noindex"');
  });
});

describe('buildSitemap', () => {
  const xml = buildSitemap(APP, [post]);
  it('incluye páginas estáticas y el artículo con lastmod', () => {
    expect(xml).toContain('<loc>https://trycatchgt.org/</loc>');
    expect(xml).toContain('<loc>https://trycatchgt.org/blog</loc>');
    expect(xml).toContain('<loc>https://trycatchgt.org/blog/mi-articulo</loc>');
    expect(xml).toContain('<lastmod>2026-03-20</lastmod>');
    expect(xml.startsWith('<?xml')).toBe(true);
  });
});

describe('buildRobots', () => {
  it('apunta al sitemap y bloquea /api', () => {
    const txt = buildRobots(APP);
    expect(txt).toContain('Disallow: /api/');
    expect(txt).toContain('Sitemap: https://trycatchgt.org/sitemap.xml');
  });
});
