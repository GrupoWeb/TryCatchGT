/**
 * Utilidades SEO: meta tags server-side por artículo, sitemap.xml y robots.txt.
 * Los artículos del blog se renderizan por JS, así que sin esto los buscadores y
 * las redes sociales no ven título/descripción/imagen por artículo.
 */

export interface SeoPost {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  category: string;
  coverImage: string;
  publishedAt: Date | null;
  updatedAt: Date;
}

function esc(v: string): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function stripHtml(v: string): string {
  return String(v ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncate(v: string, max: number): string {
  const s = stripHtml(v);
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

// Convierte una ruta relativa (/uploads/x, /api/media/1) en URL absoluta.
function absUrl(src: string, appUrl: string): string {
  if (!src) return '';
  if (/^https?:\/\//i.test(src)) return src;
  return `${appUrl}${src.startsWith('/') ? '' : '/'}${src}`;
}

/** Bloque <head> con title + meta + JSON-LD para un artículo del blog. */
export function buildPostSeo(post: SeoPost, appUrl: string): string {
  const url = `${appUrl}/blog/${post.slug}`;
  const desc = truncate(post.excerpt, 160);
  const image = absUrl(post.coverImage, appUrl) || `${appUrl}/og-image.svg`;
  const published = post.publishedAt ? post.publishedAt.toISOString() : '';
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: desc,
    image,
    datePublished: published || undefined,
    dateModified: post.updatedAt.toISOString(),
    author: { '@type': 'Person', name: post.author },
    publisher: { '@type': 'Organization', name: 'TryCatch GT', logo: { '@type': 'ImageObject', url: `${appUrl}/favicon.svg` } },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  };
  return [
    `<title>${esc(post.title)} · TryCatch GT</title>`,
    `<meta name="description" content="${esc(desc)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:site_name" content="TryCatch GT" />`,
    `<meta property="og:locale" content="es_GT" />`,
    `<meta property="og:title" content="${esc(post.title)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    published ? `<meta property="article:published_time" content="${esc(published)}" />` : '',
    `<meta property="article:author" content="${esc(post.author)}" />`,
    `<meta property="article:section" content="${esc(post.category)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(post.title)}" />`,
    `<meta name="twitter:description" content="${esc(desc)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
    `<script type="application/ld+json">${JSON.stringify(ld)}</script>`,
  ].filter(Boolean).join('\n  ');
}

/** Meta por defecto cuando el artículo no existe (evita indexar un soft-404). */
export function buildDefaultPostSeo(): string {
  return [
    `<title>Artículo · TryCatch GT</title>`,
    `<meta name="robots" content="noindex" />`,
  ].join('\n  ');
}

/** sitemap.xml con las páginas estáticas y los artículos publicados. */
export function buildSitemap(appUrl: string, posts: SeoPost[]): string {
  const staticPages = [
    { loc: `${appUrl}/`, priority: '1.0' },
    { loc: `${appUrl}/blog`, priority: '0.8' },
    { loc: `${appUrl}/privacidad`, priority: '0.3' },
    { loc: `${appUrl}/terminos`, priority: '0.3' },
    { loc: `${appUrl}/cookies`, priority: '0.3' },
  ];
  const urls = [
    ...staticPages.map((p) => `  <url>\n    <loc>${esc(p.loc)}</loc>\n    <priority>${p.priority}</priority>\n  </url>`),
    ...posts.map((post) => {
      const lastmod = (post.updatedAt || post.publishedAt || new Date()).toISOString().slice(0, 10);
      return `  <url>\n    <loc>${esc(`${appUrl}/blog/${post.slug}`)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>0.7</priority>\n  </url>`;
    }),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

/** robots.txt. No lista rutas de administración para no delatarlas. */
export function buildRobots(appUrl: string): string {
  return `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${appUrl}/sitemap.xml\n`;
}
