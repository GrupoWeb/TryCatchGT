import mysql from 'mysql2/promise';
import { env } from '../../../config/env.js';

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function testConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conexión con MySQL establecida correctamente.');
    connection.release();
    return true;
  } catch (error) {
    console.warn('⚠️  No se pudo conectar a MySQL (modo fallback memoria activo):', (error as Error).message);
    return false;
  }
}
