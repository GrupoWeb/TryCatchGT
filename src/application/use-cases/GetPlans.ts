import { GetPlansUseCase } from '../ports/input/GetPlansUseCase.js';
import { PlanRepository } from '../ports/output/PlanRepository.js';
import { Plan } from '../../domain/entities/Plan.js';

export class GetPlans implements GetPlansUseCase {
  constructor(private readonly planRepo: PlanRepository) {}

  public async execute(): Promise<Plan[]> {
    return await this.planRepo.findAll();
  }
}
