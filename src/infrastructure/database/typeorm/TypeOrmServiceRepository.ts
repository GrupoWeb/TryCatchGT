import { ServiceRepository } from '../../../application/ports/output/ServiceRepository.js';
import { Service } from '../../../domain/entities/Service.js';
import { AppDataSource } from './data-source.js';
import { ServiceEntity } from './entities/ServiceEntity.js';

function toDomain(e: ServiceEntity): Service {
  return new Service({
    id: e.id,
    slug: e.slug,
    title: e.title,
    description: e.description,
    icon: e.icon,
    accentColor: e.accentColor,
    tags: e.tags ?? [],
    isFeatured: e.isFeatured,
  });
}

/**
 * Adaptador de ServiceRepository sobre TypeORM. Sin degradación a memoria: si la
 * base de datos falla, el error se propaga y lo maneja la capa HTTP.
 */
export class TypeOrmServiceRepository implements ServiceRepository {
  private get repo() {
    return AppDataSource.getRepository(ServiceEntity);
  }

  public async findAll(): Promise<Service[]> {
    const rows = await this.repo.find({ order: { id: 'ASC' } });
    return rows.map(toDomain);
  }

  public async findBySlug(slug: string): Promise<Service | null> {
    const row = await this.repo.findOne({ where: { slug } });
    return row ? toDomain(row) : null;
  }

  public async findById(id: number): Promise<Service | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? toDomain(row) : null;
  }

  public async save(service: Service): Promise<Service> {
    // Con id presente TypeORM actualiza; sin id, inserta.
    const entity = this.repo.create({
      id: service.id,
      slug: service.slug,
      title: service.title,
      description: service.description,
      icon: service.icon,
      accentColor: service.accentColor,
      tags: service.tags ?? [],
      isFeatured: service.isFeatured,
    });
    const saved = await this.repo.save(entity);
    return toDomain(saved);
  }

  public async delete(id: number): Promise<boolean> {
    const result = await this.repo.delete({ id });
    return (result.affected ?? 0) > 0;
  }
}
