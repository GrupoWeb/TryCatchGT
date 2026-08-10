export type UserRole = 'admin' | 'editor';
export type UserStatus = 'active' | 'disabled' | 'invited';

export interface UserProps {
  id?: number;
  username: string;
  passwordHash: string;
  role?: UserRole;
  email?: string | null;
  avatar?: string | null;
  avatarPosition?: string | null;
  mfaEnabled?: boolean;
  mfaSecret?: string | null;
  mfaBackupCodes?: string[] | null;
  sessionVersion?: number;
  // Perfil
  fullName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  // Estado de cuenta
  status?: UserStatus;
  isActive?: boolean;
  mustChangePassword?: boolean;
  emailVerifiedAt?: Date | null;
  // Seguridad de acceso
  lastLoginAt?: Date | null;
  lastLoginIp?: string | null;
  passwordChangedAt?: Date | null;
  failedLoginAttempts?: number;
  lockedUntil?: Date | null;
  // Auditoría / ciclo de vida
  createdBy?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export class User {
  public readonly id?: number;
  public readonly username: string;
  public readonly passwordHash: string;
  public readonly role: UserRole;
  public readonly email: string | null;
  public readonly avatar: string | null;
  public readonly avatarPosition: string | null;
  public readonly mfaEnabled: boolean;
  public readonly mfaSecret: string | null;
  public readonly mfaBackupCodes: string[] | null;
  public readonly sessionVersion: number;
  public readonly fullName: string | null;
  public readonly lastName: string | null;
  public readonly displayName: string | null;
  public readonly status: UserStatus;
  public readonly isActive: boolean;
  public readonly mustChangePassword: boolean;
  public readonly emailVerifiedAt: Date | null;
  public readonly lastLoginAt: Date | null;
  public readonly lastLoginIp: string | null;
  public readonly passwordChangedAt: Date | null;
  public readonly failedLoginAttempts: number;
  public readonly lockedUntil: Date | null;
  public readonly createdBy: number | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly deletedAt: Date | null;

  constructor(props: UserProps) {
    this.id = props.id;
    this.username = props.username.trim().toLowerCase();
    this.passwordHash = props.passwordHash;
    this.role = props.role || 'admin';
    this.email = props.email?.trim() || null;
    this.avatar = props.avatar?.trim() || null;
    this.avatarPosition = props.avatarPosition?.trim() || null;
    this.mfaEnabled = props.mfaEnabled ?? false;
    this.mfaSecret = props.mfaSecret || null;
    this.mfaBackupCodes = props.mfaBackupCodes ?? null;
    this.sessionVersion = props.sessionVersion ?? 0;
    this.fullName = props.fullName?.trim() || null;
    this.lastName = props.lastName?.trim() || null;
    this.displayName = props.displayName?.trim() || null;
    this.status = props.status || 'active';
    this.isActive = props.isActive ?? true;
    this.mustChangePassword = props.mustChangePassword ?? false;
    this.emailVerifiedAt = props.emailVerifiedAt ?? null;
    this.lastLoginAt = props.lastLoginAt ?? null;
    this.lastLoginIp = props.lastLoginIp ?? null;
    this.passwordChangedAt = props.passwordChangedAt ?? null;
    this.failedLoginAttempts = props.failedLoginAttempts ?? 0;
    this.lockedUntil = props.lockedUntil ?? null;
    this.createdBy = props.createdBy ?? null;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
    this.deletedAt = props.deletedAt ?? null;
  }

  /** Nombre para mostrar: displayName → fullName → username. */
  public get label(): string {
    return this.displayName || this.fullName || this.username;
  }

  /** True si la cuenta está bloqueada temporalmente por intentos fallidos. */
  public get isLocked(): boolean {
    return this.lockedUntil !== null && this.lockedUntil.getTime() > Date.now();
  }

  /** True si la cuenta puede iniciar sesión (activa, no deshabilitada ni borrada). */
  public get canLogin(): boolean {
    return this.isActive && this.status === 'active' && this.deletedAt === null;
  }
}
