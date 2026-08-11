import { Cadence } from '../../../domain/entities/Cadence.js';

export interface CadenceRepository {
  save(cadence: Cadence): Promise<Cadence>;
  update(id: number, cadence: Cadence): Promise<Cadence | null>;
  findAll(): Promise<Cadence[]>;
  findById(id: number): Promise<Cadence | null>;
  delete(id: number): Promise<boolean>;
}
