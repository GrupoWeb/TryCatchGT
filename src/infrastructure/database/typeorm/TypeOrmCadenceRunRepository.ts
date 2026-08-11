import { LessThanOrEqual } from 'typeorm';
import { CadenceRunRepository } from '../../../application/ports/output/CadenceRunRepository.js';
import { CadenceRun } from '../../../domain/entities/CadenceRun.js';
import { AppDataSource } from './data-source.js';
import { CadenceRunEntity } from './entities/CadenceRunEntity.js';

function toDomain(e: CadenceRunEntity): CadenceRun {
  return new CadenceRun({
    id: e.id,
    cadenceId: e.cadenceId,
    contactId: e.contactId,
    currentStep: e.currentStep,
    status: e.status,
    nextRunAt: e.nextRunAt,
    lastSentAt: e.lastSentAt,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  });
}

export class TypeOrmCadenceRunRepository implements CadenceRunRepository {
  private get repo() {
    return AppDataSource.getRepository(CadenceRunEntity);
  }

  public async save(run: CadenceRun): Promise<CadenceRun> {
    // Con `id` presente TypeORM actualiza; sin él, inserta.
    const entity = this.repo.create({
      id: run.id,
      cadenceId: run.cadenceId,
      contactId: run.contactId,
      currentStep: run.currentStep,
      status: run.status,
      nextRunAt: run.nextRunAt,
      lastSentAt: run.lastSentAt,
    });
    return toDomain(await this.repo.save(entity));
  }

  public async findDue(now: Date): Promise<CadenceRun[]> {
    const rows = await this.repo.find({
      where: { status: 'active', nextRunAt: LessThanOrEqual(now) },
      order: { nextRunAt: 'ASC' },
    });
    return rows.map(toDomain);
  }

  public async findByContact(contactId: number): Promise<CadenceRun[]> {
    const rows = await this.repo.find({ where: { contactId }, order: { createdAt: 'DESC' } });
    return rows.map(toDomain);
  }

  public async findActive(cadenceId: number, contactId: number): Promise<CadenceRun | null> {
    const row = await this.repo.findOne({ where: { cadenceId, contactId, status: 'active' } });
    return row ? toDomain(row) : null;
  }

  public async stopActiveByContact(contactId: number): Promise<number> {
    const result = await this.repo.update(
      { contactId, status: 'active' },
      { status: 'stopped', nextRunAt: null },
    );
    return result.affected ?? 0;
  }
}
