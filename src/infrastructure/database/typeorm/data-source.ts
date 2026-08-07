import 'reflect-metadata';
import { DataSource } from 'typeorm';
import path from 'node:path';
import { env } from '../../../config/env.js';
import { ServiceEntity } from './entities/ServiceEntity.js';

// Las migraciones solo las carga el CLI (npm run migration:*), que se ejecuta con
// tsx desde la raíz del proyecto; por eso la ruta se resuelve contra el árbol de
// fuentes. En tiempo de app no se auto-ejecutan (migrationsRun no está activo).
const migrationsGlob = path.join(process.cwd(), 'src', 'infrastructure', 'database', 'typeorm', 'migrations', '*.{ts,js}');

/**
 * Fuente de datos de TypeORM (prueba de concepto del ORM). Convive con el pool
 * mysql2 legado mientras se migran los demás repositorios. `synchronize: false`:
 * el esquema se gestiona SOLO con migraciones versionadas.
 */
export const AppDataSource = new DataSource({
  type: 'mysql',
  host: env.db.host,
  port: env.db.port,
  username: env.db.user,
  password: env.db.password,
  database: env.db.name,
  entities: [ServiceEntity],
  migrations: [migrationsGlob],
  synchronize: false,
  logging: false,
});
