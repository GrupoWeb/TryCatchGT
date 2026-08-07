import { ProjectRequest } from '../../../domain/entities/ProjectRequest.js';

export interface CreateProjectRequestDTO {
  clientName: string;
  clientEmail: string;
  companyName?: string;
  projectType: string;
  budgetRange?: string;
  description: string;
}

export interface CreateProjectRequestUseCase {
  execute(dto: CreateProjectRequestDTO): Promise<ProjectRequest>;
}
