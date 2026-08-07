import { SiteConfigRepository } from '../../../application/ports/output/SiteConfigRepository.js';
import { AppDataSource } from './data-source.js';
import { SiteConfigEntity } from './entities/SiteConfigEntity.js';

export class TypeOrmSiteConfigRepository implements SiteConfigRepository {
  private get repo() {
    return AppDataSource.getRepository(SiteConfigEntity);
  }

  public async getAll(): Promise<Record<string, string>> {
    const rows = await this.repo.find();
    const out: Record<string, string> = {};
    for (const row of rows) out[row.configKey] = row.configValue ?? '';
    return out;
  }

  public async setMany(values: Record<string, string>): Promise<void> {
    const entries = Object.entries(values);
    if (!entries.length) return;
    const rows = entries.map(([configKey, configValue]) => ({ configKey, configValue }));
    // Upsert por clave primaria (ON DUPLICATE KEY UPDATE en MySQL).
    await this.repo.upsert(rows, ['configKey']);
  }
}
