import { User, UserStatus } from '../../../domain/entities/User.js';

export interface UserAccountStateUpdate {
  status?: UserStatus;
  isActive?: boolean;
  deletedAt?: Date | null;
}

export interface UserProfileUpdate {
  email?: string | null;
  avatar?: string | null;
  role?: 'admin' | 'editor';
  fullName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
}

export interface UserRepository {
  findByUsername(username: string): Promise<User | null>;
  findById(id: number): Promise<User | null>;
  findAll(): Promise<User[]>;
  create(user: User): Promise<User>;
  updatePassword(id: number, passwordHash: string): Promise<boolean>;
  updateProfile(id: number, fields: UserProfileUpdate): Promise<boolean>;
  setMfa(id: number, secret: string | null, enabled: boolean): Promise<boolean>;
  setBackupCodes(id: number, hashes: string[] | null): Promise<boolean>;
  // Sube session_version para invalidar todas las sesiones; devuelve la versión nueva.
  bumpSessionVersion(id: number): Promise<number | null>;
  // Registra un acceso exitoso (last_login_at/ip) y limpia intentos/bloqueo.
  recordLogin(id: number, ip: string | null): Promise<void>;
  // Limpia el contador de intentos fallidos y el bloqueo (credencial correcta).
  clearLoginFailures(id: number): Promise<void>;
  // Fija el contador de intentos fallidos y, si aplica, la fecha de bloqueo.
  registerFailedLogin(id: number, attempts: number, lockedUntil: Date | null): Promise<void>;
  // Actualiza estado de cuenta / soft-delete de un usuario.
  updateAccountState(id: number, fields: UserAccountStateUpdate): Promise<boolean>;
  // Marca (o quita) la obligación de cambiar contraseña en el próximo acceso.
  setMustChangePassword(id: number, value: boolean): Promise<boolean>;
  countAdmins(): Promise<number>;
  // Admins que pueden operar (activos y no eliminados); para no quedarse sin admin.
  countActiveAdmins(): Promise<number>;
  count(): Promise<number>;
}
