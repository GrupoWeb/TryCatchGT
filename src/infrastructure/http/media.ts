import { Request, Response } from 'express';
import { MediaRepository } from '../../application/ports/output/MediaRepository.js';

/**
 * Sirve una imagen almacenada en la BD por `/api/media/:id`. Ruta pública (las
 * portadas del blog se muestran en el sitio público). El contenido es inmutable
 * (cada id apunta a unos bytes fijos), así que se cachea agresivamente.
 */
export function createMediaHandler(media: MediaRepository) {
  return async function serveMedia(req: Request, res: Response): Promise<void> {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) { res.status(404).end(); return; }
    const row = await media.findById(id);
    if (!row) { res.status(404).end(); return; }
    res.setHeader('Content-Type', row.mime);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.status(200).send(row.data);
  };
}
