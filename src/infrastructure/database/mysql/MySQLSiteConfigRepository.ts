import { SiteConfigRepository } from '../../../application/ports/output/SiteConfigRepository.js';
import { pool } from './connection.js';
import { RowDataPacket } from 'mysql2';

/**
 * Almacén clave-valor para la configuración del sitio (contacto, WhatsApp…).
 * Degrada a memoria si MySQL no está disponible.
 */
export class MySQLSiteConfigRepository implements SiteConfigRepository {
  private readonly memory: Record<string, string> = {};

  public async getAll(): Promise<Record<string, string>> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>('SELECT config_key, config_value FROM site_config');
      const out: Record<string, string> = {};
      for (const row of rows) out[row.config_key] = row.config_value ?? '';
      return out;
    } catch {
      return { ...this.memory };
    }
  }

  public async setMany(values: Record<string, string>): Promise<void> {
    const entries = Object.entries(values);
    try {
      for (const [key, value] of entries) {
        await pool.execute(
          `INSERT INTO site_config (config_key, config_value) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
          [key, value],
        );
      }
    } catch {
      for (const [key, value] of entries) this.memory[key] = value;
    }
  }
}
