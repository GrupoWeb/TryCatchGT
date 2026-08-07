import { Plan } from '../../../domain/entities/Plan.js';

export interface PlanRepository {
  findAll(): Promise<Plan[]>;
  findBySlug(slug: string): Promise<Plan | null>;
  findById(id: number): Promise<Plan | null>;
  save(plan: Plan): Promise<Plan>;
  delete(id: number): Promise<boolean>;
}
