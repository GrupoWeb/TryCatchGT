import { ProjectRequest, ProjectRequestStatus } from '../../../domain/entities/ProjectRequest.js';

export interface ProjectRequestRepository {
  save(request: ProjectRequest): Promise<ProjectRequest>;
  findAll(): Promise<ProjectRequest[]>;
  findById(id: number): Promise<ProjectRequest | null>;
  updateStatus(id: number, status: ProjectRequestStatus): Promise<boolean>;
}
