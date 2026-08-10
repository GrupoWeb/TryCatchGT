import { Request, Response } from 'express';
import { SiteConfigRepository } from '../../../application/ports/output/SiteConfigRepository.js';
import { HtmlSanitizer } from '../../../application/ports/output/HtmlSanitizer.js';
import { LEGAL_DEFAULTS, LEGAL_SLUGS, isLegalSlug, LegalSlug } from '../legalDefaults.js';

const keyOf = (slug: LegalSlug) => `legal_${slug}`;

/**
 * Contenido de las páginas legales (Términos, Privacidad, Cookies) editable desde
 * el panel. Se guarda en site_config (una clave por página). Si no se ha editado,
 * se sirve el contenido por defecto (el mismo que traen las páginas públicas).
 */
export class LegalController {
  constructor(
    private readonly config: SiteConfigRepository,
    private readonly sanitizer: HtmlSanitizer,
  ) {}

  // Público: contenido de una página (guardado o por defecto).
  public getPublic = async (req: Request, res: Response): Promise<void> => {
    const slug = String(req.params.slug);
    if (!isLegalSlug(slug)) { res.status(404).json({ success: false, error: 'Página no encontrada.' }); return; }
    const all = await this.config.getAll();
    res.status(200).json({ success: true, data: { html: all[keyOf(slug)] || LEGAL_DEFAULTS[slug] } });
  };

  // Admin: las tres páginas para editarlas.
  public getAllAdmin = async (_req: Request, res: Response): Promise<void> => {
    const all = await this.config.getAll();
    const data = Object.fromEntries(LEGAL_SLUGS.map((s) => [s, all[keyOf(s)] || LEGAL_DEFAULTS[s]]));
    res.status(200).json({ success: true, data });
  };

  // Admin: guarda una página. El HTML se sanea (misma lista blanca que el blog).
  public update = async (req: Request, res: Response): Promise<void> => {
    const slug = String(req.params.slug);
    if (!isLegalSlug(slug)) { res.status(404).json({ success: false, error: 'Página no encontrada.' }); return; }
    const html = this.sanitizer.sanitize(String(req.body?.html ?? ''));
    await this.config.setMany({ [keyOf(slug)]: html });
    res.status(200).json({ success: true, data: { html } });
  };
}
