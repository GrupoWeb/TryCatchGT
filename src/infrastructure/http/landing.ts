import { Request, Response } from 'express';
import { LandingSampleRepository } from '../../application/ports/output/LandingSampleRepository.js';

export const LANDING_SAMPLE_CSP = [
  'sandbox allow-scripts allow-popups allow-forms',
  "default-src 'self' https: data: blob:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:",
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' https: data: blob:",
  "font-src 'self' https: data:",
  "connect-src 'self' https:",
  "media-src 'self' https: data: blob:",
  'frame-src https:',
  "base-uri 'none'",
  "object-src 'none'",
  "form-action 'self' https: mailto:",
  "frame-ancestors 'self'",
].join('; ');

/**
 * Sirve una muestra de landing en `/muestras/:slug`. Ruta pública (el enlace se pega
 * en los correos de prospección). El HTML se entrega tal cual, aislado con una CSP
 * `sandbox` SIN `allow-same-origin`: el JS/animaciones/CDNs del landing corren, pero
 * queda en un origen opaco y NO puede leer cookies ni llamar al /api del panel. Además
 * se acotan bases, objetos, formularios y destinos comunes sin impedir assets externos
 * habituales en demos. Esta cabecera sobrescribe la CSP estricta global de helmet en
 * esta respuesta (helmet corre antes; gana la última escritura). `noindex` evita que
 * Google indexe las demos. `frame-ancestors 'self'` bloquea iframes desde sitios ajenos
 * pero permite la previsualización real dentro del panel admin.
 *
 * Una muestra en borrador (`isActive === false`) se trata como inexistente (404): así
 * no se filtra que el slug existe y es coherente con el `noindex` de las demos.
 */
export function createLandingHandler(repo: LandingSampleRepository) {
  return async function serveLanding(req: Request, res: Response): Promise<void> {
    const slug = String(req.params.slug ?? '').toLowerCase();
    const row = await repo.findBySlug(slug);
    if (!row || !row.isActive) { res.status(404).type('text/plain').send('Muestra no encontrada'); return; }
    res.setHeader('Content-Security-Policy', LANDING_SAMPLE_CSP);
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(row.html);
  };
}
