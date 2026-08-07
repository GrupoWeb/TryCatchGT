import { Request, Response } from 'express';
import { AuthenticateUserUseCase } from '../../../application/ports/input/AuthenticateUserUseCase.js';
import { UserRepository } from '../../../application/ports/output/UserRepository.js';
import { PasswordHasher } from '../../../application/ports/output/PasswordHasher.js';
import { User } from '../../../domain/entities/User.js';
import { createMfaChallenge, verifyMfaChallenge, setSessionCookie, clearSessionCookie } from '../auth/session.js';
import { verifyMfaToken, normalizeBackupCode } from '../../security/MfaService.js';
import { AuthedRequest } from '../middleware/requireAuth.js';

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
  ) {}

  private startSession(res: Response, user: User): void {
    setSessionCookie(res, user.id!, user.sessionVersion);
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

    // Si el usuario tiene 2FA, no abrimos sesión todavía: pedimos el código.
    if (user.mfaEnabled) {
      await this.users.clearLoginFailures(user.id);
      res.status(200).json({ success: true, mfaRequired: true, challenge: createMfaChallenge(user.id) });
      return;
    }

    await this.users.recordLogin(user.id, clientIp(req));
    this.startSession(res, user);
    res.status(200).json({ success: true, user: { username: user.username, role: user.role } });
  };

  // Incrementa el contador de intentos fallidos y bloquea al superar el máximo.
  private async registerFailure(username: string): Promise<void> {
    const u = await this.users.findByUsername(username);
    if (!u || u.id === undefined) return;
    const attempts = (u.failedLoginAttempts ?? 0) + 1;
    const lockedUntil = attempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null;
    await this.users.registerFailedLogin(u.id, attempts, lockedUntil);
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
    const input = String(code ?? '');
    // Acepta el código TOTP de la app o, en su defecto, un código de respaldo
    // de un solo uso (que se consume al usarlo).
    const okTotp = verifyMfaToken(input, user.mfaSecret);
    if (!okTotp && !(await this.consumeBackupCode(user, input))) {
      res.status(401).json({ success: false, error: 'Código incorrecto.' });
      return;
    }
    await this.users.recordLogin(user.id, clientIp(req));
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
    clearSessionCookie(res);
    res.status(200).json({ success: true });
  };

  public me = (req: AuthedRequest, res: Response): void => {
    res.status(200).json({ success: true, authenticated: true, userId: req.userId });
  };
}
