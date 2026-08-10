import { Router } from 'express';
import { env } from '../../../config/env.js';

// Controllers
import { ServiceController } from '../controllers/ServiceController.js';
import { PlanController } from '../controllers/PlanController.js';
import { ProjectRequestController } from '../controllers/ProjectRequestController.js';
import { BlogController } from '../controllers/BlogController.js';
import { AdminBlogController } from '../controllers/AdminBlogController.js';
import { AuthController } from '../controllers/AuthController.js';
import { LeadAdminController } from '../controllers/LeadAdminController.js';
import { ServiceAdminController } from '../controllers/ServiceAdminController.js';
import { PlanAdminController } from '../controllers/PlanAdminController.js';
import { SiteConfigController } from '../controllers/SiteConfigController.js';
import { AccountAdminController } from '../controllers/AccountAdminController.js';
import { OverviewController } from '../controllers/OverviewController.js';
import { AuditController } from '../controllers/AuditController.js';
import { createRequireAuth, AuthedRequest } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { createAuditLog } from '../middleware/auditLog.js';
import { createTurnstileGuard } from '../middleware/turnstile.js';
import { uploadImage, sniffImageMime } from '../upload.js';
import { authLimiter, formLimiter, uploadLimiter, healthLimiter } from '../rateLimit.js';
import { issueCsrfToken, createCsrfGuard } from '../csrf.js';
import { createHealthCheck } from '../health.js';
import { createMediaHandler } from '../media.js';
import { AppDataSource } from '../../database/typeorm/data-source.js';

// Use cases
import { GetServices } from '../../../application/use-cases/GetServices.js';
import { GetPlans } from '../../../application/use-cases/GetPlans.js';
import { CreateProjectRequest } from '../../../application/use-cases/CreateProjectRequest.js';
import { GetBlogPosts } from '../../../application/use-cases/GetBlogPosts.js';
import { GetBlogPostBySlug } from '../../../application/use-cases/GetBlogPostBySlug.js';
import { SaveBlogPost } from '../../../application/use-cases/SaveBlogPost.js';
import { DeleteBlogPost } from '../../../application/use-cases/DeleteBlogPost.js';
import { AuthenticateUser } from '../../../application/use-cases/AuthenticateUser.js';
import { EnsureAdminUser } from '../../../application/use-cases/EnsureAdminUser.js';

// Adapters (output) — persistencia con TypeORM
import { TypeOrmServiceRepository } from '../../database/typeorm/TypeOrmServiceRepository.js';
import { TypeOrmPlanRepository } from '../../database/typeorm/TypeOrmPlanRepository.js';
import { TypeOrmProjectRequestRepository } from '../../database/typeorm/TypeOrmProjectRequestRepository.js';
import { TypeOrmBlogPostRepository } from '../../database/typeorm/TypeOrmBlogPostRepository.js';
import { TypeOrmUserRepository } from '../../database/typeorm/TypeOrmUserRepository.js';
import { TypeOrmSiteConfigRepository } from '../../database/typeorm/TypeOrmSiteConfigRepository.js';
import { TypeOrmAuditLogRepository } from '../../database/typeorm/TypeOrmAuditLogRepository.js';
import { TypeOrmUserTokenRepository } from '../../database/typeorm/TypeOrmUserTokenRepository.js';
import { TypeOrmUserSessionRepository } from '../../database/typeorm/TypeOrmUserSessionRepository.js';
import { TypeOrmMediaRepository } from '../../database/typeorm/TypeOrmMediaRepository.js';
import { BcryptPasswordHasher } from '../../security/BcryptPasswordHasher.js';
import { BlogHtmlSanitizer } from '../../security/BlogHtmlSanitizer.js';
import { TokenService } from '../../security/TokenService.js';
import { EmailService } from '../../email/EmailService.js';

// ── Composición de dependencias (wiring hexagonal) ──────────────────────────
const serviceRepository = new TypeOrmServiceRepository();
const planRepository = new TypeOrmPlanRepository();
const projectRequestRepository = new TypeOrmProjectRequestRepository();
const blogRepository = new TypeOrmBlogPostRepository();
const userRepository = new TypeOrmUserRepository();
const siteConfigRepository = new TypeOrmSiteConfigRepository();
const auditRepository = new TypeOrmAuditLogRepository();
const userTokenRepository = new TypeOrmUserTokenRepository();
const userSessionRepository = new TypeOrmUserSessionRepository();
const mediaRepository = new TypeOrmMediaRepository();
const passwordHasher = new BcryptPasswordHasher();
const htmlSanitizer = new BlogHtmlSanitizer();
const tokenService = new TokenService(userTokenRepository);
const emailService = new EmailService(siteConfigRepository);

// Autenticación con validación de versión + sesión por dispositivo.
const requireAuth = createRequireAuth(userRepository, userSessionRepository);
// Autorización: competencia exclusiva del administrador (gestión de usuarios,
// configuración con secretos y bitácora). El editor conserva su trabajo legítimo.
const requireAdmin = requireRole('admin');
// Bitácora de accesos y acciones sensibles del admin.
const auditLog = createAuditLog(auditRepository);
// Protección anti-bots (Cloudflare Turnstile) para formularios; se configura en el panel.
const turnstileGuard = createTurnstileGuard(siteConfigRepository);

// Público
const serviceController = new ServiceController(new GetServices(serviceRepository));
const planController = new PlanController(new GetPlans(planRepository));
const projectRequestController = new ProjectRequestController(
  new CreateProjectRequest(projectRequestRepository),
);
const getBlogPosts = new GetBlogPosts(blogRepository);
const blogController = new BlogController(getBlogPosts, new GetBlogPostBySlug(blogRepository));
const siteConfigController = new SiteConfigController(siteConfigRepository);
const authController = new AuthController(new AuthenticateUser(userRepository, passwordHasher), userRepository, passwordHasher, tokenService, emailService, userSessionRepository);

// Admin
const adminBlogController = new AdminBlogController(
  getBlogPosts,
  new SaveBlogPost(blogRepository, htmlSanitizer),
  new DeleteBlogPost(blogRepository),
  blogRepository,
);
const leadAdminController = new LeadAdminController(projectRequestRepository);
const serviceAdminController = new ServiceAdminController(serviceRepository);
const planAdminController = new PlanAdminController(planRepository);
const accountAdminController = new AccountAdminController(userRepository, passwordHasher, tokenService, emailService, userSessionRepository);
const overviewController = new OverviewController(blogRepository, projectRequestRepository);
const auditController = new AuditController(auditRepository, userRepository);

// Bootstrap del admin inicial: lo invoca el servidor al arrancar.
export const ensureAdminUser = new EnsureAdminUser(userRepository, passwordHasher, {
  user: env.admin.user,
  password: env.admin.password,
});

// ── Rutas ───────────────────────────────────────────────────────────────────
export const apiRouter = Router();

// Emite el token CSRF en los GET; el SPA lo reenvía como header en las mutaciones.
apiRouter.use(issueCsrfToken);

// Exige token CSRF en toda petición mutante. La única excepción (documentada en
// createCsrfGuard) es el formulario público de cotización (POST /projects).
apiRouter.use(createCsrfGuard(['/projects']));

// Registra en la bitácora las mutaciones de autenticación y del panel admin.
apiRouter.use(auditLog);

// Refleja el estado real de la BD (503 si no responde) para que el HEALTHCHECK
// del contenedor detecte una BD caída en vez de dar por sano al server. El
// sondeo va cacheado y con rate limit para no amplificar carga contra la BD.
apiRouter.get('/health', healthLimiter, createHealthCheck(AppDataSource));

// Público
apiRouter.get('/config', siteConfigController.publicConfig);
apiRouter.get('/services', serviceController.list);
apiRouter.get('/plans', planController.list);
apiRouter.post('/projects', formLimiter, turnstileGuard, projectRequestController.create);
apiRouter.get('/blog', blogController.list);
apiRouter.get('/blog/:slug', blogController.detail);

// Autenticación
apiRouter.post('/auth/login', authLimiter, turnstileGuard, authController.login);
apiRouter.post('/auth/mfa', authLimiter, authController.mfaVerify);
apiRouter.post('/auth/logout', authController.logout);
apiRouter.get('/auth/me', requireAuth, authController.me);
apiRouter.get('/auth/verify-email', authController.verifyEmail);
apiRouter.post('/auth/forgot-password', authLimiter, authController.forgotPassword);
apiRouter.post('/auth/reset-password', authLimiter, authController.resetPassword);

// ── Admin (protegido) ───────────────────────────────────────────────────────
apiRouter.get('/admin/overview', requireAuth, overviewController.stats);
apiRouter.get('/admin/audit', requireAuth, requireAdmin, auditController.list);

// Subida de imágenes (portadas del blog, avatar). Se validan por magic bytes y se
// guardan en la BD (no en disco): en hostings con deploy inmutable + CDN los
// archivos escritos en runtime no se sirven ni sobreviven al redeploy.
apiRouter.post('/admin/uploads', requireAuth, uploadLimiter, (req: AuthedRequest, res) => {
  uploadImage.single('image')(req, res, async (err) => {
    if (err) { res.status(400).json({ success: false, error: (err as Error).message || 'Error al subir.' }); return; }
    if (!req.file) { res.status(400).json({ success: false, error: 'No se recibió ninguna imagen.' }); return; }
    const mime = sniffImageMime(req.file.buffer);
    if (!mime) { res.status(400).json({ success: false, error: 'El archivo no es una imagen válida. Usa JPG, PNG, WEBP, GIF o AVIF.' }); return; }
    try {
      const id = await mediaRepository.save({ mime, data: req.file.buffer, size: req.file.size, createdBy: req.userId ?? null });
      res.status(201).json({ success: true, data: { url: `/api/media/${id}` } });
    } catch (e) {
      res.status(400).json({ success: false, error: (e as Error).message });
    }
  });
});

// Servido público de las imágenes guardadas en la BD (portadas del blog, avatar).
apiRouter.get('/media/:id', createMediaHandler(mediaRepository));

// Blog
apiRouter.get('/admin/posts', requireAuth, adminBlogController.list);
apiRouter.get('/admin/posts/:id', requireAuth, adminBlogController.getById);
apiRouter.post('/admin/posts', requireAuth, adminBlogController.create);
apiRouter.put('/admin/posts/:id', requireAuth, adminBlogController.update);
apiRouter.delete('/admin/posts/:id', requireAuth, adminBlogController.remove);

// Cotizaciones / Leads
apiRouter.get('/admin/leads', requireAuth, leadAdminController.list);
apiRouter.patch('/admin/leads/:id/status', requireAuth, leadAdminController.updateStatus);

// Servicios
apiRouter.get('/admin/services', requireAuth, serviceAdminController.list);
apiRouter.get('/admin/services/:id', requireAuth, serviceAdminController.getById);
apiRouter.post('/admin/services', requireAuth, serviceAdminController.create);
apiRouter.put('/admin/services/:id', requireAuth, serviceAdminController.update);
apiRouter.delete('/admin/services/:id', requireAuth, serviceAdminController.remove);

// Planes
apiRouter.get('/admin/plans', requireAuth, planAdminController.list);
apiRouter.get('/admin/plans/:id', requireAuth, planAdminController.getById);
apiRouter.post('/admin/plans', requireAuth, planAdminController.create);
apiRouter.put('/admin/plans/:id', requireAuth, planAdminController.update);
apiRouter.delete('/admin/plans/:id', requireAuth, planAdminController.remove);

// Configuración del sitio (incluye credenciales SMTP/Turnstile → solo admin)
apiRouter.get('/admin/config', requireAuth, requireAdmin, siteConfigController.adminGet);
apiRouter.put('/admin/config', requireAuth, requireAdmin, siteConfigController.adminUpdate);

// Perfil, cuenta y usuarios
apiRouter.get('/admin/account', requireAuth, accountAdminController.me);
apiRouter.put('/admin/account', requireAuth, accountAdminController.updateProfile);
apiRouter.post('/admin/account/password', requireAuth, accountAdminController.changePassword);
apiRouter.post('/admin/account/email/verify/send', requireAuth, accountAdminController.sendEmailVerification);
apiRouter.post('/admin/account/sessions/revoke-all', requireAuth, accountAdminController.revokeOtherSessions);
apiRouter.get('/admin/account/sessions', requireAuth, accountAdminController.listSessions);
apiRouter.delete('/admin/account/sessions/:id', requireAuth, accountAdminController.revokeSession);
apiRouter.post('/admin/account/mfa/setup', requireAuth, accountAdminController.mfaSetup);
apiRouter.post('/admin/account/mfa/enable', requireAuth, accountAdminController.mfaEnable);
apiRouter.post('/admin/account/mfa/disable', requireAuth, accountAdminController.mfaDisable);
apiRouter.post('/admin/account/mfa/backup-codes', requireAuth, accountAdminController.regenerateBackupCodes);
// Gestión de usuarios: exclusiva de admin (todas las verbos, incluidos los GET).
apiRouter.get('/admin/users', requireAuth, requireAdmin, accountAdminController.listUsers);
apiRouter.post('/admin/users', requireAuth, requireAdmin, accountAdminController.createUser);
apiRouter.get('/admin/users/:id', requireAuth, requireAdmin, accountAdminController.getUser);
apiRouter.put('/admin/users/:id', requireAuth, requireAdmin, accountAdminController.updateUser);
apiRouter.delete('/admin/users/:id', requireAuth, requireAdmin, accountAdminController.deleteUser);
apiRouter.post('/admin/users/:id/restore', requireAuth, requireAdmin, accountAdminController.restoreUser);
apiRouter.post('/admin/users/:id/reset-password', requireAuth, requireAdmin, accountAdminController.resetUserPassword);
