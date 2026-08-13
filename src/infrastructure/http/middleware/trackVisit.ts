import { Request, Response, NextFunction, RequestHandler } from 'express';
import { createHash } from 'node:crypto';
import { PageViewRepository } from '../../../application/ports/output/PageViewRepository.js';
import { env } from '../../../config/env.js';

// Rutas que nunca cuentan como "visita a una página": API, assets servidos en la
// BD, recursos de dev/SEO y el propio panel. El panel se excluye con su ruta real.
const EXCLUDED_PREFIXES = ['/api', '/dev/', '/media/', '/uploads/', '/robots.txt', '/sitemap.xml'];

// Extensiones de asset: si la ruta termina así, es un recurso, no una navegación.
const ASSET_EXT = /\.(?:js|mjs|css|map|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|eot|txt|xml|json|pdf|mp4|webm)$/i;

// Firmas de bots/crawlers frecuentes: sus visitas no cuentan como tráfico humano.
const BOT_RE = /(bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora|pinterest|whatsapp|telegrambot|discordbot|headless|phantom|puppeteer|python-requests|curl|wget|axios|go-http|monitor|uptime|lighthouse|pingdom|semrush|ahrefs|mj12|dotbot|petalbot|gptbot|ccbot|claudebot|amazonbot|bytespider)/i;

export function isBot(ua: string): boolean {
  return BOT_RE.test(ua);
}

export function classifyDevice(ua: string): 'mobile' | 'tablet' | 'desktop' {
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) return 'tablet';
  if (/mobi|iphone|ipod|android.*mobile|windows phone|blackberry|opera mini/i.test(ua)) return 'mobile';
  return 'desktop';
}

export function detectBrowser(ua: string): string | null {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\/|opera/i.test(ua)) return 'Opera';
  if (/samsungbrowser/i.test(ua)) return 'Samsung';
  if (/firefox\/|fxios/i.test(ua)) return 'Firefox';
  if (/chrome\/|crios/i.test(ua)) return 'Chrome';
  if (/safari\//i.test(ua)) return 'Safari';
  return null;
}

/**
 * ¿La petición es una navegación a una página pública que debe contarse? Solo GET
 * con Accept text/html (así se descartan los fetch del SPA a /api y la carga de
 * assets), fuera del panel y de las rutas excluidas, y sin extensión de archivo.
 */
export function shouldTrack(method: string, pathName: string, accept: string, adminPath: string): boolean {
  if (method !== 'GET') return false;
  if (!accept.includes('text/html')) return false;
  if (pathName === adminPath || pathName.startsWith(`${adminPath}/`)) return false;
  if (EXCLUDED_PREFIXES.some((p) => pathName.startsWith(p))) return false;
  if (ASSET_EXT.test(pathName)) return false;
  return true;
}

// Referrer externo normalizado a su host (los internos o ausentes se descartan).
export function externalReferrerHost(referer: string | undefined, host: string | undefined): string | null {
  if (!referer) return null;
  try {
    const url = new URL(referer);
    if (host && url.host === host) return null; // navegación interna: no es una fuente
    return url.host.replace(/^www\./, '').slice(0, 255);
  } catch {
    return null;
  }
}

/**
 * Hash diario e irreversible del visitante: SHA-256 de IP + user-agent + fecha + sal.
 * Sin cookies ni almacenar la IP. Rota cada día por diseño, de modo que no permite
 * seguir a una persona entre días (privacidad) pero sí contar únicos por día.
 */
export function visitorHash(ip: string, ua: string, day: string, salt: string): string {
  return createHash('sha256').update(`${ip}|${ua}|${day}|${salt}`).digest('hex');
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Registra las visitas a páginas públicas para la analítica first-party. Escribe al
 * finalizar la respuesta (solo si terminó con éxito) y nunca interrumpe ni ralentiza
 * la petición: el guardado es best-effort y cualquier error se ignora.
 */
export function createTrackVisit(pageViews: PageViewRepository): RequestHandler {
  const salt = env.session.secret;
  return (req: Request, res: Response, next: NextFunction): void => {
    const accept = String(req.headers['accept'] || '');
    if (!shouldTrack(req.method, req.path, accept, env.adminPath)) { next(); return; }

    const ua = String(req.headers['user-agent'] || '');
    if (isBot(ua)) { next(); return; }

    res.on('finish', () => {
      if (res.statusCode >= 400) return;
      const ip = (req.ip || req.socket?.remoteAddress || '') as string;
      const country = String(req.headers['cf-ipcountry'] || '').slice(0, 2).toUpperCase() || null;
      void pageViews
        .record({
          path: req.path,
          referrer: externalReferrerHost(req.headers['referer'] as string | undefined, req.headers['host']),
          country: country && country !== 'XX' ? country : null,
          device: classifyDevice(ua),
          browser: detectBrowser(ua),
          visitorHash: visitorHash(ip, ua, todayKey(), salt),
        })
        .catch(() => { /* la analítica nunca rompe la petición */ });
    });

    next();
  };
}