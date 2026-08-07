import express, { Response, NextFunction, Request } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import fs from 'node:fs';
import { env, assertSecureSecrets } from '../../config/env.js';
import { apiRouter, ensureAdminUser } from './routes/apiRoutes.js';
import { createLiveReload } from './devLiveReload.js';
import { testConnection } from '../database/mysql/connection.js';

// Los assets del frontend (HTML/CSS/JS) no los compila tsc, así que se sirven
// directamente desde el árbol de fuentes usando la raíz del proyecto.
const publicDir = path.join(process.cwd(), 'src', 'presentation', 'public');

const app = express();

// Necesario para que el rate-limit lea la IP real detrás de un proxy en prod.
app.set('trust proxy', env.isProduction ? 1 : false);

// Cabeceras de seguridad. CSP a medida para no romper Google Fonts, imágenes
// subidas / data-URIs (QR) ni el live-reload en desarrollo.
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        scriptSrc: env.isProduction ? ["'self'"] : ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        ...(env.isProduction ? { upgradeInsecureRequests: [] } : {}),
      },
    },
  }),
);

// CORS solo si se configuran orígenes; por defecto, mismo origen (más seguro).
if (env.security.corsOrigins.length) {
  app.use(cors({ origin: env.security.corsOrigins, credentials: true }));
}

app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: true, limit: '200kb' }));

app.use('/api', apiRouter);

// Live reload solo en desarrollo: refresca el navegador al guardar el frontend.
const liveReload = env.isProduction ? null : createLiveReload(publicDir);
if (liveReload) {
  app.get('/dev/livereload', liveReload.sseHandler);
}

// redirect:false evita que un directorio (p. ej. /admin) haga 301 a "/admin/".
app.use(express.static(publicDir, { index: false, redirect: false }));

// Sirve una página HTML inyectando el snippet de live reload en desarrollo.
// En producción cachea el contenido en memoria tras la primera lectura.
const htmlCache = new Map<string, string>();
function sendHtml(res: Response, relativePath: string): void {
  const absPath = path.join(publicDir, relativePath);
  if (liveReload) {
    res.type('html').send(liveReload.injectInto(fs.readFileSync(absPath, 'utf8')));
    return;
  }
  let html = htmlCache.get(relativePath);
  if (html === undefined) {
    html = fs.readFileSync(absPath, 'utf8');
    htmlCache.set(relativePath, html);
  }
  res.type('html').send(html);
}

// Páginas con URLs "bonitas".
app.get('/blog', (_req, res) => sendHtml(res, 'blog.html'));
app.get('/blog/:slug', (_req, res) => sendHtml(res, 'post.html'));
app.get(['/admin', '/admin/*'], (_req, res) => sendHtml(res, 'admin/index.html'));
app.get('/privacidad', (_req, res) => sendHtml(res, 'legal/privacidad.html'));
app.get('/terminos', (_req, res) => sendHtml(res, 'legal/terminos.html'));
app.get('/cookies', (_req, res) => sendHtml(res, 'legal/cookies.html'));

// Fallback SPA: cualquier otra ruta no-API devuelve la landing.
app.get('*', (_req, res) => sendHtml(res, 'index.html'));

// Manejador central de errores: registra en servidor, responde genérico al cliente
// (sin exponer stack traces ni mensajes internos).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('❌ Error no controlado:', err.message);
  if (res.headersSent) return;
  res.status(500).json({ success: false, error: 'Ocurrió un error inesperado.' });
});

async function bootstrap(): Promise<void> {
  assertSecureSecrets();
  app.listen(env.port, () => {
    console.log('');
    console.log('  ⚡ TryCatch GT — Estudio de Ingeniería de Software');
    console.log(`  🚀 Servidor activo en: http://localhost:${env.port}`);
    console.log(`  🌎 Entorno: ${env.nodeEnv}`);
    if (liveReload) console.log('  🔁 Live reload activo (el navegador se refresca solo)');
    console.log('');
  });

  // Probe de MySQL + siembra del admin inicial. No bloquean el arranque del
  // servidor; si MySQL falla, los repositorios degradan a memoria.
  const dbUp = await testConnection();
  if (dbUp) {
    try {
      await ensureAdminUser.execute();
    } catch (error) {
      console.warn('⚠️  No se pudo sembrar el admin inicial:', (error as Error).message);
    }
  }
}

void bootstrap();
