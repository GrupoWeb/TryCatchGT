import { MigrationInterface, QueryRunner } from 'typeorm';

/** Tabla de sesiones por dispositivo (listar y revocar individualmente). */
export class CreateUserSessions1786600000000 implements MigrationInterface {
  name = 'CreateUserSessions1786600000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        sid VARCHAR(64) NOT NULL UNIQUE,
        user_agent VARCHAR(400) NULL,
        ip VARCHAR(64) NULL,
        last_seen_at DATETIME NULL,
        revoked_at DATETIME NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_sessions_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE IF EXISTS user_sessions');
  }
}
