export type TokenPurpose = 'email_verify' | 'password_reset';

export interface UserTokenRepository {
  create(userId: number, purpose: TokenPurpose, tokenHash: string, expiresAt: Date): Promise<void>;
  // Devuelve el token válido (no usado, no expirado) que coincide con el hash, o null.
  findValid(purpose: TokenPurpose, tokenHash: string): Promise<{ id: number; userId: number } | null>;
  markUsed(id: number): Promise<void>;
  // Invalida (marca como usados) los tokens pendientes del usuario para ese propósito.
  invalidatePending(userId: number, purpose: TokenPurpose): Promise<void>;
}
