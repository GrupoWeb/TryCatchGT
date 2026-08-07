import { PlanRepository } from '../../../application/ports/output/PlanRepository.js';
import { Plan } from '../../../domain/entities/Plan.js';
import { AppDataSource } from './data-source.js';
import { PlanEntity } from './entities/PlanEntity.js';

function toDomain(e: PlanEntity): Plan {
  return new Plan({
    id: e.id,
    slug: e.slug,
    name: e.name,
    tagline: e.tagline,
    priceMonthly: Number(e.priceMonthly),
    priceMonthlyGtq: Number(e.priceMonthlyGtq),
    currency: e.currency,
    features: e.features ?? [],
    services: e.services ?? [],
    accentColor: e.accentColor,
    ctaLabel: e.ctaLabel,
    isPopular: e.isPopular,
  });
}

export class TypeOrmPlanRepository implements PlanRepository {
  private get repo() {
    return AppDataSource.getRepository(PlanEntity);
  }

  public async findAll(): Promise<Plan[]> {
    const rows = await this.repo.find({ order: { priceMonthly: 'ASC' } });
    return rows.map(toDomain);
  }

  public async findBySlug(slug: string): Promise<Plan | null> {
    const row = await this.repo.findOne({ where: { slug } });
    return row ? toDomain(row) : null;
  }

  public async findById(id: number): Promise<Plan | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? toDomain(row) : null;
  }

  public async save(plan: Plan): Promise<Plan> {
    const entity = this.repo.create({
      id: plan.id,
      slug: plan.slug,
      name: plan.name,
      tagline: plan.tagline,
      priceMonthly: plan.priceMonthly,
      priceMonthlyGtq: plan.priceMonthlyGtq,
      currency: plan.currency,
      features: plan.features ?? [],
      services: plan.services ?? [],
      accentColor: plan.accentColor,
      ctaLabel: plan.ctaLabel,
      isPopular: plan.isPopular,
    });
    const saved = await this.repo.save(entity);
    return toDomain(saved);
  }

  public async delete(id: number): Promise<boolean> {
    const result = await this.repo.delete({ id });
    return (result.affected ?? 0) > 0;
  }
}
