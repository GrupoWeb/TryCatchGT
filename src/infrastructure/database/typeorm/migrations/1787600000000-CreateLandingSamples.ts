import { MigrationInterface, QueryRunner } from 'typeorm';

/** Muestras de landing (páginas HTML servidas en /muestras/<slug>). */
export class CreateLandingSamples1787600000000 implements MigrationInterface {
  name = 'CreateLandingSamples1787600000000';

  public async up(q: QueryRunner): Promise<void> {
    const tbl = await q.query("SHOW TABLES LIKE 'landing_samples'");
    if (tbl.length) return;
    await q.query(`
      CREATE TABLE landing_samples (
        id INT NOT NULL AUTO_INCREMENT,
        slug VARCHAR(120) NOT NULL,
        title VARCHAR(200) NOT NULL,
        html LONGTEXT NOT NULL,
        created_by INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_landing_samples_slug (slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    const tbl = await q.query("SHOW TABLES LIKE 'landing_samples'");
    if (tbl.length) await q.query('DROP TABLE landing_samples');
  }
}
