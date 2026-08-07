import { Plan } from '../../../domain/entities/Plan.js';

export interface GetPlansUseCase {
  execute(): Promise<Plan[]>;
}
