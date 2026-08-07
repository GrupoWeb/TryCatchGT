import crypto from 'node:crypto';
import { UserTokenRepository, TokenPurpose } from '../../application/ports/output/UserTokenRepository.js';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Emite y consume tokens de un solo uso (verificación de correo, recuperación de
 * contraseña). Solo se persiste el hash del token; el valor en claro se envía por
 * correo y no se guarda.
 */
export class TokenService {
  constructor(private readonly tokens: UserTokenRepository) {}

  public async issue(userId: number, purpose: TokenPurpose, ttlMinutes: number): Promise<string> {
    await this.tokens.invalidatePending(userId, purpose); // solo el más reciente es válido
    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
    await this.tokens.create(userId, purpose, hashToken(token), expiresAt);
    return token;
  }

  public async consume(purpose: TokenPurpose, token: string): Promise<number | null> {
    if (!token) return null;
    const found = await this.tokens.findValid(purpose, hashToken(token));
    if (!found) return null;
    await this.tokens.markUsed(found.id);
    return found.userId;
  }
}
