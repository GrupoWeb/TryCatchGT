import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fase 2 del CRM: correo saliente + plantillas. Crea:
 *  - `crm_templates`: plantillas de correo reutilizables (asunto + cuerpo HTML con
 *    variables) segmentables por prioridad/segmento.
 *  - `crm_messages`: timeline de correos por contacto (salientes en Fase 2;
 *    entrantes reservados para Fase 3). `message_id` único para deduplicar.
 *
 * Idempotente (`CREATE TABLE IF NOT EXISTS`): se ejecuta sola en cada arranque
 * (migrationsRun: true), así el deploy a Hostinger no requiere pasos manuales.
 */
export class CreateCrmMailing1787100000000 implements MigrationInterface {
  name = 'CreateCrmMailing1787100000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS crm_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(160) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        body_html TEXT NOT NULL,
        segment ENUM('all','alta','media','base','sin-web') NOT NULL DEFAULT 'all',
        created_by INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await q.query(`
      CREATE TABLE IF NOT EXISTS crm_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contact_id INT NOT NULL,
        direction ENUM('out','in') NOT NULL,
        subject VARCHAR(255) NOT NULL,
        body_html TEXT NULL,
        status ENUM('sent','failed','received','read') NOT NULL,
        message_id VARCHAR(255) NULL,
        in_reply_to VARCHAR(255) NULL,
        thread_id VARCHAR(255) NULL,
        template_id INT NULL,
        sent_at DATETIME NULL,
        received_at DATETIME NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_crm_messages_message_id (message_id),
        KEY idx_crm_messages_contact (contact_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE IF EXISTS crm_messages');
    await q.query('DROP TABLE IF EXISTS crm_templates');
  }
}
