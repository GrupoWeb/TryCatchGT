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
import { ContactAdminController } from '../controllers/ContactAdminController.js';
import { TemplateAdminController } from '../controllers/TemplateAdminController.js';
import { CrmMailController } from '../controllers/CrmMailController.js';
import { HostingerMailWebhookController } from '../controllers/HostingerMailWebhookController.js';
import { CadenceAdminController } from '../controllers/CadenceAdminController.js';
import { ServiceAdminController } from '../controllers/ServiceAdminController.js';
import { PlanAdminController } from '../controllers/PlanAdminController.js';
import { SiteConfigController } from '../controllers/SiteConfigController.js';
import { AccountAdminController } from '../controllers/AccountAdminController.js';
import { OverviewController } from '../controllers/OverviewController.js';
import { CrmInboxController } from '../controllers/CrmInboxController.js';
import { AuditController } from '../controllers/AuditController.js';
import { AnalyticsController } from '../controllers/AnalyticsController.js';
import { LegalController } from '../controllers/LegalController.js';
import { createRequireAuth, AuthedRequest } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { createAuditLog } from '../middleware/auditLog.js';
import { createTrackVisit } from '../middleware/trackVisit.js';
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
import { ListContacts } from '../../../application/use-cases/ListContacts.js';
import { CreateContact } from '../../../application/use-cases/CreateContact.js';
import { UpdateContact } from '../../../application/use-cases/UpdateContact.js';
import { GetEmailTemplates } from '../../../application/use-cases/GetEmailTemplates.js';
import { SaveEmailTemplate } from '../../../application/use-cases/SaveEmailTemplate.js';
import { DeleteEmailTemplate } from '../../../application/use-cases/DeleteEmailTemplate.js';
import { SendContactEmail } from '../../../application/use-cases/SendContactEmail.js';
import { GetContactMessages } from '../../../application/use-cases/GetContactMessages.js';
import { ReceiveInboundEmail } from '../../../application/use-cases/ReceiveInboundEmail.js';
import { SaveCadence } from '../../../application/use-cases/SaveCadence.js';
import { GetCadences } from '../../../application/use-cases/GetCadences.js';
import { DeleteCadence } from '../../../application/use-cases/DeleteCadence.js';
import { EnrollContactInCadence } from '../../../application/use-cases/EnrollContactInCadence.js';
import { ProcessDueCadences } from '../../../application/use-cases/ProcessDueCadences.js';
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
import { TypeOrmContactRepository } from '../../database/typeorm/TypeOrmContactRepository.js';
import { TypeOrmEmailTemplateRepository } from '../../database/typeorm/TypeOrmEmailTemplateRepository.js';
import { TypeOrmCrmMessageRepository } from '../../database/typeorm/TypeOrmCrmMessageRepository.js';
import { TypeOrmCadenceRepository } from '../../database/typeorm/TypeOrmCadenceRepository.js';
import { TypeOrmCadenceRunRepository } from '../../database/typeorm/TypeOrmCadenceRunRepository.js';
import { TypeOrmBlogPostRepository } from '../../database/typeorm/TypeOrmBlogPostRepository.js';
import { TypeOrmUserRepository } from '../../database/typeorm/TypeOrmUserRepository.js';
import { TypeOrmSiteConfigRepository } from '../../database/typeorm/TypeOrmSiteConfigRepository.js';
import { TypeOrmAuditLogRepository } from '../../database/typeorm/TypeOrmAuditLogRepository.js';
import { TypeOrmUserTokenRepository } from '../../database/typeorm/TypeOrmUserTokenRepository.js';
import { TypeOrmUserSessionRepository } from '../../database/typeorm/TypeOrmUserSessionRepository.js';
import { TypeOrmMediaRepository } from '../../database/typeorm/TypeOrmMediaRepository.js';
import { TypeOrmPageViewRepository } from '../../database/typeorm/TypeOrmPageViewRepository.js';
import { BcryptPasswordHasher } from '../../security/BcryptPasswordHasher.js';
import { BlogHtmlSanitizer } from '../../security/BlogHtmlSanitizer.js';
import { TokenService } from '../../security/TokenService.js';
import { EmailService } from '../../email/EmailService.js';
import { HostingerAgenticMailClient } from '../../email/HostingerAgenticMailClient.js';

// ── Composición de dependencias (wiring hexagonal) ──────────────────────────
const serviceRepository = new TypeOrmServiceRepository();
const planRepository = new TypeOrmPlanRepository();
const projectRequestRepository = new TypeOrmProjectRequestRepository();
const contactRepository = new TypeOrmContactRepository();
const emailTemplateRepository = new TypeOrmEmailTemplateRepository();
const crmMessageRepository = new TypeOrmCrmMessageRepository();
const cadenceRepository = new TypeOrmCadenceRepository();
const cadenceRunRepository = new TypeOrmCadenceRunRepository();
const blogRepository = new TypeOrmBlogPostRepository();
const userRepository = new TypeOrmUserRepository();
const siteConfigRepository = new TypeOrmSiteConfigRepository();
const auditRepository = new TypeOrmAuditLogRepository();
const userTokenRepository = new TypeOrmUserTokenRepository();
const userSessionRepository = new TypeOrmUserSessionRepository();
const mediaRepository = new TypeOrmMediaRepository();
const pageViewRepository = new TypeOrmPageViewRepository();
const passwordHasher = new BcryptPasswordHasher();
const htmlSanitizer = new BlogHtmlSanitizer();
const tokenService = new TokenService(userTokenRepository);
const emailService = new EmailService(siteConfigRepository);
// Cliente del API de Agentic Mail para acusar recibo de los correos entrantes.
const inboundMailGateway = new HostingerAgenticMailClient(siteConfigRepository);

// Autenticación con validación de versión + sesión por dispositivo.
const requireAuth = createRequireAuth(userRepository, userSessionRepository);
// Autorización: competencia exclusiva del administrador (gestión de usuarios,
// configuración con secretos y bitácora). El editor conserva su trabajo legítimo.
const requireAdmin = requireRole('admin');
// Bitácora de accesos y acciones sensibles del admin.
const auditLog = createAuditLog(auditRepository);
// Protección anti-bots (Cloudflare Turnstile) para formularios; se configura en el panel.
const turnstileGuard = createTurnstileGuard(siteConfigRepository);
// Analítica first-party: registra las visitas a páginas públicas. Se monta a nivel de
// app en server.ts (no bajo /api), donde ve las navegaciones a las páginas del sitio.
export const trackVisit = createTrackVisit(pageViewRepository);

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
const contactAdminController = new ContactAdminController(
  contactRepository,
  new ListContacts(contactRepository),
  new CreateContact(contactRepository),
  new UpdateContact(contactRepository),
);
const templateAdminController = new TemplateAdminController(
  emailTemplateRepository,
  new GetEmailTemplates(emailTemplateRepository),
  new SaveEmailTemplate(emailTemplateRepository, htmlSanitizer),
  new DeleteEmailTemplate(emailTemplateRepository),
);
// Envío de correo a un contacto: lo comparten el panel (CrmMailController) y el
// scheduler de cadencias (ProcessDueCadences).
const sendContactEmail = new SendContactEmail(
  contactRepository,
  emailTemplateRepository,
  crmMessageRepository,
  emailService,
  htmlSanitizer,
);
const crmMailController = new CrmMailController(
  sendContactEmail,
  new GetContactMessages(crmMessageRepository),
);
const hostingerMailWebhookController = new HostingerMailWebhookController(
  // Con el repo de cadencias, una respuesta entrante corta el seguimiento activo.
  new ReceiveInboundEmail(contactRepository, crmMessageRepository, htmlSanitizer, cadenceRunRepository),
  siteConfigRepository,
  inboundMailGateway,
);

// Procesa las cadencias vencidas; se exporta para el scheduler de server.ts.
export const processDueCadences = new ProcessDueCadences(
  cadenceRunRepository,
  cadenceRepository,
  sendContactEmail,
);
const cadenceAdminController = new CadenceAdminController(
  cadenceRepository,
  cadenceRunRepository,
  new GetCadences(cadenceRepository),
  new SaveCadence(cadenceRepository),
  new DeleteCadence(cadenceRepository),
  new EnrollContactInCadence(contactRepository, cadenceRepository, cadenceRunRepository),
  processDueCadences,
);
const serviceAdminController = new ServiceAdminController(serviceRepository);
const planAdminController = new PlanAdminController(planRepository);
const accountAdminController = new AccountAdminController(userRepository, passwordHasher, tokenService, emailService, userSessionRepository);
const overviewController = new OverviewController(blogRepository, projectRequestRepository, crmMessageRepository);
const crmInboxController = new CrmInboxController(crmMessageRepository);
const auditController = new AuditController(auditRepository, userRepository);
const analyticsController = new AnalyticsController(pageViewRepository);
const legalController = new LegalController(siteConfigRepository, htmlSanitizer);

// Bootstrap del admin inicial: lo invoca el servidor al arrancar.
export const ensureAdminUser = new EnsureAdminUser(userRepository, passwordHasher, {
  user: env.admin.user,
  password: env.admin.password,
});

// ── SEO: acceso a datos del blog para meta server-side / sitemap ────────────
// Devuelve el artículo solo si está publicado (para no indexar borradores).
export async function seoGetPost(slug: string) {
  const post = await blogRepository.findBySlug(slug);
  return post && post.status === 'published' ? post : null;
}
export async function seoListPosts() {
  return blogRepository.findPublished();
}

// ── Rutas ───────────────────────────────────────────────────────────────────
export const apiRouter = Router();

// Emite el token CSRF en los GET; el SPA lo reenvía como header en las mutaciones.
apiRouter.use(issueCsrfToken);

// Exige token CSRF en toda petición mutante. La única excepción (documentada en
// createCsrfGuard) es el formulario público de cotización (POST /projects).
// El webhook de correo entrante se autentica con un secreto compartido, no con
// cookie de sesión, así que el double-submit CSRF no aplica (ni sería posible:
// Hostinger no puede leer/reenviar la cookie). Queda exento como /projects.
apiRouter.use(createCsrfGuard(['/projects', '/webhooks/hostinger-mail']));

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
apiRouter.get('/legal/:slug', legalController.getPublic);
apiRouter.get('/blog/:slug', blogController.detail);

// Webhook de correo entrante del CRM (Hostinger Agentic Mail). Público pero
// autenticado por secreto compartido; ver HostingerMailWebhookController.
apiRouter.post('/webhooks/hostinger-mail', hostingerMailWebhookController.receive);

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
apiRouter.get('/admin/inbox', requireAuth, requireAdmin, crmInboxController.list);
apiRouter.post('/admin/inbox/seen', requireAuth, requireAdmin, crmInboxController.markSeen);
apiRouter.get('/admin/audit', requireAuth, requireAdmin, auditController.list);
apiRouter.get('/admin/analytics', requireAuth, requireAdmin, analyticsController.summary);

// Páginas legales (Términos, Privacidad, Cookies) — edición solo admin.
apiRouter.get('/admin/legal', requireAuth, requireAdmin, legalController.getAllAdmin);
apiRouter.put('/admin/legal/:slug', requireAuth, requireAdmin, legalController.update);

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

// CRM · Clientes/prospectos
apiRouter.get('/admin/contacts', requireAuth, contactAdminController.list);
apiRouter.get('/admin/contacts/stats', requireAuth, contactAdminController.stats);
apiRouter.get('/admin/contacts/:id', requireAuth, contactAdminController.getById);
apiRouter.post('/admin/contacts', requireAuth, contactAdminController.create);
apiRouter.patch('/admin/contacts/:id/stage', requireAuth, contactAdminController.updateStage);
apiRouter.put('/admin/contacts/:id', requireAuth, contactAdminController.update);
// Correo del CRM: enviar a un contacto y ver su timeline de mensajes.
apiRouter.get('/admin/contacts/:id/messages', requireAuth, crmMailController.listMessages);
apiRouter.post('/admin/contacts/:id/email', requireAuth, formLimiter, crmMailController.sendEmail);

// CRM · Cadencias de seguimiento (inscripción/estado por contacto)
apiRouter.get('/admin/contacts/:id/cadences', requireAuth, cadenceAdminController.contactRuns);
apiRouter.post('/admin/contacts/:id/enroll', requireAuth, cadenceAdminController.enrollContact);

// CRM · Plantillas de correo
apiRouter.get('/admin/templates', requireAuth, templateAdminController.list);
apiRouter.get('/admin/templates/:id', requireAuth, templateAdminController.getById);
apiRouter.post('/admin/templates', requireAuth, templateAdminController.create);
apiRouter.put('/admin/templates/:id', requireAuth, templateAdminController.update);
apiRouter.delete('/admin/templates/:id', requireAuth, templateAdminController.remove);

// CRM · Cadencias (CRUD + disparo manual del procesamiento)
apiRouter.get('/admin/cadences', requireAuth, cadenceAdminController.list);
apiRouter.post('/admin/cadences/process', requireAuth, cadenceAdminController.process);
apiRouter.get('/admin/cadences/:id', requireAuth, cadenceAdminController.getById);
apiRouter.post('/admin/cadences', requireAuth, cadenceAdminController.create);
apiRouter.put('/admin/cadences/:id', requireAuth, cadenceAdminController.update);
apiRouter.delete('/admin/cadences/:id', requireAuth, cadenceAdminController.remove);

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
apiRouter.post('/admin/users/:id/reset-mfa', requireAuth, requireAdmin, accountAdminController.resetUserMfa);
