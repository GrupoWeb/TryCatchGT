import { Request, Response, NextFunction, RequestHandler } from 'express';
import { SiteConfigRepository } from '../../../application/ports/output/SiteConfigRepository.js';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface SiteVerifyResponse {
  success?: boolean;
  'error-codes'?: string[];
}

/**
 * Guard de Cloudflare Turnstile para formularios. Lee la configuración desde el
 * panel (site_config): si está desactivado o no hay secret configurado, deja pasar
 * (para no romper los formularios antes de configurar las llaves). Si está activo,
 * exige y verifica el token contra la API de Cloudflare. Es fail-closed: ante un
 * fallo de red en la verificación con la protección activa, rechaza la petición.
 */
export function createTurnstileGuard(config: SiteConfigRepository): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    let stored: Record<string, string>;
    try {
      stored = await config.getAll();
    } catch {
      next(); // si no se puede leer la config, no bloqueamos el formulario
      return;
    }

    const enabled = stored.turnstileEnabled === 'true';
    const secret = stored.turnstileSecretKey;
    if (!enabled || !secret) {
      next();
      return;
    }

    const body = req.body ?? {};
    const token = body['cf-turnstile-response'] || body.turnstileToken;
    if (!token) {
      res.status(400).json({ success: false, error: 'Completa la verificación anti-bots.' });
      return;
    }

    try {
      const params = new URLSearchParams();
      params.append('secret', secret);
      params.append('response', String(token));
      const ip = req.ip || req.socket?.remoteAddress;
      if (ip) params.append('remoteip', ip);

      const response = await fetch(VERIFY_URL, { method: 'POST', body: params });
      const data = (await response.json()) as SiteVerifyResponse;
      if (!data.success) {
        res.status(403).json({ success: false, error: 'No se pudo validar la verificación anti-bots. Inténtalo de nuevo.' });
        return;
      }
      next();
    } catch {
      res.status(503).json({ success: false, error: 'No se pudo verificar la protección anti-bots. Inténtalo más tarde.' });
    }
  };
}
