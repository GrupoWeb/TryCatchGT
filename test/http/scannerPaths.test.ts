import { describe, it, expect } from 'vitest';
import { isScannerPath } from '../../src/infrastructure/http/scannerPaths.js';

describe('isScannerPath', () => {
  it('detecta sondeos típicos de WordPress/PHP/otros CMS', () => {
    for (const p of [
      '/wp-admin/install.php',
      '/wp-login.php',
      '/wp-includes/x.php',
      '/wp-content/uploads/shell.php',
      '/xmlrpc.php',
      '/phpmyadmin/index.php',
      '/administrator/',
      '/vendor/phpunit/eval-stdin.php',
      '/.env',
      '/.git/config',
      '/index.php',
      '/login.aspx',
      '/cgi-bin/test',
    ]) {
      expect(isScannerPath(p), p).toBe(true);
    }
  });

  it('no marca las rutas legítimas del sitio', () => {
    for (const p of ['/', '/blog', '/blog/mi-articulo', '/privacidad', '/terminos', '/cookies', '/admin', '/api/config', '/media/12', '/sitemap.xml', '/robots.txt']) {
      expect(isScannerPath(p), p).toBe(false);
    }
  });
});
