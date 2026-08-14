import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Papelera de la bandeja: columna `deleted_at` en crm_messages (baja lógica). El
 * correo se oculta de la bandeja pero se conserva la fila (y con ella el timeline
 * del contacto). NULL = vigente; con fecha = eliminado.
 */
export class AddCrmMessageDeletedAt1787700000000 implements MigrationInterface {
  name = 'AddCrmMessageDeletedAt1787700000000';

  public async up(q: QueryRunner): Promise<void> {
    const col = await q.query("SHOW COLUMNS FROM crm_messages LIKE 'deleted_at'");
    if (!col.length) {
      await q.query(
        'ALTER TABLE crm_messages ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL AFTER received_at',
      );
      await q.query('CREATE INDEX IDX_crm_messages_deleted_at ON crm_messages (deleted_at)');
    }
  }

  public async down(q: QueryRunner): Promise<void> {
    const idx = await q.query("SHOW INDEX FROM crm_messages WHERE Key_name = 'IDX_crm_messages_deleted_at'");
    if (idx.length) {
      await q.query('DROP INDEX IDX_crm_messages_deleted_at ON crm_messages');
    }
    const col = await q.query("SHOW COLUMNS FROM crm_messages LIKE 'deleted_at'");
    if (col.length) {
      await q.query('ALTER TABLE crm_messages DROP COLUMN deleted_at');
    }
  }
}
