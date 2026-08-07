import { Request, Response } from 'express';
import { AuthenticateUserUseCase } from '../../../application/ports/input/AuthenticateUserUseCase.js';
import { UserRepository } from '../../../application/ports/output/UserRepository.js';
import { PasswordHasher } from '../../../application/ports/output/PasswordHasher.js';
import { User } from '../../../domain/entities/User.js';
import { env } from '../../../config/env.js';
import { createSessionToken, createMfaChallenge, verifyMfaChallenge } from '../auth/session.js';
import { verifyMfaToken, normalizeBackupCode } from '../../security/MfaService.js';
import { AuthedRequest } from '../middleware/requireAuth.js';

export class AuthController {
  constructor(
    private readonly authenticate: AuthenticateUserUseCase,
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  private startSession(res: Response, user: User): void {
    res.cookie(env.session.cookieName, createSessionToken(user.id!), {
      httpOnly: true,
      sameSite: 'strict',
      secure: env.isProduction,
      maxAge: env.session.maxAgeMs,
      path: '/',
    });
  }

  public login = async (req: Request, res: Response): Promise<void> => {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      res.status(400).json({ success: false, error: 'Usuario y contraseña son obligatorios.' });
      return;
    }

    const user = await this.authenticate.execute({ username, password });
    if (!user || user.id === undefined) {
      res.status(401).json({ success: false, error: 'Credenciales inválidas.' });
      return;
    }

    // Si el usuario tiene 2FA, no abrimos sesión todavía: pedimos el código.
    if (user.mfaEnabled) {
      res.status(200).json({ success: true, mfaRequired: true, challenge: createMfaChallenge(user.id) });
      return;
    }

    this.startSession(res, user);
    res.status(200).json({ success: true, user: { username: user.username, role: user.role } });
  };

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
    const input = String(code ?? '');
    // Acepta el código TOTP de la app o, en su defecto, un código de respaldo
    // de un solo uso (que se consume al usarlo).
    const okTotp = verifyMfaToken(input, user.mfaSecret);
    if (!okTotp && !(await this.consumeBackupCode(user, input))) {
      res.status(401).json({ success: false, error: 'Código incorrecto.' });
      return;
    }
    this.startSession(res, user);
    res.status(200).json({ success: true, user: { username: user.username, role: user.role } });
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

  public logout = (_req: Request, res: Response): void => {
    res.clearCookie(env.session.cookieName, { path: '/' });
    res.status(200).json({ success: true });
  };

  public me = (req: AuthedRequest, res: Response): void => {
    res.status(200).json({ success: true, authenticated: true, userId: req.userId });
  };
}
