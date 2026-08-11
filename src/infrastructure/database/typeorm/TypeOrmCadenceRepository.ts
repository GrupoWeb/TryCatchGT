import { CadenceRepository } from '../../../application/ports/output/CadenceRepository.js';
import { Cadence, CadenceStepProps } from '../../../domain/entities/Cadence.js';
import { AppDataSource } from './data-source.js';
import { CadenceEntity } from './entities/CadenceEntity.js';

function parseSteps(json: string): CadenceStepProps[] {
  try {
    const raw = JSON.parse(json);
    if (!Array.isArray(raw)) return [];
    return raw.map((s) => ({ delayDays: Number(s.delayDays), templateId: Number(s.templateId) }));
  } catch {
    return [];
  }
}

function toDomain(e: CadenceEntity): Cadence {
  return new Cadence({
    id: e.id,
    name: e.name,
    isActive: e.isActive,
    steps: parseSteps(e.stepsJson),
    createdBy: e.createdBy,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  });
}

function serializeSteps(cadence: Cadence): string {
  return JSON.stringify(cadence.steps.map((s) => ({ delayDays: s.delayDays, templateId: s.templateId })));
}

export class TypeOrmCadenceRepository implements CadenceRepository {
  private get repo() {
    return AppDataSource.getRepository(CadenceEntity);
  }

  public async save(cadence: Cadence): Promise<Cadence> {
    const entity = this.repo.create({
      name: cadence.name,
      isActive: cadence.isActive,
      stepsJson: serializeSteps(cadence),
      createdBy: cadence.createdBy,
    });
    return toDomain(await this.repo.save(entity));
  }

  public async update(id: number, cadence: Cadence): Promise<Cadence | null> {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) return null;
    existing.name = cadence.name;
    existing.isActive = cadence.isActive;
    existing.stepsJson = serializeSteps(cadence);
    return toDomain(await this.repo.save(existing));
  }

  public async findAll(): Promise<Cadence[]> {
    const rows = await this.repo.find({ order: { updatedAt: 'DESC' } });
    return rows.map(toDomain);
  }

  public async findById(id: number): Promise<Cadence | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? toDomain(row) : null;
  }

  public async delete(id: number): Promise<boolean> {
    const result = await this.repo.delete({ id });
    return (result.affected ?? 0) > 0;
  }
}
