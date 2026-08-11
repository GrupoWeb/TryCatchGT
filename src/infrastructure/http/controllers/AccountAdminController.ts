import { Response } from 'express';
import { UserRepository } from '../../../application/ports/output/UserRepository.js';
import { PasswordHasher } from '../../../application/ports/output/PasswordHasher.js';
import { User } from '../../../domain/entities/User.js';
import { AuthedRequest } from '../middleware/requireAuth.js';
import { setSessionCookie } from '../auth/session.js';
import { generateMfaSecret, mfaKeyUri, mfaQrDataUrl, verifyMfaToken, generateBackupCodes, normalizeBackupCode } from '../../security/MfaService.js';
import { TokenService } from '../../security/TokenService.js';
import { EmailService } from '../../email/EmailService.js';
import { UserSessionRepository } from '../../../application/ports/output/UserSessionRepository.js';
import { env } from '../../../config/env.js';
import { validatePassword } from '../../security/passwordPolicy.js';
import { renderEmail } from '../../email/emailTemplate.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// "x% y%" con enteros 0–100, para el punto de enfoque del avatar (background-position).
const POSITION_RE = /^(100|[0-9]{1,2})% (100|[0-9]{1,2})%$/;

function profileView(u: User) {
  return {
    id: u.id, username: u.username, email: u.email, avatar: u.avatar, avatarPosition: u.avatarPosition, role: u.role,
    mfaEnabled: u.mfaEnabled, backupCodesRemaining: u.mfaBackupCodes?.length ?? 0,
    fullName: u.fullName, lastName: u.lastName, displayName: u.displayName,
    status: u.status, isActive: u.isActive, mustChangePassword: u.mustChangePassword,
    emailVerified: u.emailVerifiedAt !== null,
    lastLoginAt: u.lastLoginAt, lastLoginIp: u.lastLoginIp,
  };
}

// Vista de un usuario para la gestión de terceros (más completa que profileView).
function userView(u: User) {
  return {
    id: u.id, username: u.username, email: u.email, role: u.role, mfaEnabled: u.mfaEnabled,
    fullName: u.fullName, lastName: u.lastName, displayName: u.displayName,
    status: u.status, isActive: u.isActive, deleted: u.deletedAt !== null,
    lastLoginAt: u.lastLoginAt, createdBy: u.createdBy, createdAt: u.createdAt,
  };
}

export class AccountAdminController {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly email: EmailService,
    private readonly sessions: UserSessionRepository,
  ) {}

  // Lista las sesiones activas del usuario, marcando la actual.
  public listSessions = async (req: AuthedRequest, res: Response): Promise<void> => {
    if (!req.userId) { res.status(404).json({ success: false, error: 'Usuario no encontrado.' }); return; }
    const rows = await this.sessions.listActiveByUser(req.userId);
    res.status(200).json({
      success: true,
      data: rows.map((s) => ({
        id: s.id, userAgent: s.userAgent, ip: s.ip, lastSeenAt: s.lastSeenAt, createdAt: s.createdAt,
        current: !!req.sessionSid && s.sid === req.sessionSid,
      })),
    });
  };

  // Revoca una sesión concreta del usuario (cierra ese dispositivo).
  public revokeSession = async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!id || !req.userId) { res.status(400).json({ success: false, error: 'Id inválido.' }); return; }
    const ok = await this.sessions.revokeById(id, req.userId);
    res.status(ok ? 200 : 404).json({ success: ok, ...(ok ? {} : { error: 'Sesión no encontrada.' }) });
  };

  // Envía al correo del usuario actual un enlace de verificación (token 60 min).
  public sendEmailVerification = async (req: AuthedRequest, res: Response): Promise<void> => {
    const user = await this.currentUser(req);
    if (!user || user.id === undefined) { res.status(404).json({ success: false, error: 'Usuario no encontrado.' }); return; }
    if (!user.email) { res.status(400).json({ success: false, error: 'Agrega un correo a tu perfil primero.' }); return; }
    if (user.emailVerifiedAt) { res.status(400).json({ success: false, error: 'Tu correo ya está verificado.' }); return; }
    const token = await this.tokens.issue(user.id, 'email_verify', 60);
    const link = `${env.appUrl}/api/auth/verify-email?token=${token}`;
    const { sent } = await this.email.send({
      to: user.email,
      subject: 'Verifica tu correo — TryCatch GT',
      html: renderEmail({
        title: 'Verifica tu correo',
        greeting: `Hola ${user.label},`,
        intro: 'Confirma tu dirección de correo para activar las notificaciones de tu cuenta.',
        ctaLabel: 'Verificar correo',
        ctaUrl: link,
        note: 'El enlace vence en 60 minutos. Si no solicitaste esto, puedes ignorar este mensaje.',
      }),
      text: `Verifica tu correo: ${link}`,
    });
    res.status(200).json({ success: true, sent });
  };

  private async currentUser(req: AuthedRequest): Promise<User | null> {
    return req.userId ? this.users.findById(req.userId) : null;
  }

  // ── Perfil ────────────────────────────────────────────────
  public me = async (req: AuthedRequest, res: Response): Promise<void> => {
    const user = await this.currentUser(req);
    if (!user) { res.status(404).json({ success: false, error: 'Usuario no encontrado.' }); return; }
    res.status(200).json({ success: true, data: profileView(user) });
  };

  public updateProfile = async (req: AuthedRequest, res: Response): Promise<void> => {
    const user = await this.currentUser(req);
    if (!user || user.id === undefined) { res.status(404).json({ success: false, error: 'Usuario no encontrado.' }); return; }

    const b = req.body ?? {};
    // El rol NO se edita desde el propio perfil (evita auto-escalada editor→admin).
    // Se cambia solo desde la gestión de usuarios, que exige rol admin (ver updateUser).
    const fields: { email?: string | null; avatar?: string | null; avatarPosition?: string | null; fullName?: string | null; lastName?: string | null; displayName?: string | null } = {};

    if (b.email !== undefined) {
      const email = String(b.email).trim();
      if (email && !EMAIL_RE.test(email)) { res.status(400).json({ success: false, error: 'Correo inválido.' }); return; }
      fields.email = email || null;
    }
    if (b.avatar !== undefined) fields.avatar = String(b.avatar).trim() || null;
    if (b.avatarPosition !== undefined) {
      const pos = String(b.avatarPosition).trim();
      // Formato "x% y%" con enteros 0–100 (background-position); si no, se ignora.
      if (pos && !POSITION_RE.test(pos)) { res.status(400).json({ success: false, error: 'Posición de imagen inválida.' }); return; }
      fields.avatarPosition = pos || null;
    }
    if (b.fullName !== undefined) fields.fullName = String(b.fullName).trim() || null;
    if (b.lastName !== undefined) fields.lastName = String(b.lastName).trim() || null;
    if (b.displayName !== undefined) fields.displayName = String(b.displayName).trim() || null;

    await this.users.updateProfile(user.id, fields);
    const updated = await this.users.findById(user.id);
    res.status(200).json({ success: true, data: updated ? profileView(updated) : profileView(user) });
  };

  public changePassword = async (req: AuthedRequest, res: Response): Promise<void> => {
    const { currentPassword, newPassword } = req.body ?? {};
    const user = await this.currentUser(req);
    if (!user || user.id === undefined) { res.status(404).json({ success: false, error: 'Usuario no encontrado.' }); return; }
    const pErr = validatePassword(String(newPassword ?? ''), user.username);
    if (pErr) { res.status(400).json({ success: false, error: pErr }); return; }
    if (!(await this.hasher.compare(String(currentPassword ?? ''), user.passwordHash))) {
      res.status(400).json({ success: false, error: 'La contraseña actual es incorrecta.' });
      return;
    }
    await this.users.updatePassword(user.id, await this.hasher.hash(String(newPassword)));
    // Al cambiar la contraseña, invalida cualquier otra sesión abierta y renueva
    // la cookie de la sesión actual (misma sesión de dispositivo) con la versión nueva.
    const version = await this.users.bumpSessionVersion(user.id);
    if (req.sessionSid) await this.sessions.revokeAllExcept(user.id, req.sessionSid);
    setSessionCookie(res, user.id, version ?? undefined, req.sessionSid);
    res.status(200).json({ success: true });
  };

  // "Cerrar todas las demás sesiones": invalida las existentes (versión + registros)
  // y renueva la cookie de la sesión actual para no autoexpulsarse.
  public revokeOtherSessions = async (req: AuthedRequest, res: Response): Promise<void> => {
    const user = await this.currentUser(req);
    if (!user || user.id === undefined) { res.status(404).json({ success: false, error: 'Usuario no encontrado.' }); return; }
    const version = await this.users.bumpSessionVersion(user.id);
    if (req.sessionSid) await this.sessions.revokeAllExcept(user.id, req.sessionSid);
    setSessionCookie(res, user.id, version ?? undefined, req.sessionSid);
    res.status(200).json({ success: true });
  };

  // ── 2FA / MFA ─────────────────────────────────────────────
  public mfaSetup = async (req: AuthedRequest, res: Response): Promise<void> => {
    const user = await this.currentUser(req);
    if (!user) { res.status(404).json({ success: false, error: 'Usuario no encontrado.' }); return; }
    const secret = generateMfaSecret();
    res.status(200).json({
      success: true,
      data: { secret, otpauthUri: mfaKeyUri(user.username, secret), qr: await mfaQrDataUrl(user.username, secret) },
    });
  };

  public mfaEnable = async (req: AuthedRequest, res: Response): Promise<void> => {
    const { secret, code } = req.body ?? {};
    const user = await this.currentUser(req);
    if (!user || user.id === undefined) { res.status(404).json({ success: false, error: 'Usuario no encontrado.' }); return; }
    if (!secret || !verifyMfaToken(String(code ?? ''), String(secret))) {
      res.status(400).json({ success: false, error: 'Código incorrecto. Revisa tu app de autenticación.' });
      return;
    }
    await this.users.setMfa(user.id, String(secret), true);
    const backupCodes = await this.replaceBackupCodes(user.id);
    res.status(200).json({ success: true, data: { backupCodes } });
  };

  // Regenera los códigos de respaldo. Exige un código TOTP válido para evitar que
  // una sesión secuestrada obtenga códigos nuevos sin el segundo factor.
  public regenerateBackupCodes = async (req: AuthedRequest, res: Response): Promise<void> => {
    const { code } = req.body ?? {};
    const user = await this.currentUser(req);
    if (!user || user.id === undefined) { res.status(404).json({ success: false, error: 'Usuario no encontrado.' }); return; }
    if (!user.mfaEnabled || !user.mfaSecret) { res.status(400).json({ success: false, error: 'El 2FA no está activo.' }); return; }
    if (!verifyMfaToken(String(code ?? ''), user.mfaSecret)) {
      res.status(400).json({ success: false, error: 'Código incorrecto.' });
      return;
    }
    const backupCodes = await this.replaceBackupCodes(user.id);
    res.status(200).json({ success: true, data: { backupCodes } });
  };

  // Genera un juego nuevo de códigos, guarda solo sus hashes y devuelve el texto
  // plano (única vez que el usuario podrá verlos).
  private async replaceBackupCodes(userId: number): Promise<string[]> {
    const codes = generateBackupCodes();
    const hashes = await Promise.all(codes.map((c) => this.hasher.hash(normalizeBackupCode(c))));
    await this.users.setBackupCodes(userId, hashes);
    return codes;
  }

  public mfaDisable = async (req: AuthedRequest, res: Response): Promise<void> => {
    const { code } = req.body ?? {};
    const user = await this.currentUser(req);
    if (!user || user.id === undefined) { res.status(404).json({ success: false, error: 'Usuario no encontrado.' }); return; }
    if (!user.mfaEnabled || !user.mfaSecret) { res.status(400).json({ success: false, error: 'El 2FA no está activo.' }); return; }
    if (!verifyMfaToken(String(code ?? ''), user.mfaSecret)) {
      res.status(400).json({ success: false, error: 'Código incorrecto.' });
      return;
    }
    await this.users.setMfa(user.id, null, false);
    await this.users.setBackupCodes(user.id, null);
    res.status(200).json({ success: true });
  };

  // ── Usuarios ──────────────────────────────────────────────
  public listUsers = async (_req: AuthedRequest, res: Response): Promise<void> => {
    const users = await this.users.findAll();
    res.status(200).json({
      success: true,
      data: users.map((u) => ({
        id: u.id, username: u.username, email: u.email, role: u.role, mfaEnabled: u.mfaEnabled,
        displayName: u.displayName, status: u.status, isActive: u.isActive, lastLoginAt: u.lastLoginAt,
        deleted: u.deletedAt !== null,
      })),
    });
  };

  public createUser = async (req: AuthedRequest, res: Response): Promise<void> => {
    const { username, password, role, fullName, lastName, displayName, mustChangePassword } = req.body ?? {};
    const uname = String(username ?? '').trim().toLowerCase();
    if (uname.length < 3) { res.status(400).json({ success: false, error: 'El usuario debe tener al menos 3 caracteres.' }); return; }
    const pErr = validatePassword(String(password ?? ''), uname);
    if (pErr) { res.status(400).json({ success: false, error: pErr }); return; }
    if (await this.users.findByUsername(uname)) { res.status(409).json({ success: false, error: 'Ese usuario ya existe.' }); return; }
    const created = await this.users.create(
      new User({
        username: uname,
        passwordHash: await this.hasher.hash(String(password)),
        role: role === 'admin' ? 'admin' : 'editor',
        fullName: fullName ? String(fullName).trim() : null,
        lastName: lastName ? String(lastName).trim() : null,
        displayName: displayName ? String(displayName).trim() : null,
        mustChangePassword: !!mustChangePassword,
        createdBy: req.userId ?? null,
      }),
    );
    res.status(201).json({ success: true, data: { id: created.id, username: created.username, role: created.role } });
  };

  // Admin: fija una contraseña temporal a otro usuario y le obliga a cambiarla,
  // cortando sus sesiones para forzar el reingreso.
  public resetUserPassword = async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ success: false, error: 'Id inválido.' }); return; }
    if (id === req.userId) { res.status(400).json({ success: false, error: 'Cambia tu propia contraseña desde tu perfil.' }); return; }
    const target = await this.users.findById(id);
    if (!target || target.id === undefined) { res.status(404).json({ success: false, error: 'Usuario no encontrado.' }); return; }
    const { newPassword } = req.body ?? {};
    const pErr = validatePassword(String(newPassword ?? ''), target.username);
    if (pErr) { res.status(400).json({ success: false, error: pErr }); return; }
    await this.users.updatePassword(id, await this.hasher.hash(String(newPassword)));
    await this.users.setMustChangePassword(id, true);
    await this.users.bumpSessionVersion(id);
    res.status(200).json({ success: true });
  };

  public getUser = async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const u = id ? await this.users.findById(id) : null;
    if (!u) { res.status(404).json({ success: false, error: 'Usuario no encontrado.' }); return; }
    res.status(200).json({ success: true, data: userView(u) });
  };

  public updateUser = async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ success: false, error: 'Id inválido.' }); return; }
    if (id === req.userId) { res.status(400).json({ success: false, error: 'Edita tu propia cuenta desde tu perfil.' }); return; }
    const target = await this.users.findById(id);
    if (!target || target.id === undefined) { res.status(404).json({ success: false, error: 'Usuario no encontrado.' }); return; }

    const b = req.body ?? {};
    const profile: { email?: string | null; role?: 'admin' | 'editor'; fullName?: string | null; lastName?: string | null; displayName?: string | null } = {};
    if (b.email !== undefined) {
      const email = String(b.email).trim();
      if (email && !EMAIL_RE.test(email)) { res.status(400).json({ success: false, error: 'Correo inválido.' }); return; }
      profile.email = email || null;
    }
    if (b.fullName !== undefined) profile.fullName = String(b.fullName).trim() || null;
    if (b.lastName !== undefined) profile.lastName = String(b.lastName).trim() || null;
    if (b.displayName !== undefined) profile.displayName = String(b.displayName).trim() || null;

    const state: { status?: 'active' | 'disabled' | 'invited'; isActive?: boolean } = {};
    let disabling = false;
    if (b.isActive !== undefined) { state.isActive = !!b.isActive; if (!state.isActive) disabling = true; }
    if (b.status !== undefined) {
      const s = b.status === 'disabled' || b.status === 'invited' ? b.status : 'active';
      state.status = s;
      if (s !== 'active') disabling = true;
    }
    const demoting = b.role !== undefined && b.role !== 'admin' && target.role === 'admin';
    if (b.role !== undefined) profile.role = b.role === 'admin' ? 'admin' : 'editor';

    // No dejar el sistema sin administradores activos.
    if ((disabling || demoting) && target.role === 'admin' && (await this.users.countActiveAdmins()) <= 1) {
      res.status(400).json({ success: false, error: 'No puedes desactivar/degradar al último administrador activo.' });
      return;
    }

    if (Object.keys(profile).length) await this.users.updateProfile(id, profile);
    if (Object.keys(state).length) await this.users.updateAccountState(id, state);
    if (disabling) await this.users.bumpSessionVersion(id); // corta sus sesiones abiertas

    const updated = await this.users.findById(id);
    res.status(200).json({ success: true, data: updated ? userView(updated) : userView(target) });
  };

  public deleteUser = async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ success: false, error: 'Id inválido.' }); return; }
    if (id === req.userId) { res.status(400).json({ success: false, error: 'No puedes eliminar tu propia cuenta.' }); return; }
    const target = await this.users.findById(id);
    if (!target || target.id === undefined || target.deletedAt) { res.status(404).json({ success: false, error: 'Usuario no encontrado.' }); return; }
    if (target.role === 'admin' && (await this.users.countActiveAdmins()) <= 1) {
      res.status(400).json({ success: false, error: 'No puedes eliminar al último administrador activo.' });
      return;
    }
    await this.users.updateAccountState(id, { deletedAt: new Date(), isActive: false, status: 'disabled' });
    await this.users.bumpSessionVersion(id);
    res.status(200).json({ success: true });
  };

  public restoreUser = async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const target = id ? await this.users.findById(id) : null;
    if (!target || target.id === undefined) { res.status(404).json({ success: false, error: 'Usuario no encontrado.' }); return; }
    await this.users.updateAccountState(id, { deletedAt: null, isActive: true, status: 'active' });
    const updated = await this.users.findById(id);
    res.status(200).json({ success: true, data: updated ? userView(updated) : userView(target) });
  };

  // Admin: reinicia el 2FA de otro usuario (p. ej. si perdió su dispositivo).
  // Borra el secreto y lo deja desactivado; el usuario podrá volver a activarlo.
  public resetUserMfa = async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ success: false, error: 'Id inválido.' }); return; }
    if (id === req.userId) { res.status(400).json({ success: false, error: 'Gestiona tu propio 2FA desde tu perfil.' }); return; }
    const target = await this.users.findById(id);
    if (!target || target.id === undefined) { res.status(404).json({ success: false, error: 'Usuario no encontrado.' }); return; }
    if (!target.mfaEnabled) { res.status(400).json({ success: false, error: 'El usuario no tiene 2FA activo.' }); return; }
    await this.users.setMfa(id, null, false);
    await this.users.bumpSessionVersion(id); // corta sesiones para forzar el reingreso
    res.status(200).json({ success: true });
  };
}
