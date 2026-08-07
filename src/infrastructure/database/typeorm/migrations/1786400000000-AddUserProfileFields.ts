import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega campos de perfil, estado de cuenta y seguridad de acceso a `users`.
 * Idempotente: comprueba en information_schema antes de cada ALTER, por lo que es
 * seguro en bases existentes (no falla si una columna ya está) y en producción.
 */
export class AddUserProfileFields1786400000000 implements MigrationInterface {
  name = 'AddUserProfileFields1786400000000';

  private async hasColumn(q: QueryRunner, column: string): Promise<boolean> {
    const rows = await q.query(
      `SELECT COUNT(*) AS c FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = ?`,
      [column],
    );
    return Number(rows[0].c) > 0;
  }

  private async add(q: QueryRunner, column: string, ddl: string): Promise<void> {
    if (!(await this.hasColumn(q, column))) {
      await q.query(`ALTER TABLE users ADD COLUMN ${ddl}`);
    }
  }

  public async up(q: QueryRunner): Promise<void> {
    await this.add(q, 'full_name', 'full_name VARCHAR(150) NULL');
    await this.add(q, 'last_name', 'last_name VARCHAR(150) NULL');
    await this.add(q, 'display_name', 'display_name VARCHAR(150) NULL');
    await this.add(q, 'status', "status ENUM('active','disabled','invited') NOT NULL DEFAULT 'active'");
    await this.add(q, 'is_active', 'is_active BOOLEAN NOT NULL DEFAULT TRUE');
    await this.add(q, 'must_change_password', 'must_change_password BOOLEAN NOT NULL DEFAULT FALSE');
    await this.add(q, 'email_verified_at', 'email_verified_at DATETIME NULL');
    await this.add(q, 'last_login_at', 'last_login_at DATETIME NULL');
    await this.add(q, 'last_login_ip', 'last_login_ip VARCHAR(64) NULL');
    await this.add(q, 'password_changed_at', 'password_changed_at DATETIME NULL');
    await this.add(q, 'failed_login_attempts', 'failed_login_attempts INT NOT NULL DEFAULT 0');
    await this.add(q, 'locked_until', 'locked_until DATETIME NULL');
    await this.add(q, 'created_by', 'created_by INT NULL');
    await this.add(q, 'updated_at', 'updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    await this.add(q, 'deleted_at', 'deleted_at DATETIME NULL');
  }

  public async down(q: QueryRunner): Promise<void> {
    const cols = [
      'deleted_at', 'updated_at', 'created_by', 'locked_until', 'failed_login_attempts',
      'password_changed_at', 'last_login_ip', 'last_login_at', 'email_verified_at',
      'must_change_password', 'is_active', 'status', 'display_name', 'last_name', 'full_name',
    ];
    for (const col of cols) {
      if (await this.hasColumn(q, col)) await q.query(`ALTER TABLE users DROP COLUMN ${col}`);
    }
  }
}
