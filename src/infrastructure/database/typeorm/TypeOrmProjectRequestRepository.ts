import { ProjectRequestRepository } from '../../../application/ports/output/ProjectRequestRepository.js';
import { ProjectRequest, ProjectRequestStatus } from '../../../domain/entities/ProjectRequest.js';
import { AppDataSource } from './data-source.js';
import { ProjectRequestEntity } from './entities/ProjectRequestEntity.js';

function toDomain(e: ProjectRequestEntity): ProjectRequest {
  return new ProjectRequest({
    id: e.id,
    clientName: e.clientName,
    clientEmail: e.clientEmail,
    companyName: e.companyName ?? undefined,
    projectType: e.projectType,
    budgetRange: e.budgetRange ?? undefined,
    description: e.description,
    status: e.status,
    createdAt: e.createdAt,
  });
}

export class TypeOrmProjectRequestRepository implements ProjectRequestRepository {
  private get repo() {
    return AppDataSource.getRepository(ProjectRequestEntity);
  }

  public async save(request: ProjectRequest): Promise<ProjectRequest> {
    const entity = this.repo.create({
      clientName: request.clientName,
      clientEmail: request.clientEmail.getValue(),
      companyName: request.companyName || null,
      projectType: request.projectType,
      budgetRange: request.budgetRange || null,
      description: request.description,
      status: request.status,
    });
    const saved = await this.repo.save(entity);
    return toDomain(saved);
  }

  public async findAll(): Promise<ProjectRequest[]> {
    const rows = await this.repo.find({ order: { createdAt: 'DESC' } });
    return rows.map(toDomain);
  }

  public async findById(id: number): Promise<ProjectRequest | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? toDomain(row) : null;
  }

  public async updateStatus(id: number, status: ProjectRequestStatus): Promise<boolean> {
    const result = await this.repo.update({ id }, { status });
    return (result.affected ?? 0) > 0;
  }
}
