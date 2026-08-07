import { IsNull, MoreThan, Not } from 'typeorm';
import { UserSessionRepository, UserSessionInfo } from '../../../application/ports/output/UserSessionRepository.js';
import { AppDataSource } from './data-source.js';
import { UserSessionEntity } from './entities/UserSessionEntity.js';

export class TypeOrmUserSessionRepository implements UserSessionRepository {
  private get repo() {
    return AppDataSource.getRepository(UserSessionEntity);
  }

  public async create(entry: { userId: number; sid: string; userAgent: string | null; ip: string | null; expiresAt: Date }): Promise<void> {
    await this.repo.insert(entry);
  }

  public async findActiveBySid(sid: string): Promise<{ id: number; userId: number } | null> {
    const row = await this.repo.findOne({ where: { sid, revokedAt: IsNull(), expiresAt: MoreThan(new Date()) } });
    return row ? { id: row.id, userId: row.userId } : null;
  }

  public async listActiveByUser(userId: number): Promise<UserSessionInfo[]> {
    const rows = await this.repo.find({
      where: { userId, revokedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      order: { lastSeenAt: 'DESC', createdAt: 'DESC' },
    });
    return rows.map((r) => ({
      id: r.id, userId: r.userId, sid: r.sid, userAgent: r.userAgent, ip: r.ip,
      lastSeenAt: r.lastSeenAt, createdAt: r.createdAt,
    }));
  }

  public async revokeById(id: number, userId: number): Promise<boolean> {
    const result = await this.repo.update({ id, userId, revokedAt: IsNull() }, { revokedAt: new Date() });
    return (result.affected ?? 0) > 0;
  }

  public async revokeBySid(sid: string): Promise<void> {
    await this.repo.update({ sid, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  public async revokeAllExcept(userId: number, keepSid: string): Promise<void> {
    await this.repo.update({ userId, sid: Not(keepSid), revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  public async touch(sid: string): Promise<void> {
    await this.repo.update({ sid }, { lastSeenAt: new Date() });
  }
}
