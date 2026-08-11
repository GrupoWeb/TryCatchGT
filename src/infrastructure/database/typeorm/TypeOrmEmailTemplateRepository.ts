import {
  EmailTemplateFilters,
  EmailTemplateRepository,
} from '../../../application/ports/output/EmailTemplateRepository.js';
import { EmailTemplate } from '../../../domain/entities/EmailTemplate.js';
import { AppDataSource } from './data-source.js';
import { EmailTemplateEntity } from './entities/EmailTemplateEntity.js';

function toDomain(e: EmailTemplateEntity): EmailTemplate {
  return new EmailTemplate({
    id: e.id,
    name: e.name,
    subject: e.subject,
    bodyHtml: e.bodyHtml,
    segment: e.segment,
    createdBy: e.createdBy,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  });
}

export class TypeOrmEmailTemplateRepository implements EmailTemplateRepository {
  private get repo() {
    return AppDataSource.getRepository(EmailTemplateEntity);
  }

  public async save(template: EmailTemplate): Promise<EmailTemplate> {
    const entity = this.repo.create({
      name: template.name,
      subject: template.subject,
      bodyHtml: template.bodyHtml,
      segment: template.segment,
      createdBy: template.createdBy,
    });
    return toDomain(await this.repo.save(entity));
  }

  public async update(id: number, template: EmailTemplate): Promise<EmailTemplate | null> {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) return null;
    existing.name = template.name;
    existing.subject = template.subject;
    existing.bodyHtml = template.bodyHtml;
    existing.segment = template.segment;
    return toDomain(await this.repo.save(existing));
  }

  public async findAll(filters: EmailTemplateFilters = {}): Promise<EmailTemplate[]> {
    const where = filters.segment ? { segment: filters.segment } : {};
    const rows = await this.repo.find({ where, order: { updatedAt: 'DESC' } });
    return rows.map(toDomain);
  }

  public async findById(id: number): Promise<EmailTemplate | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? toDomain(row) : null;
  }

  public async delete(id: number): Promise<boolean> {
    const result = await this.repo.delete({ id });
    return (result.affected ?? 0) > 0;
  }
}
