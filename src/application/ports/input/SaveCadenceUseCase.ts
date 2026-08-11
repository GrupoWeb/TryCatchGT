import { Cadence, CadenceStepProps } from '../../../domain/entities/Cadence.js';

export interface SaveCadenceInput {
  id?: number;
  name: string;
  isActive?: boolean;
  steps: CadenceStepProps[];
  createdBy?: number | null;
}

export interface SaveCadenceUseCase {
  execute(input: SaveCadenceInput): Promise<Cadence>;
}
