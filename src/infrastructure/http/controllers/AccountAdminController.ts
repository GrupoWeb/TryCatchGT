import { Response } from 'express';
import { UserRepository } from '../../../application/ports/output/UserRepository.js';
import { PasswordHasher } from '../../../application/ports/output/PasswordHasher.js';
import { User } from '../../../domain/entities/User.js';
import { AuthedRequest } from '../middleware/requireAuth.js';
import { generateMfaSecret, mfaKeyUri, mfaQrDataUrl, verifyMfaToken } from '../../security/MfaService.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function profileView(u: User) {
  return { id: u.id, username: u.username, email: u.email, avatar: u.avatar, role: u.role, mfaEnabled: u.mfaEnabled };
}

export class AccountAdminController {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

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
    const fields: { email?: string | null; avatar?: string | null; role?: 'admin' | 'editor' } = {};

    if (b.email !== undefined) {
      const email = String(b.email).trim();
      if (email && !EMAIL_RE.test(email)) { res.status(400).json({ success: false, error: 'Correo inválido.' }); return; }
      fields.email = email || null;
    }
    if (b.avatar !== undefined) fields.avatar = String(b.avatar).trim() || null;
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
    res.status(200).json({ success: true });
  };

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
    res.status(200).json({ success: true });
  };

  // ── Usuarios ──────────────────────────────────────────────
  public listUsers = async (_req: AuthedRequest, res: Response): Promise<void> => {
    const users = await this.users.findAll();
    res.status(200).json({
      success: true,
      data: users.map((u) => ({ id: u.id, username: u.username, email: u.email, role: u.role, mfaEnabled: u.mfaEnabled })),
    });
  };

  public createUser = async (req: AuthedRequest, res: Response): Promise<void> => {
    const { username, password, role } = req.body ?? {};
    const uname = String(username ?? '').trim().toLowerCase();
    if (uname.length < 3) { res.status(400).json({ success: false, error: 'El usuario debe tener al menos 3 caracteres.' }); return; }
    if (!password || String(password).length < 6) { res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 6 caracteres.' }); return; }
    if (await this.users.findByUsername(uname)) { res.status(409).json({ success: false, error: 'Ese usuario ya existe.' }); return; }
    const created = await this.users.create(
      new User({ username: uname, passwordHash: await this.hasher.hash(String(password)), role: role === 'admin' ? 'admin' : 'editor' }),
    );
    res.status(201).json({ success: true, data: { id: created.id, username: created.username, role: created.role } });
  };
}
