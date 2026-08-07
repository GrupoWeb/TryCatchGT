import { LessThan, IsNull, MoreThan } from 'typeorm';
import { UserTokenRepository, TokenPurpose } from '../../../application/ports/output/UserTokenRepository.js';
import { AppDataSource } from './data-source.js';
import { UserTokenEntity } from './entities/UserTokenEntity.js';

export class TypeOrmUserTokenRepository implements UserTokenRepository {
  private get repo() {
    return AppDataSource.getRepository(UserTokenEntity);
  }

  public async create(userId: number, purpose: TokenPurpose, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.repo.insert({ userId, purpose, tokenHash, expiresAt });
  }

  public async findValid(purpose: TokenPurpose, tokenHash: string): Promise<{ id: number; userId: number } | null> {
    const row = await this.repo.findOne({
      where: { purpose, tokenHash, usedAt: IsNull(), expiresAt: MoreThan(new Date()) },
    });
    return row ? { id: row.id, userId: row.userId } : null;
  }

  public async markUsed(id: number): Promise<void> {
    await this.repo.update({ id }, { usedAt: new Date() });
  }

  public async invalidatePending(userId: number, purpose: TokenPurpose): Promise<void> {
    await this.repo.update({ userId, purpose, usedAt: IsNull() }, { usedAt: new Date() });
  }
}

// Limpieza opcional de tokens expirados (no se cablea automáticamente).
export async function purgeExpiredTokens(): Promise<void> {
  await AppDataSource.getRepository(UserTokenEntity).delete({ expiresAt: LessThan(new Date()) });
}
