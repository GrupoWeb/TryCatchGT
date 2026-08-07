import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración baseline de la tabla `services` (prueba de concepto del ORM).
 * Usa CREATE TABLE IF NOT EXISTS para ser idempotente sobre bases ya existentes:
 * en una DB con la tabla creada no cambia nada y solo registra el punto de partida
 * del sistema de migraciones. En una DB nueva, crea la tabla.
 */
export class InitServices1786200000000 implements MigrationInterface {
  name = 'InitServices1786200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(100) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        icon VARCHAR(50) NOT NULL,
        accent_color VARCHAR(50) NOT NULL DEFAULT '#0066FF',
        tags JSON NULL,
        is_featured BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS services');
  }
}
