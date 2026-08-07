import { Service } from '../../../domain/entities/Service.js';

export interface ServiceRepository {
  findAll(): Promise<Service[]>;
  findBySlug(slug: string): Promise<Service | null>;
  findById(id: number): Promise<Service | null>;
  save(service: Service): Promise<Service>;
  delete(id: number): Promise<boolean>;
}
