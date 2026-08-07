import { Request, Response } from 'express';
import { AuthenticateUserUseCase } from '../../../application/ports/input/AuthenticateUserUseCase.js';
import { UserRepository } from '../../../application/ports/output/UserRepository.js';
import { User } from '../../../domain/entities/User.js';
import { createMfaChallenge, verifyMfaChallenge, setSessionCookie, clearSessionCookie } from '../auth/session.js';
import { verifyMfaToken } from '../../security/MfaService.js';
import { AuthedRequest } from '../middleware/requireAuth.js';

export class AuthController {
  constructor(
    private readonly authenticate: AuthenticateUserUseCase,
    private readonly users: UserRepository,
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
    if (!verifyMfaToken(String(code ?? ''), user.mfaSecret)) {
      res.status(401).json({ success: false, error: 'Código incorrecto.' });
      return;
    }
    this.startSession(res, user);
    res.status(200).json({ success: true, user: { username: user.username, role: user.role } });
  };

  public logout = (_req: Request, res: Response): void => {
    clearSessionCookie(res);
    res.status(200).json({ success: true });
  };

  public me = (req: AuthedRequest, res: Response): void => {
    res.status(200).json({ success: true, authenticated: true, userId: req.userId });
  };
}
