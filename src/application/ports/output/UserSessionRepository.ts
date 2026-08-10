export interface UserSessionInfo {
  id: number;
  userId: number;
  sid: string;
  userAgent: string | null;
  ip: string | null;
  lastSeenAt: Date | null;
  createdAt: Date;
}

export interface UserSessionRepository {
  create(entry: { userId: number; sid: string; userAgent: string | null; ip: string | null; expiresAt: Date }): Promise<void>;
  // Sesión activa (no revocada ni expirada) por sid.
  findActiveBySid(sid: string): Promise<{ id: number; userId: number } | null>;
  listActiveByUser(userId: number): Promise<UserSessionInfo[]>;
  revokeById(id: number, userId: number): Promise<boolean>;
  revokeBySid(sid: string): Promise<void>;
  // Revoca todas las sesiones activas del usuario excepto la del sid indicado.
  revokeAllExcept(userId: number, keepSid: string): Promise<void>;
  touch(sid: string): Promise<void>;
}
