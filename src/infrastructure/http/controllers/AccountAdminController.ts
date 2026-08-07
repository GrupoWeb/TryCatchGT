import { Response } from 'express';
import { UserRepository } from '../../../application/ports/output/UserRepository.js';
import { PasswordHasher } from '../../../application/ports/output/PasswordHasher.js';
import { User } from '../../../domain/entities/User.js';
import { AuthedRequest } from '../middleware/requireAuth.js';
import { setSessionCookie } from '../auth/session.js';
import { generateMfaSecret, mfaKeyUri, mfaQrDataUrl, verifyMfaToken, generateBackupCodes, normalizeBackupCode } from '../../security/MfaService.js';
import { TokenService } from '../../security/TokenService.js';
import { EmailService } from '../../email/EmailService.js';
import { env } from '../../../config/env.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function profileView(u: User) {
  return {
    id: u.id, username: u.username, email: u.email, avatar: u.avatar, role: u.role,
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
  ) {}

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
      html: `<p>Hola ${user.label},</p><p>Confirma tu correo:</p><p><a href="${link}">Verificar correo</a></p><p>El enlace vence en 60 minutos.</p>`,
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
    const fields: { email?: string | null; avatar?: string | null; role?: 'admin' | 'editor'; fullName?: string | null; lastName?: string | null; displayName?: string | null } = {};

    if (b.email !== undefined) {
      const email = String(b.email).trim();
      if (email && !EMAIL_RE.test(email)) { res.status(400).json({ success: false, error: 'Correo inválido.' }); return; }
      fields.email = email || null;
    }
    if (b.avatar !== undefined) fields.avatar = String(b.avatar).trim() || null;
    if (b.fullName !== undefined) fields.fullName = String(b.fullName).trim() || null;
    if (b.lastName !== undefined) fields.lastName = String(b.lastName).trim() || null;
    if (b.displayName !== undefined) fields.displayName = String(b.displayName).trim() || null;
    if (b.role !== undefined) {
      const role = b.role === 'admin' ? 'admin' : 'editor';
      // Evita que el único admin se quite el rol y quede el sistema sin administradores.
      if (user.role === 'admin' && role !== 'admin' && (await this.users.countAdmins()) <= 1) {
        res.status(400).json({ success: false, error: 'No puedes quitarte el rol admin: eres el único administrador.' });
        return;
      }
      fields.role = role;
    }

    await this.users.updateProfile(user.id, fields);
    const updated = await this.users.findById(user.id);
    res.status(200).json({ success: true, data: updated ? profileView(updated) : profileView(user) });
  };

  public changePassword = async (req: AuthedRequest, res: Response): Promise<void> => {
    const { currentPassword, newPassword } = req.body ?? {};
    if (!newPassword || String(newPassword).length < 6) {
      res.status(400).json({ success: false, error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
      return;
    }
    const user = await this.currentUser(req);
    if (!user || user.id === undefined) { res.status(404).json({ success: false, error: 'Usuario no encontrado.' }); return; }
    if (!(await this.hasher.compare(String(currentPassword ?? ''), user.passwordHash))) {
      res.status(400).json({ success: false, error: 'La contraseña actual es incorrecta.' });
      return;
    }
    await this.users.updatePassword(user.id, await this.hasher.hash(String(newPassword)));
    // Al cambiar la contraseña, invalida cualquier otra sesión abierta y renueva
    // la cookie de la sesión actual con la versión nueva (rotación).
    const version = await this.users.bumpSessionVersion(user.id);
    setSessionCookie(res, user.id, version ?? undefined);
    res.status(200).json({ success: true });
  };

  // "Cerrar todas las demás sesiones": sube la versión (invalida las existentes)
  // y renueva la cookie de la sesión actual para no autoexpulsarse.
  public revokeOtherSessions = async (req: AuthedRequest, res: Response): Promise<void> => {
    const user = await this.currentUser(req);
    if (!user || user.id === undefined) { res.status(404).json({ success: false, error: 'Usuario no encontrado.' }); return; }
    const version = await this.users.bumpSessionVersion(user.id);
    setSessionCookie(res, user.id, version ?? undefined);
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
    if (!password || String(password).length < 6) { res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 6 caracteres.' }); return; }
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
    if (!newPassword || String(newPassword).length < 6) {
      res.status(400).json({ success: false, error: 'La contraseña temporal debe tener al menos 6 caracteres.' });
      return;
    }
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
}
