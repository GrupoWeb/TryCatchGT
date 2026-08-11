import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fase 4 del CRM: cadencias de seguimiento automático. Crea:
 *  - `crm_cadences`: secuencia con sus pasos embebidos en JSON (`steps_json`).
 *  - `crm_cadence_runs`: inscripción/progreso de cada contacto en una cadencia,
 *    con `next_run_at` para que el scheduler sepa cuándo enviar el siguiente paso.
 *
 * Idempotente (`CREATE TABLE IF NOT EXISTS`); corre sola al arrancar.
 */
export class CreateCrmCadences1787200000000 implements MigrationInterface {
  name = 'CreateCrmCadences1787200000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS crm_cadences (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(160) NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        steps_json TEXT NOT NULL,
        created_by INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await q.query(`
      CREATE TABLE IF NOT EXISTS crm_cadence_runs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cadence_id INT NOT NULL,
        contact_id INT NOT NULL,
        current_step INT NOT NULL DEFAULT 0,
        status ENUM('active','completed','stopped') NOT NULL DEFAULT 'active',
        next_run_at DATETIME NULL,
        last_sent_at DATETIME NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_crm_cadence_runs_pair (cadence_id, contact_id),
        KEY idx_crm_cadence_runs_contact (contact_id),
        KEY idx_crm_cadence_runs_status (status),
        KEY idx_crm_cadence_runs_next (next_run_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE IF EXISTS crm_cadence_runs');
    await q.query('DROP TABLE IF EXISTS crm_cadences');
  }
}
