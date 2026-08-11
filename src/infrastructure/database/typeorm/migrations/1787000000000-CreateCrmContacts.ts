import { MigrationInterface, QueryRunner } from 'typeorm';
import { interferContacts } from '../seeds/interferContacts.js';

/**
 * Crea la tabla `crm_contacts` (contactos/prospectos del CRM) e importa los 194
 * MIPYMEs del catálogo INTERFER 2025 como semilla inicial.
 *
 * Idempotente:
 *  - `CREATE TABLE IF NOT EXISTS` no falla si la tabla ya existe.
 *  - La importación usa `INSERT … ON DUPLICATE KEY UPDATE email = email` (no-op)
 *    apoyándose en el índice único de `email`: no duplica ni pisa datos que el
 *    usuario haya editado si por algún motivo se reejecutara.
 * Se ejecuta sola en cada arranque (migrationsRun: true), así el deploy a
 * Hostinger queda con la cartera sembrada sin pasos manuales.
 */
export class CreateCrmContacts1787000000000 implements MigrationInterface {
  name = 'CreateCrmContacts1787000000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS crm_contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        email VARCHAR(190) NOT NULL,
        phone VARCHAR(50) NULL,
        company VARCHAR(200) NULL,
        sector VARCHAR(120) NULL,
        location VARCHAR(160) NULL,
        website VARCHAR(255) NULL,
        source VARCHAR(60) NOT NULL DEFAULT 'manual',
        tier ENUM('alta','media','base') NULL,
        stage ENUM('nuevo','contactado','respondio','reunion','propuesta','ganado','perdido','dormido')
          NOT NULL DEFAULT 'nuevo',
        owner_id INT NULL,
        notes TEXT NULL,
        next_action_at DATETIME NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_crm_contacts_email (email),
        KEY idx_crm_contacts_stage (stage)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    for (const c of interferContacts) {
      await q.query(
        `INSERT INTO crm_contacts (name, email, sector, location, website, tier, notes, source, stage)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'interfer2025', 'nuevo')
         ON DUPLICATE KEY UPDATE email = email`,
        [c.name, c.email, c.sector, c.location, c.website, c.tier, c.notes],
      );
    }
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE IF EXISTS crm_contacts');
  }
}
