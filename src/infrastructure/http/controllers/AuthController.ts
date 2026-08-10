import crypto from 'node:crypto';
import { Request, Response } from 'express';
import { AuthenticateUserUseCase } from '../../../application/ports/input/AuthenticateUserUseCase.js';
import { UserRepository } from '../../../application/ports/output/UserRepository.js';
import { UserSessionRepository } from '../../../application/ports/output/UserSessionRepository.js';
import { PasswordHasher } from '../../../application/ports/output/PasswordHasher.js';
import { User } from '../../../domain/entities/User.js';
import { createMfaChallenge, verifyMfaChallenge, setSessionCookie, clearSessionCookie, parseCookies, verifySessionToken } from '../auth/session.js';
import { verifyMfaToken, normalizeBackupCode } from '../../security/MfaService.js';
import { TokenService } from '../../security/TokenService.js';
import { EmailService } from '../../email/EmailService.js';
import { env } from '../../../config/env.js';
import { validatePassword } from '../../security/passwordPolicy.js';
import { escapeHtml } from '../../security/escapeHtml.js';
import { AuthedRequest } from '../middleware/requireAuth.js';

function resultPage(message: string, ok: boolean): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Verificación de correo</title><style>body{font-family:system-ui,sans-serif;background:#0a0a0c;color:#e7e7ea;display:grid;place-items:center;min-height:100vh;margin:0}.card{max-width:420px;padding:32px;border-radius:16px;background:#15151a;border:1px solid #26262e;text-align:center}.i{font-size:40px}</style></head><body><div class="card"><div class="i">${ok ? '✅' : '⚠️'}</div><h1>${ok ? 'Correo verificado' : 'No se pudo verificar'}</h1><p>${message}</p></div></body></html>`;
}

// Bloqueo por intentos fallidos (complementa el rate-limit por IP).
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

function clientIp(req: Request): string | null {
  return req.ip || req.socket?.remoteAddress || null;
}

export class AuthController {
  constructor(
    private readonly authenticate: AuthenticateUserUseCase,
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly email: EmailService,
    private readonly sessions: UserSessionRepository,
  ) {}

  // Solicita el restablecimiento: envía un enlace si el correo existe. Responde
  // siempre igual para no revelar qué correos están registrados.
  public forgotPassword = async (req: Request, res: Response): Promise<void> => {
    const email = String(req.body?.email ?? '').trim();
    const generic = () => res.status(200).json({ success: true });
    if (!email) { generic(); return; }
    const user = await this.users.findByEmail(email);
    if (!user || user.id === undefined || !user.canLogin || !user.email) { generic(); return; }
    const token = await this.tokens.issue(user.id, 'password_reset', 60);
    const link = `${env.appUrl}/admin/reset-password?token=${token}`;
    await this.email.send({
      to: user.email,
      subject: 'Restablece tu contraseña — TryCatch GT',
      html: `<p>Hola ${escapeHtml(user.label)},</p><p>Recibimos una solicitud para restablecer tu contraseña:</p><p><a href="${escapeHtml(link)}">Restablecer contraseña</a></p><p>El enlace vence en 60 minutos. Si no lo pediste, ignora este correo.</p>`,
      text: `Restablece tu contraseña: ${link}`,
    });
    generic();
  };

  // Consume el token y fija la nueva contraseña, cortando las sesiones abiertas.
  public resetPassword = async (req: Request, res: Response): Promise<void> => {
    const { token, newPassword } = req.body ?? {};
    const pErr = validatePassword(String(newPassword ?? ''));
    if (pErr) { res.status(400).json({ success: false, error: pErr }); return; }
    const userId = await this.tokens.consume('password_reset', String(token ?? ''));
    if (!userId) {
      res.status(400).json({ success: false, error: 'El enlace es inválido o venció. Solicita uno nuevo.' });
      return;
    }
    await this.users.updatePassword(userId, await this.hasher.hash(String(newPassword)));
    await this.users.bumpSessionVersion(userId);
    res.status(200).json({ success: true });
  };

  // Verificación de correo desde el enlace del email (GET público). Devuelve HTML.
  public verifyEmail = async (req: Request, res: Response): Promise<void> => {
    const token = String(req.query.token ?? '');
    const userId = await this.tokens.consume('email_verify', token);
    if (!userId) {
      res.status(400).type('html').send(resultPage('El enlace es inválido o ya venció. Solicita uno nuevo desde el panel.', false));
      return;
    }
    await this.users.setEmailVerified(userId, new Date());
    res.status(200).type('html').send(resultPage('Tu correo quedó verificado. Ya puedes cerrar esta pestaña.', true));
  };

  // Abre una sesión por dispositivo: registra la sesión (sid) y emite la cookie.
  private async startSession(req: Request, res: Response, user: User): Promise<void> {
    const sid = crypto.randomBytes(24).toString('base64url');
    await this.sessions.create({
      userId: user.id!,
      sid,
      userAgent: (req.headers['user-agent'] ?? null) as string | null,
      ip: clientIp(req),
      expiresAt: new Date(Date.now() + env.session.maxAgeMs),
    });
    setSessionCookie(res, user.id!, user.sessionVersion, sid);
  }

  public login = async (req: Request, res: Response): Promise<void> => {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      res.status(400).json({ success: false, error: 'Usuario y contraseña son obligatorios.' });
      return;
    }

    const user = await this.authenticate.execute({ username, password });
    if (!user || user.id === undefined) {
      // Credencial inválida: si el usuario existe, cuenta el intento fallido (lockout).
      await this.registerFailure(String(username));
      res.status(401).json({ success: false, error: 'Credenciales inválidas.' });
      return;
    }

    // Credencial correcta: se valida el estado de la cuenta.
    if (!user.canLogin) {
      res.status(403).json({ success: false, error: 'Tu cuenta está deshabilitada. Contacta al administrador.' });
      return;
    }
    if (user.isLocked) {
      res.status(401).json({ success: false, error: 'Cuenta bloqueada temporalmente por intentos fallidos. Inténtalo más tarde.' });
      return;
    }

    // Si el usuario tiene 2FA, no abrimos sesión todavía: pedimos el código. NO
    // se limpian los fallos aquí: hacerlo con la contraseña correcta pero antes
    // de validar el segundo factor permitiría a quien ya tiene la contraseña
    // reiniciar el contador del lockout de MFA en cada intento (login → probar
    // códigos → login…) y nunca alcanzar el bloqueo. El contador solo se limpia
    // al completar el 2FA (recordLogin en mfaVerify).
    if (user.mfaEnabled) {
      res.status(200).json({ success: true, mfaRequired: true, challenge: createMfaChallenge(user.id) });
      return;
    }

    await this.users.recordLogin(user.id, clientIp(req));
    await this.startSession(req, res, user);
    res.status(200).json({ success: true, user: { username: user.username, role: user.role }, mustChangePassword: user.mustChangePassword });
  };

  // Incrementa el contador de intentos fallidos y bloquea al superar el máximo.
  private async registerFailure(username: string): Promise<void> {
    const u = await this.users.findByUsername(username);
    if (u) await this.registerUserFailure(u);
  }

  // Igual que registerFailure pero a partir del usuario ya resuelto (para el MFA,
  // donde el fallo no viene de un username sino del segundo factor). Comparte el
  // mismo contador/bloqueo que el login (M3).
  private async registerUserFailure(user: User): Promise<void> {
    if (user.id === undefined) return;
    const attempts = (user.failedLoginAttempts ?? 0) + 1;
    const lockedUntil = attempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null;
    await this.users.registerFailedLogin(user.id, attempts, lockedUntil);
  }

  public mfaVerify = async (req: Request, res: Response): Promise<void> => {
    const { challenge, code } = req.body ?? {};
    const session = verifyMfaChallenge(challenge);
    if (!session) {
      res.status(401).json({ success: false, error: 'El reto expiró. Inicia sesión de nuevo.' });
      return;
    }
    const user = await this.users.findById(session.uid);
    if (!user || !user.mfaEnabled || !user.mfaSecret || user.id === undefined) {
      res.status(400).json({ success: false, error: 'No se pudo verificar el 2FA.' });
      return;
    }
    if (!user.canLogin) {
      res.status(403).json({ success: false, error: 'Tu cuenta está deshabilitada. Contacta al administrador.' });
      return;
    }
    // El bloqueo por fallos aplica también al segundo factor (M3): así el TOTP de
    // 6 dígitos no queda expuesto a fuerza bruta desde múltiples IPs.
    if (user.isLocked) {
      res.status(401).json({ success: false, error: 'Cuenta bloqueada temporalmente por intentos fallidos. Inténtalo más tarde.' });
      return;
    }
    const input = String(code ?? '');
    // Acepta el código TOTP de la app o, en su defecto, un código de respaldo
    // de un solo uso (que se consume al usarlo).
    const okTotp = verifyMfaToken(input, user.mfaSecret);
    if (!okTotp && !(await this.consumeBackupCode(user, input))) {
      await this.registerUserFailure(user);
      res.status(401).json({ success: false, error: 'Código incorrecto.' });
      return;
    }
    await this.users.recordLogin(user.id, clientIp(req));
    await this.startSession(req, res, user);
    res.status(200).json({ success: true, user: { username: user.username, role: user.role }, mustChangePassword: user.mustChangePassword });
  };

  // Si el código coincide con un código de respaldo, lo elimina y devuelve true.
  private async consumeBackupCode(user: User, code: string): Promise<boolean> {
    const codes = user.mfaBackupCodes;
    if (!codes || !codes.length || user.id === undefined) return false;
    const candidate = normalizeBackupCode(code);
    if (!candidate) return false;
    for (const hash of codes) {
      if (await this.hasher.compare(candidate, hash)) {
        await this.users.setBackupCodes(user.id, codes.filter((h) => h !== hash));
        return true;
      }
    }
    return false;
  }

  public logout = async (req: Request, res: Response): Promise<void> => {
    const payload = verifySessionToken(parseCookies(req.headers.cookie)[env.session.cookieName]);
    if (payload?.sid) await this.sessions.revokeBySid(payload.sid);
    clearSessionCookie(res);
    res.status(200).json({ success: true });
  };

  public me = (req: AuthedRequest, res: Response): void => {
    // `role` solo alimenta el ocultamiento cosmético de la UI solo-admin; la
    // autorización real vive en el servidor (requireRole).
    res.status(200).json({ success: true, authenticated: true, userId: req.userId, role: req.authUser?.role, mustChangePassword: req.authUser?.mustChangePassword ?? false });
  };
}
