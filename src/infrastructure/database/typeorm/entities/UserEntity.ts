import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type UserRoleDb = 'admin' | 'editor';
export type UserStatusDb = 'active' | 'disabled' | 'invited';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  username!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'enum', enum: ['admin', 'editor'], default: 'admin' })
  role!: UserRoleDb;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar!: string | null;

  @Column({ name: 'mfa_secret', type: 'varchar', length: 64, nullable: true })
  mfaSecret!: string | null;

  @Column({ name: 'mfa_enabled', type: 'boolean', default: false })
  mfaEnabled!: boolean;

  @Column({ name: 'mfa_backup_codes', type: 'json', nullable: true })
  mfaBackupCodes!: string[] | null;

  @Column({ name: 'session_version', type: 'int', default: 0 })
  sessionVersion!: number;

  // ── Perfil ────────────────────────────────────────────────
  @Column({ name: 'full_name', type: 'varchar', length: 150, nullable: true })
  fullName!: string | null;

  @Column({ name: 'last_name', type: 'varchar', length: 150, nullable: true })
  lastName!: string | null;

  @Column({ name: 'display_name', type: 'varchar', length: 150, nullable: true })
  displayName!: string | null;

  // ── Estado de cuenta ──────────────────────────────────────
  @Column({ type: 'enum', enum: ['active', 'disabled', 'invited'], default: 'active' })
  status!: UserStatusDb;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'must_change_password', type: 'boolean', default: false })
  mustChangePassword!: boolean;

  @Column({ name: 'email_verified_at', type: 'datetime', nullable: true })
  emailVerifiedAt!: Date | null;

  // ── Seguridad de acceso ───────────────────────────────────
  @Column({ name: 'last_login_at', type: 'datetime', nullable: true })
  lastLoginAt!: Date | null;

  @Column({ name: 'last_login_ip', type: 'varchar', length: 64, nullable: true })
  lastLoginIp!: string | null;

  @Column({ name: 'password_changed_at', type: 'datetime', nullable: true })
  passwordChangedAt!: Date | null;

  @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
  failedLoginAttempts!: number;

  @Column({ name: 'locked_until', type: 'datetime', nullable: true })
  lockedUntil!: Date | null;

  // ── Auditoría/ciclo de vida ───────────────────────────────
  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt!: Date | null;
}
