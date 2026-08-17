import { MediaRepository, StoredMedia } from '../../../application/ports/output/MediaRepository.js';
import { AppDataSource } from './data-source.js';
import { MediaEntity } from './entities/MediaEntity.js';

export class TypeOrmMediaRepository implements MediaRepository {
  private get repo() {
    return AppDataSource.getRepository(MediaEntity);
  }

  public async save(input: { mime: string; data: Buffer; size: number; createdBy: number | null }): Promise<number> {
    const result = await this.repo.insert(input);
    return Number(result.identifiers[0].id);
  }

  public async findById(id: number): Promise<StoredMedia | null> {
    const row = await this.repo.findOne({ where: { id }, select: ['mime', 'data'] });
    return row ? { mime: row.mime, data: row.data } : null;
  }

  public async delete(id: number): Promise<boolean> {
    const result = await this.repo.delete({ id });
    return (result.affected ?? 0) > 0;
  }
}
