import { Request, Response } from 'express';
import { LandingSampleRepository } from '../../application/ports/output/LandingSampleRepository.js';

/**
 * Sirve una muestra de landing en `/muestras/:slug`. Ruta pública (el enlace se pega
 * en los correos de prospección). El HTML se entrega tal cual, aislado con una CSP
 * `sandbox` SIN `allow-same-origin`: el JS/animaciones/CDNs del landing corren, pero
 * queda en un origen opaco y NO puede leer cookies ni llamar al /api del panel. Esta
 * cabecera sobrescribe la CSP estricta global de helmet en esta respuesta (helmet corre
 * antes; gana la última escritura). `noindex` evita que Google indexe las demos.
 * `frame-ancestors 'none'` reintroduce en esta respuesta la protección anti-clickjacking
 * que la CSP global sí trae pero que aquí se perdía al reemplazar la cabecera: impide
 * que la demo se incruste en un iframe de un sitio ajeno.
 *
 * Una muestra en borrador (`isActive === false`) se trata como inexistente (404): así
 * no se filtra que el slug existe y es coherente con el `noindex` de las demos.
 */
export function createLandingHandler(repo: LandingSampleRepository) {
  return async function serveLanding(req: Request, res: Response): Promise<void> {
    const slug = String(req.params.slug ?? '').toLowerCase();
    const row = await repo.findBySlug(slug);
    if (!row || !row.isActive) { res.status(404).type('text/plain').send('Muestra no encontrada'); return; }
    res.setHeader('Content-Security-Policy', "sandbox allow-scripts allow-popups allow-forms; frame-ancestors 'none'");
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(row.html);
  };
}
