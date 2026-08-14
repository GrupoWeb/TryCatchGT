import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Recuperación diferida del cuerpo completo. El webhook de Hostinger entrega el
 * cuerpo recortado (~200 chars) y el completo en una URL temporal (`bodyUrl`).
 * Guardamos esa URL y un flag `body_complete`: si la descarga en el webhook falla,
 * se reintenta al abrir el correo en la bandeja. Los registros previos quedan como
 * completos (DEFAULT 1): no tienen `bodyUrl` y su URL ya habría expirado.
 */
export class AddCrmMessageBodyUrl1787800000000 implements MigrationInterface {
  name = 'AddCrmMessageBodyUrl1787800000000';

  public async up(q: QueryRunner): Promise<void> {
    const url = await q.query("SHOW COLUMNS FROM crm_messages LIKE 'body_url'");
    if (!url.length) {
      await q.query('ALTER TABLE crm_messages ADD COLUMN body_url TEXT NULL DEFAULT NULL AFTER body_html');
    }
    const complete = await q.query("SHOW COLUMNS FROM crm_messages LIKE 'body_complete'");
    if (!complete.length) {
      await q.query('ALTER TABLE crm_messages ADD COLUMN body_complete TINYINT(1) NOT NULL DEFAULT 1 AFTER body_url');
    }
  }

  public async down(q: QueryRunner): Promise<void> {
    const complete = await q.query("SHOW COLUMNS FROM crm_messages LIKE 'body_complete'");
    if (complete.length) {
      await q.query('ALTER TABLE crm_messages DROP COLUMN body_complete');
    }
    const url = await q.query("SHOW COLUMNS FROM crm_messages LIKE 'body_url'");
    if (url.length) {
      await q.query('ALTER TABLE crm_messages DROP COLUMN body_url');
    }
  }
}
