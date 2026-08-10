import { MigrationInterface, QueryRunner } from 'typeorm';

/** Punto de enfoque de la foto de perfil (background-position), para reposicionarla. */
export class AddAvatarPosition1786900000000 implements MigrationInterface {
  name = 'AddAvatarPosition1786900000000';

  public async up(q: QueryRunner): Promise<void> {
    const col = await q.query("SHOW COLUMNS FROM users LIKE 'avatar_position'");
    if (!col.length) {
      await q.query("ALTER TABLE users ADD COLUMN avatar_position VARCHAR(20) NULL AFTER avatar");
    }
  }

  public async down(q: QueryRunner): Promise<void> {
    const col = await q.query("SHOW COLUMNS FROM users LIKE 'avatar_position'");
    if (col.length) {
      await q.query('ALTER TABLE users DROP COLUMN avatar_position');
    }
  }
}
