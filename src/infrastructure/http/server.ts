import 'reflect-metadata';
import express, { Response, NextFunction, Request } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import fs from 'node:fs';
import { env, assertSecureSecrets } from '../../config/env.js';
import { apiRouter, ensureAdminUser, seoGetPost, seoListPosts, processDueCadences, trackVisit } from './routes/apiRoutes.js';
import { createLiveReload } from './devLiveReload.js';
import { buildCspDirectives } from './csp.js';
import { buildPostSeo, buildDefaultPostSeo, buildSitemap, buildRobots } from './seo.js';
import { AppDataSource } from '../database/typeorm/data-source.js';

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
      directives: buildCspDirectives({ isProduction: env.isProduction, forceHttps: env.forceHttps }),
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

// Analítica first-party: cuenta las navegaciones a páginas públicas (filtra API,
// assets y el panel dentro del propio middleware). Va tras montar /api para no
// interferir con esas rutas, y antes de servir el HTML/estáticos.
app.use(trackVisit);

// Live reload solo en desarrollo: refresca el navegador al guardar el frontend.
const liveReload = env.isProduction ? null : createLiveReload(publicDir);
if (liveReload) {
  app.get('/dev/livereload', liveReload.sseHandler);
}

// ── Panel de administración en ruta configurable (ADMIN_PATH) ───────────────
// Los assets del panel (admin.js/css) se sirven SOLO bajo env.adminPath. Si la ruta
// se cambió respecto a /admin, se bloquea el /admin por defecto (y sus archivos)
// para que no delate la existencia del panel: cae a la landing como cualquier ruta
// inexistente. La auth sigue siendo el control real; esto es solo ofuscación.
const adminDir = path.join(publicDir, 'admin');
const adminHidden = env.adminPath !== '/admin';

app.use(env.adminPath, express.static(adminDir, { index: false, redirect: false }));

if (adminHidden) {
  app.use((req, res, next) => {
    if (req.path === '/admin' || req.path.startsWith('/admin/')) {
      sendHtml(res, 'index.html');
      return;
    }
    next();
  });
}

// redirect:false evita que un directorio haga 301 a la variante con "/".
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

// ── SEO: robots.txt y sitemap.xml (dinámicos, con la URL pública real) ──────
app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(buildRobots(env.appUrl));
});
app.get('/sitemap.xml', async (_req, res) => {
  try {
    const posts = await seoListPosts();
    res.type('application/xml').send(buildSitemap(env.appUrl, posts));
  } catch {
    res.type('application/xml').send(buildSitemap(env.appUrl, []));
  }
});

// Sirve el artículo del blog inyectando las meta tags server-side (title,
// description, canonical, Open Graph, Twitter, JSON-LD Article) en el marcador
// {{HEAD_SEO}} de post.html, para que buscadores y redes las vean sin ejecutar JS.
function sendPostHtml(res: Response, seo: string): void {
  const absPath = path.join(publicDir, 'post.html');
  const raw = fs.readFileSync(absPath, 'utf8').replace('{{HEAD_SEO}}', seo);
  res.type('html').send(liveReload ? liveReload.injectInto(raw) : raw);
}

// Sirve el HTML del panel resolviendo {{ADMIN_BASE}} a la ruta real (env.adminPath),
// para que los assets y el history.replaceState apunten a la ruta secreta.
let adminHtmlCache: string | undefined;
function sendAdminHtml(res: Response): void {
  const absPath = path.join(publicDir, 'admin', 'index.html');
  if (liveReload) {
    const html = fs.readFileSync(absPath, 'utf8').replaceAll('{{ADMIN_BASE}}', env.adminPath);
    res.type('html').send(liveReload.injectInto(html));
    return;
  }
  if (adminHtmlCache === undefined) {
    adminHtmlCache = fs.readFileSync(absPath, 'utf8').replaceAll('{{ADMIN_BASE}}', env.adminPath);
  }
  res.type('html').send(adminHtmlCache);
}

// Páginas con URLs "bonitas".
app.get('/blog', (_req, res) => sendHtml(res, 'blog.html'));
app.get('/blog/:slug', async (req, res) => {
  try {
    const post = await seoGetPost(String(req.params.slug));
    if (!post) { res.status(404); sendPostHtml(res, buildDefaultPostSeo()); return; }
    sendPostHtml(res, buildPostSeo(post, env.appUrl));
  } catch {
    sendPostHtml(res, buildDefaultPostSeo());
  }
});
app.get([env.adminPath, `${env.adminPath}/*`], (_req, res) => sendAdminHtml(res));
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

/**
 * Scheduler en proceso de las cadencias de seguimiento (Fase 4). Cada intervalo
 * procesa los pasos vencidos. Un guard evita que dos ejecuciones se solapen si una
 * tarda más que el intervalo. Se puede desactivar con CADENCE_INTERVAL_MINUTES=0
 * (el panel conserva el botón "Procesar ahora").
 */
function startCadenceScheduler(): void {
  const minutes = env.cadence.intervalMinutes;
  if (!Number.isFinite(minutes) || minutes <= 0) {
    console.log('  ⏸️  Scheduler de cadencias desactivado (CADENCE_INTERVAL_MINUTES=0)');
    return;
  }
  let running = false;
  const tick = async (): Promise<void> => {
    if (running) return;
    running = true;
    try {
      const r = await processDueCadences.execute();
      if (r.processed > 0) {
        console.log(`  🔁 Cadencias: ${r.processed} evaluadas · ${r.sent} enviadas · ${r.completed} completadas · ${r.stopped} cortadas`);
      }
    } catch (error) {
      console.error('⚠️  Scheduler de cadencias falló:', (error as Error).message);
    } finally {
      running = false;
    }
  };
  const handle = setInterval(() => void tick(), minutes * 60 * 1000);
  handle.unref?.(); // no impedir que el proceso termine por este timer
  console.log(`  🔁 Scheduler de cadencias activo (cada ${minutes} min)`);
}

function listen(): void {
  app.listen(env.port, () => {
    console.log('');
    console.log('  ⚡ TryCatch GT — Estudio de Ingeniería de Software');
    console.log(`  🚀 Servidor activo en: http://localhost:${env.port}`);
    console.log(`  🌎 Entorno: ${env.nodeEnv}`);
    if (liveReload) console.log('  🔁 Live reload activo (el navegador se refresca solo)');
    console.log('');
  });
}

async function bootstrap(): Promise<void> {
  assertSecureSecrets();

  // Inicializa el ORM (conexión + migraciones) ANTES de escuchar. Si se escuchara
  // primero, una petición que llegue durante el arranque tocaría la BD y lanzaría
  // un error async no capturado (Express 4 no atrapa las promesas de los handlers)
  // que tumba el proceso ANTES de que terminen las migraciones: en producción eso
  // dejaba la app en bucle de reinicio con las tablas sin crear.
  try {
    await AppDataSource.initialize();
    console.log('  🗃️  TypeORM inicializado (migraciones al día)');
    try {
      await ensureAdminUser.execute();
    } catch (error) {
      console.warn('⚠️  No se pudo sembrar el admin inicial:', (error as Error).message);
    }
    // El scheduler solo arranca con la BD lista (necesita leer/escribir cadencias).
    startCadenceScheduler();
  } catch (error) {
    // La BD no respondió: se arranca igual en modo degradado para servir la landing
    // y que /api/health devuelva 503 (el healthcheck del contenedor lo detecta). Las
    // rutas que usan la BD responderán error; no se degrada a memoria.
    console.error('⚠️  No se pudo inicializar la base de datos (modo degradado):', (error as Error).message);
  }

  listen();
}

// Red de seguridad: un rechazo de promesa no gestionado (p. ej. un handler async
// que falla al tocar la BD) NO debe tumbar todo el servidor en producción. Se
// registra y el proceso sigue sirviendo el resto de peticiones.
process.on('unhandledRejection', (reason) => {
  console.error('⚠️  Rechazo de promesa no gestionado:', reason instanceof Error ? (reason.stack ?? reason.message) : reason);
});

void bootstrap();
