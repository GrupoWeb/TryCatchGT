import { Request, Response } from 'express';
import { LandingSampleRepository } from '../../../application/ports/output/LandingSampleRepository.js';
import { LandingSample } from '../../../domain/entities/LandingSample.js';
import { slugify } from '../../../domain/entities/BlogPost.js';
import { AuthedRequest } from '../middleware/requireAuth.js';

const MAX_LANDING_HTML_BYTES = 200 * 1024;

// Vista de lista: sin el HTML (puede ser enorme) — solo lo necesario para el panel.
function toListView(s: LandingSample) {
  return {
    id: s.id,
    slug: s.slug,
    title: s.title,
    isActive: s.isActive,
    updatedAt: s.updatedAt,
    url: `/muestras/${s.slug}`,
  };
}

// Vista de detalle: incluye el HTML completo para editar.
function toDetailView(s: LandingSample) {
  return {
    id: s.id,
    slug: s.slug,
    title: s.title,
    html: s.html,
    isActive: s.isActive,
    updatedAt: s.updatedAt,
    url: `/muestras/${s.slug}`,
  };
}

/**
 * CRUD de muestras de landing. Solo admin (montado con requireAuth + requireAdmin):
 * permitir subir HTML arbitrario a no-admin sería phishing bajo la marca. El HTML se
 * guarda tal cual (no se sanea): el aislamiento se hace al servir con CSP sandbox.
 */
export class LandingSampleController {
  constructor(private readonly repo: LandingSampleRepository) {}

  public list = async (_req: Request, res: Response): Promise<void> => {
    const rows = await this.repo.findAll();
    res.status(200).json({ success: true, data: rows.map(toListView) });
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const s = await this.repo.findById(Number(req.params.id));
    if (!s) { res.status(404).json({ success: false, error: 'Muestra no encontrada.' }); return; }
    res.status(200).json({ success: true, data: toDetailView(s) });
  };

  public create = (req: Request, res: Response): Promise<void> => this.upsert(req, res, undefined);
  public update = (req: Request, res: Response): Promise<void> => this.upsert(req, res, Number(req.params.id));

  public remove = async (req: Request, res: Response): Promise<void> => {
    const ok = await this.repo.delete(Number(req.params.id));
    if (!ok) { res.status(404).json({ success: false, error: 'Muestra no encontrada.' }); return; }
    res.status(200).json({ success: true });
  };

  /**
   * Publica/despublica una muestra sin reenviar el HTML (toggle rápido desde la lista).
   * Reconstruye la muestra con el nuevo estado y la reguarda; el resto de campos se
   * conservan tal cual estaban.
   */
  public setActive = async (req: AuthedRequest, res: Response): Promise<void> => {
    const current = await this.repo.findById(Number(req.params.id));
    if (!current) { res.status(404).json({ success: false, error: 'Muestra no encontrada.' }); return; }
    const isActive = req.body?.isActive === true;
    const saved = await this.repo.save(new LandingSample({
      id: current.id,
      slug: current.slug,
      title: current.title,
      html: current.html,
      isActive,
      createdBy: current.createdBy,
    }));
    res.status(200).json({ success: true, data: toListView(saved) });
  };

  private async upsert(req: AuthedRequest, res: Response, id?: number): Promise<void> {
    try {
      const b = req.body ?? {};
      if (!b.title || String(b.title).trim().length < 2) {
        res.status(400).json({ success: false, error: 'El título es obligatorio.' });
        return;
      }
      // El HTML se recibe en base64 (`htmlBase64`) para que el payload no contenga
      // marcado `<script>`/eventos que un WAF (p. ej. ModSecurity de Hostinger)
      // bloquearía como intento de inyección. Se mantiene el campo `html` en crudo
      // como respaldo/compatibilidad. El contenido NO se sanea: el aislamiento es el
      // sandbox al servir, no reescribir el HTML.
      const html = typeof b.htmlBase64 === 'string' && b.htmlBase64.length
        ? Buffer.from(b.htmlBase64, 'base64').toString('utf8')
        : String(b.html ?? '');
      if (!html.trim()) {
        res.status(400).json({ success: false, error: 'El HTML de la muestra no puede estar vacío.' });
        return;
      }
      if (Buffer.byteLength(html, 'utf8') > MAX_LANDING_HTML_BYTES) {
        res.status(400).json({ success: false, error: 'El HTML de la muestra no puede superar 200 KB.' });
        return;
      }
      const slug = ((b.slug && String(b.slug).trim()) || slugify(String(b.title))).toLowerCase();
      if (!/^[a-z0-9-]+$/.test(slug)) {
        res.status(400).json({ success: false, error: 'El slug solo admite minúsculas, números y guiones.' });
        return;
      }
      // Unicidad del slug: rechazar si ya lo usa OTRA muestra.
      const clash = await this.repo.findBySlug(slug);
      if (clash && clash.id !== id) {
        res.status(409).json({ success: false, error: 'Ese slug ya está en uso por otra muestra.' });
        return;
      }
      // Estado publicado/borrador. Si el cliente no lo envía: al crear queda activa
      // (default del dominio); al actualizar se conserva el estado que ya tenía, para
      // que un update sin el campo no republique un borrador por accidente.
      let isActive: boolean | undefined = typeof b.isActive === 'boolean' ? b.isActive : undefined;
      if (isActive === undefined && id) {
        const current = await this.repo.findById(id);
        isActive = current?.isActive;
      }
      const sample = new LandingSample({
        id,
        slug,
        title: String(b.title).trim(),
        html,
        isActive,
        createdBy: req.userId ?? null,
      });
      const saved = await this.repo.save(sample);
      res.status(id ? 200 : 201).json({ success: true, data: toDetailView(saved) });
    } catch (error) {
      console.error('❌ Error guardando muestra:', (error as Error).message);
      res.status(500).json({ success: false, error: 'No se pudo guardar la muestra.' });
    }
  }
}
