import { MigrationInterface, QueryRunner } from 'typeorm';

/** Tabla de imágenes (avatares, portadas del blog) almacenadas en la BD. */
export class CreateMedia1786800000000 implements MigrationInterface {
  name = 'CreateMedia1786800000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS media (
        id INT AUTO_INCREMENT PRIMARY KEY,
        mime VARCHAR(32) NOT NULL,
        size INT NOT NULL,
        data MEDIUMBLOB NOT NULL,
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE IF EXISTS media');
  }
}
