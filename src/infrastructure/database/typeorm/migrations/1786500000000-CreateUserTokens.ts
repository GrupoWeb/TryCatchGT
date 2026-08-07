import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tabla de tokens de un solo uso (verificación de correo y recuperación de
 * contraseña). Idempotente con CREATE TABLE IF NOT EXISTS.
 */
export class CreateUserTokens1786500000000 implements MigrationInterface {
  name = 'CreateUserTokens1786500000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS user_tokens (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        purpose ENUM('email_verify', 'password_reset') NOT NULL,
        token_hash VARCHAR(64) NOT NULL,
        expires_at DATETIME NOT NULL,
        used_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_tokens_hash (token_hash),
        INDEX idx_user_tokens_user (user_id, purpose)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE IF EXISTS user_tokens');
  }
}
