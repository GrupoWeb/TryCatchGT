import { CreateProjectRequestUseCase, CreateProjectRequestDTO } from '../ports/input/CreateProjectRequestUseCase.js';
import { ProjectRequestRepository } from '../ports/output/ProjectRequestRepository.js';
import { ProjectRequest } from '../../domain/entities/ProjectRequest.js';

export class CreateProjectRequest implements CreateProjectRequestUseCase {
  constructor(private readonly projectRequestRepo: ProjectRequestRepository) {}

  public async execute(dto: CreateProjectRequestDTO): Promise<ProjectRequest> {
    const projectRequest = new ProjectRequest({
      clientName: dto.clientName,
      clientEmail: dto.clientEmail,
      companyName: dto.companyName,
      projectType: dto.projectType,
      budgetRange: dto.budgetRange,
      description: dto.description,
    });

    return await this.projectRequestRepo.save(projectRequest);
  }
}
