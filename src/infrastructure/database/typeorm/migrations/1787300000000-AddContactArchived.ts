import { MigrationInterface, QueryRunner } from 'typeorm';

/** Baja lógica de contactos: columna archived (se conserva el registro). */
export class AddContactArchived1787300000000 implements MigrationInterface {
  name = 'AddContactArchived1787300000000';

  public async up(q: QueryRunner): Promise<void> {
    const col = await q.query("SHOW COLUMNS FROM crm_contacts LIKE 'archived'");
    if (!col.length) {
      await q.query(
        'ALTER TABLE crm_contacts ADD COLUMN archived TINYINT(1) NOT NULL DEFAULT 0 AFTER next_action_at',
      );
      await q.query('CREATE INDEX IDX_crm_contacts_archived ON crm_contacts (archived)');
    }
  }

  public async down(q: QueryRunner): Promise<void> {
    const idx = await q.query("SHOW INDEX FROM crm_contacts WHERE Key_name = 'IDX_crm_contacts_archived'");
    if (idx.length) {
      await q.query('DROP INDEX IDX_crm_contacts_archived ON crm_contacts');
    }
    const col = await q.query("SHOW COLUMNS FROM crm_contacts LIKE 'archived'");
    if (col.length) {
      await q.query('ALTER TABLE crm_contacts DROP COLUMN archived');
    }
  }
}
