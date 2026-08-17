import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Estado publicado/borrador de las muestras. `is_active = 0` deja la muestra en el
 * panel pero hace que `/muestras/<slug>` responda 404 (no se sirve). Las muestras
 * existentes se marcan activas para conservar el comportamiento previo.
 */
export class AddLandingSampleActive1787700000000 implements MigrationInterface {
  name = 'AddLandingSampleActive1787700000000';

  public async up(q: QueryRunner): Promise<void> {
    const cols = await q.query("SHOW COLUMNS FROM landing_samples LIKE 'is_active'");
    if (cols.length) return;
    await q.query('ALTER TABLE landing_samples ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER html');
  }

  public async down(q: QueryRunner): Promise<void> {
    const cols = await q.query("SHOW COLUMNS FROM landing_samples LIKE 'is_active'");
    if (cols.length) await q.query('ALTER TABLE landing_samples DROP COLUMN is_active');
  }
}
