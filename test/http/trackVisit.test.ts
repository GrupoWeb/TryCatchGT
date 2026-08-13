import { describe, it, expect } from 'vitest';
import {
  shouldTrack,
  isBot,
  classifyDevice,
  detectBrowser,
  externalReferrerHost,
  visitorHash,
  normalizeIp,
  countryFromIp,
} from '../../src/infrastructure/http/middleware/trackVisit.js';

const HTML = 'text/html,application/xhtml+xml';

describe('trackVisit · shouldTrack', () => {
  it('cuenta navegaciones GET a páginas públicas con Accept text/html', () => {
    expect(shouldTrack('GET', '/', HTML, '/admin')).toBe(true);
    expect(shouldTrack('GET', '/blog', HTML, '/admin')).toBe(true);
    expect(shouldTrack('GET', '/blog/mi-articulo', HTML, '/admin')).toBe(true);
  });

  it('descarta métodos no-GET y peticiones sin Accept text/html (fetch del SPA)', () => {
    expect(shouldTrack('POST', '/', HTML, '/admin')).toBe(false);
    expect(shouldTrack('GET', '/', 'application/json', '/admin')).toBe(false);
  });

  it('descarta API, assets, recursos SEO y el panel (con su ruta real)', () => {
    expect(shouldTrack('GET', '/api/blog', HTML, '/admin')).toBe(false);
    expect(shouldTrack('GET', '/css/framer-theme.css', HTML, '/admin')).toBe(false);
    expect(shouldTrack('GET', '/js/main.js', HTML, '/admin')).toBe(false);
    expect(shouldTrack('GET', '/media/12', HTML, '/admin')).toBe(false);
    expect(shouldTrack('GET', '/sitemap.xml', HTML, '/admin')).toBe(false);
    expect(shouldTrack('GET', '/admin', HTML, '/admin')).toBe(false);
    expect(shouldTrack('GET', '/admin/posts', HTML, '/admin')).toBe(false);
    // Panel movido a ruta secreta: se excluye por esa ruta, no por "/admin".
    expect(shouldTrack('GET', '/panel-x7', HTML, '/panel-x7')).toBe(false);
  });

  it('descarta sondeos de escáner (wp-admin, .php, phpmyadmin)', () => {
    expect(shouldTrack('GET', '/wp-admin/install.php', HTML, '/admin')).toBe(false);
    expect(shouldTrack('GET', '/wp-login.php', HTML, '/admin')).toBe(false);
    expect(shouldTrack('GET', '/xmlrpc.php', HTML, '/admin')).toBe(false);
    expect(shouldTrack('GET', '/phpmyadmin/', HTML, '/admin')).toBe(false);
    expect(shouldTrack('GET', '/.env', HTML, '/admin')).toBe(false);
  });
});

describe('trackVisit · país por GeoIP local', () => {
  it('normaliza IPv4 mapeada a IPv6', () => {
    expect(normalizeIp('::ffff:8.8.8.8')).toBe('8.8.8.8');
    expect(normalizeIp('8.8.8.8')).toBe('8.8.8.8');
  });

  it('resuelve el país (ISO 2 letras) de una IP pública', () => {
    const c = countryFromIp('8.8.8.8');
    expect(c).toMatch(/^[A-Z]{2}$/);
  });

  it('devuelve null para IP local/privada o ausente', () => {
    expect(countryFromIp('127.0.0.1')).toBeNull();
    expect(countryFromIp('::1')).toBeNull();
    expect(countryFromIp('')).toBeNull();
    expect(countryFromIp(null)).toBeNull();
  });
});

describe('trackVisit · clasificación de user-agent', () => {
  it('detecta bots y crawlers frecuentes', () => {
    expect(isBot('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true);
    expect(isBot('facebookexternalhit/1.1')).toBe(true);
    expect(isBot('curl/8.4.0')).toBe(true);
    expect(isBot('Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537.36')).toBe(false);
  });

  it('clasifica el tipo de dispositivo', () => {
    expect(classifyDevice('iPhone; CPU iPhone OS 17_0 like Mac OS X')).toBe('mobile');
    expect(classifyDevice('Linux; Android 13; Pixel 7) Mobile Safari')).toBe('mobile');
    expect(classifyDevice('iPad; CPU OS 17_0 like Mac OS X')).toBe('tablet');
    expect(classifyDevice('Windows NT 10.0; Win64; x64')).toBe('desktop');
  });

  it('detecta el navegador (Edge/Chrome no se confunden)', () => {
    expect(detectBrowser('Windows NT 10.0) Chrome/120 Safari/537.36 Edg/120')).toBe('Edge');
    expect(detectBrowser('Windows NT 10.0) Chrome/120 Safari/537.36')).toBe('Chrome');
    expect(detectBrowser('Macintosh) Version/17.0 Safari/605.1.15')).toBe('Safari');
    expect(detectBrowser('X11; Linux) Gecko/20100101 Firefox/121.0')).toBe('Firefox');
  });
});

describe('trackVisit · referrer', () => {
  it('normaliza referrers externos a su host sin www y descarta los internos', () => {
    expect(externalReferrerHost('https://www.google.com/search?q=x', 'trycatchgt.org')).toBe('google.com');
    expect(externalReferrerHost('https://trycatchgt.org/blog', 'trycatchgt.org')).toBeNull();
    expect(externalReferrerHost(undefined, 'trycatchgt.org')).toBeNull();
    expect(externalReferrerHost('no-es-una-url', 'trycatchgt.org')).toBeNull();
  });
});

describe('trackVisit · hash del visitante', () => {
  it('es determinista para la misma IP+UA+día y cambia al cambiar el día', () => {
    const a = visitorHash('1.2.3.4', 'UA', '2026-08-13', 's');
    const b = visitorHash('1.2.3.4', 'UA', '2026-08-13', 's');
    const c = visitorHash('1.2.3.4', 'UA', '2026-08-14', 's');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it('distingue visitantes distintos (IP diferente)', () => {
    expect(visitorHash('1.1.1.1', 'UA', '2026-08-13', 's'))
      .not.toBe(visitorHash('2.2.2.2', 'UA', '2026-08-13', 's'));
  });
});
