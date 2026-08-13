import { LandingSample } from '../../../domain/entities/LandingSample.js';

export interface LandingSampleRepository {
  findAll(): Promise<LandingSample[]>;
  findById(id: number): Promise<LandingSample | null>;
  findBySlug(slug: string): Promise<LandingSample | null>;
  save(sample: LandingSample): Promise<LandingSample>;
  delete(id: number): Promise<boolean>;
}
