import { Brackets } from 'typeorm';
import {
  ContactFilters,
  ContactPatch,
  ContactRepository,
} from '../../../application/ports/output/ContactRepository.js';
import { Contact, ContactStage } from '../../../domain/entities/Contact.js';
import { AppDataSource } from './data-source.js';
import { ContactEntity } from './entities/ContactEntity.js';

function toDomain(e: ContactEntity): Contact {
  return new Contact({
    id: e.id,
    name: e.name,
    email: e.email,
    phone: e.phone ?? undefined,
    company: e.company ?? undefined,
    sector: e.sector ?? undefined,
    location: e.location ?? undefined,
    website: e.website ?? undefined,
    source: e.source,
    tier: e.tier,
    stage: e.stage,
    ownerId: e.ownerId,
    notes: e.notes ?? undefined,
    nextActionAt: e.nextActionAt,
    archived: e.archived,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  });
}

export class TypeOrmContactRepository implements ContactRepository {
  private get repo() {
    return AppDataSource.getRepository(ContactEntity);
  }

  public async save(contact: Contact): Promise<Contact> {
    const entity = this.repo.create({
      name: contact.name,
      email: contact.email.getValue(),
      phone: contact.phone || null,
      company: contact.company || null,
      sector: contact.sector || null,
      location: contact.location || null,
      website: contact.website || null,
      source: contact.source,
      tier: contact.tier,
      stage: contact.stage,
      ownerId: contact.ownerId,
      notes: contact.notes || null,
      nextActionAt: contact.nextActionAt,
      archived: contact.archived,
    });
    const saved = await this.repo.save(entity);
    return toDomain(saved);
  }

  public async findAll(filters: ContactFilters = {}): Promise<Contact[]> {
    const qb = this.repo.createQueryBuilder('c');

    if (!filters.includeArchived) qb.andWhere('c.archived = :archived', { archived: false });
    if (filters.stage) qb.andWhere('c.stage = :stage', { stage: filters.stage });
    if (filters.tier) qb.andWhere('c.tier = :tier', { tier: filters.tier });
    if (filters.sector) qb.andWhere('c.sector = :sector', { sector: filters.sector });
    if (filters.hasWebsite === true) qb.andWhere("c.website IS NOT NULL AND c.website <> ''");
    if (filters.hasWebsite === false) qb.andWhere("(c.website IS NULL OR c.website = '')");
    if (filters.search) {
      const like = `%${filters.search.trim()}%`;
      qb.andWhere(
        new Brackets((w) => {
          w.where('c.name LIKE :like', { like })
            .orWhere('c.email LIKE :like', { like })
            .orWhere('c.company LIKE :like', { like })
            .orWhere('c.sector LIKE :like', { like })
            .orWhere('c.location LIKE :like', { like });
        }),
      );
    }

    // Prioridad primero (alta → media → base → sin tier), luego más recientes.
    qb.orderBy(
      "FIELD(c.tier, 'alta', 'media', 'base')",
    ).addOrderBy('c.createdAt', 'DESC');

    const rows = await qb.getMany();
    return rows.map(toDomain);
  }

  public async findById(id: number): Promise<Contact | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? toDomain(row) : null;
  }

  public async findByEmail(email: string): Promise<Contact | null> {
    const row = await this.repo.findOne({ where: { email: email.trim().toLowerCase() } });
    return row ? toDomain(row) : null;
  }

  public async updateStage(id: number, stage: ContactStage): Promise<boolean> {
    const result = await this.repo.update({ id }, { stage });
    return (result.affected ?? 0) > 0;
  }

  public async update(id: number, patch: ContactPatch): Promise<boolean> {
    // Solo se tocan los campos presentes en el parche.
    const set: Record<string, unknown> = {};
    if (patch.name !== undefined) set.name = patch.name;
    if (patch.phone !== undefined) set.phone = patch.phone || null;
    if (patch.company !== undefined) set.company = patch.company || null;
    if (patch.sector !== undefined) set.sector = patch.sector || null;
    if (patch.location !== undefined) set.location = patch.location || null;
    if (patch.website !== undefined) set.website = patch.website || null;
    if (patch.tier !== undefined) set.tier = patch.tier;
    if (patch.notes !== undefined) set.notes = patch.notes || null;
    if (patch.nextActionAt !== undefined) set.nextActionAt = patch.nextActionAt;
    if (patch.archived !== undefined) set.archived = patch.archived;
    if (Object.keys(set).length === 0) return false;
    const result = await this.repo.update({ id }, set);
    return (result.affected ?? 0) > 0;
  }

  public async countByStage(): Promise<Record<string, number>> {
    const rows = await this.repo
      .createQueryBuilder('c')
      .select('c.stage', 'stage')
      .addSelect('COUNT(*)', 'count')
      .where('c.archived = :archived', { archived: false })
      .groupBy('c.stage')
      .getRawMany<{ stage: string; count: string }>();
    const out: Record<string, number> = {};
    for (const r of rows) out[r.stage] = Number(r.count);
    return out;
  }
}
