import { Cadence } from '../../../domain/entities/Cadence.js';

export interface GetCadencesUseCase {
  execute(): Promise<Cadence[]>;
}
