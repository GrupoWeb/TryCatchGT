import { LandingSampleRepository } from '../../../application/ports/output/LandingSampleRepository.js';
import { LandingSample } from '../../../domain/entities/LandingSample.js';
import { AppDataSource } from './data-source.js';
import { LandingSampleEntity } from './entities/LandingSampleEntity.js';

function toDomain(e: LandingSampleEntity): LandingSample {
  return new LandingSample({
    id: e.id,
    slug: e.slug,
    title: e.title,
    html: e.html,
    // MySQL devuelve tinyint como número; normaliza a booleano.
    isActive: !!e.isActive,
    createdBy: e.createdBy ?? null,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  });
}

export class TypeOrmLandingSampleRepository implements LandingSampleRepository {
  private get repo() {
    return AppDataSource.getRepository(LandingSampleEntity);
  }

  public async findAll(): Promise<LandingSample[]> {
    const rows = await this.repo.find({ order: { updatedAt: 'DESC' } });
    return rows.map(toDomain);
  }

  public async findById(id: number): Promise<LandingSample | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? toDomain(row) : null;
  }

  public async findBySlug(slug: string): Promise<LandingSample | null> {
    const row = await this.repo.findOne({ where: { slug } });
    return row ? toDomain(row) : null;
  }

  public async save(sample: LandingSample): Promise<LandingSample> {
    const entity = this.repo.create({
      id: sample.id,
      slug: sample.slug,
      title: sample.title,
      html: sample.html,
      isActive: sample.isActive,
      createdBy: sample.createdBy ?? null,
    });
    const saved = await this.repo.save(entity);
    return toDomain(saved);
  }

  public async delete(id: number): Promise<boolean> {
    const result = await this.repo.delete({ id });
    return (result.affected ?? 0) > 0;
  }
}
