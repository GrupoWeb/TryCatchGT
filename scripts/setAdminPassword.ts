/**
 * Crea o actualiza la contraseña del usuario admin.
 *
 *   npm run set-admin-password              → usa ADMIN_USER/ADMIN_PASSWORD del .env
 *   npm run set-admin-password -- "NuevaClave"  → usa la clave pasada por argumento
 *
 * Útil porque el sembrado automático solo corre cuando la tabla users está vacía;
 * este script permite cambiar la clave en cualquier momento.
 */
import mysql from 'mysql2/promise';
import { env } from '../src/config/env.js';
import { BcryptPasswordHasher } from '../src/infrastructure/security/BcryptPasswordHasher.js';

async function main(): Promise<void> {
  const username = env.admin.user.trim().toLowerCase();
  const password = process.argv[2] ?? env.admin.password;

  if (!password || password.length < 6) {
    console.error('❌ La contraseña debe tener al menos 6 caracteres.');
    process.exit(1);
  }

  const passwordHash = await new BcryptPasswordHasher().hash(password);

  const conn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.name,
  });

  const [result] = await conn.execute(
    `INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    [username, passwordHash],
  );
  await conn.end();

  const created = (result as mysql.ResultSetHeader).affectedRows === 1;
  console.log(`✅ Contraseña ${created ? 'establecida (usuario creado)' : 'actualizada'} para "${username}".`);
}

main().catch((error) => {
  console.error('❌ Error:', (error as Error).message);
  process.exit(1);
});
