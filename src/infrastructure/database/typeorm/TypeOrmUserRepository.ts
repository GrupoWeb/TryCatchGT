import { IsNull } from 'typeorm';
import { UserRepository, UserProfileUpdate, UserAccountStateUpdate } from '../../../application/ports/output/UserRepository.js';
import { User } from '../../../domain/entities/User.js';
import { AppDataSource } from './data-source.js';
import { UserEntity } from './entities/UserEntity.js';

function toDomain(e: UserEntity): User {
  return new User({
    id: e.id,
    username: e.username,
    passwordHash: e.passwordHash,
    role: e.role,
    email: e.email ?? null,
    avatar: e.avatar ?? null,
    mfaEnabled: e.mfaEnabled,
    mfaSecret: e.mfaSecret ?? null,
    mfaBackupCodes: e.mfaBackupCodes ?? null,
    sessionVersion: e.sessionVersion ?? 0,
    fullName: e.fullName ?? null,
    lastName: e.lastName ?? null,
    displayName: e.displayName ?? null,
    status: e.status,
    isActive: e.isActive,
    mustChangePassword: e.mustChangePassword,
    emailVerifiedAt: e.emailVerifiedAt ?? null,
    lastLoginAt: e.lastLoginAt ?? null,
    lastLoginIp: e.lastLoginIp ?? null,
    passwordChangedAt: e.passwordChangedAt ?? null,
    failedLoginAttempts: e.failedLoginAttempts ?? 0,
    lockedUntil: e.lockedUntil ?? null,
    createdBy: e.createdBy ?? null,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    deletedAt: e.deletedAt ?? null,
  });
}

export class TypeOrmUserRepository implements UserRepository {
  private get repo() {
    return AppDataSource.getRepository(UserEntity);
  }

  public async findByUsername(username: string): Promise<User | null> {
    const row = await this.repo.findOne({ where: { username: username.trim().toLowerCase() } });
    return row ? toDomain(row) : null;
  }

  public async findById(id: number): Promise<User | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? toDomain(row) : null;
  }

  public async findAll(): Promise<User[]> {
    const rows = await this.repo.find({ order: { id: 'ASC' } });
    return rows.map(toDomain);
  }

  public async create(user: User): Promise<User> {
    const entity = this.repo.create({
      username: user.username,
      passwordHash: user.passwordHash,
      role: user.role,
      email: user.email,
      avatar: user.avatar,
      fullName: user.fullName,
      lastName: user.lastName,
      displayName: user.displayName,
      status: user.status,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      createdBy: user.createdBy,
    });
    const saved = await this.repo.save(entity);
    return toDomain(saved);
  }

  public async updatePassword(id: number, passwordHash: string): Promise<boolean> {
    // Al cambiar la contraseña se marca la fecha y se limpia el flag de cambio forzado.
    const result = await this.repo.update({ id }, { passwordHash, passwordChangedAt: new Date(), mustChangePassword: false });
    return (result.affected ?? 0) > 0;
  }

  public async updateProfile(id: number, fields: UserProfileUpdate): Promise<boolean> {
    const patch: Partial<UserEntity> = {};
    if (fields.email !== undefined) patch.email = fields.email || null;
    if (fields.avatar !== undefined) patch.avatar = fields.avatar || null;
    if (fields.role !== undefined) patch.role = fields.role;
    if (fields.fullName !== undefined) patch.fullName = fields.fullName || null;
    if (fields.lastName !== undefined) patch.lastName = fields.lastName || null;
    if (fields.displayName !== undefined) patch.displayName = fields.displayName || null;
    if (Object.keys(patch).length === 0) return true;
    const result = await this.repo.update({ id }, patch);
    return (result.affected ?? 0) > 0;
  }

  public async setMfa(id: number, secret: string | null, enabled: boolean): Promise<boolean> {
    const result = await this.repo.update({ id }, { mfaSecret: secret, mfaEnabled: enabled });
    return (result.affected ?? 0) > 0;
  }

  public async setBackupCodes(id: number, hashes: string[] | null): Promise<boolean> {
    const result = await this.repo.update({ id }, { mfaBackupCodes: hashes && hashes.length ? hashes : null });
    return (result.affected ?? 0) > 0;
  }

  public async bumpSessionVersion(id: number): Promise<number | null> {
    await this.repo.increment({ id }, 'sessionVersion', 1);
    const row = await this.repo.findOne({ where: { id }, select: { sessionVersion: true } });
    return row ? row.sessionVersion : null;
  }

  public async recordLogin(id: number, ip: string | null): Promise<void> {
    await this.repo.update({ id }, {
      lastLoginAt: new Date(),
      lastLoginIp: ip,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
  }

  public async clearLoginFailures(id: number): Promise<void> {
    await this.repo.update({ id }, { failedLoginAttempts: 0, lockedUntil: null });
  }

  public async registerFailedLogin(id: number, attempts: number, lockedUntil: Date | null): Promise<void> {
    await this.repo.update({ id }, { failedLoginAttempts: attempts, lockedUntil });
  }

  public async updateAccountState(id: number, fields: UserAccountStateUpdate): Promise<boolean> {
    const patch: Partial<UserEntity> = {};
    if (fields.status !== undefined) patch.status = fields.status;
    if (fields.isActive !== undefined) patch.isActive = fields.isActive;
    if (fields.deletedAt !== undefined) patch.deletedAt = fields.deletedAt;
    if (Object.keys(patch).length === 0) return true;
    const result = await this.repo.update({ id }, patch);
    return (result.affected ?? 0) > 0;
  }

  public async setMustChangePassword(id: number, value: boolean): Promise<boolean> {
    const result = await this.repo.update({ id }, { mustChangePassword: value });
    return (result.affected ?? 0) > 0;
  }

  public async countAdmins(): Promise<number> {
    return this.repo.countBy({ role: 'admin' });
  }

  public async countActiveAdmins(): Promise<number> {
    return this.repo.countBy({ role: 'admin', isActive: true, deletedAt: IsNull() });
  }

  public async count(): Promise<number> {
    return this.repo.count();
  }
}
