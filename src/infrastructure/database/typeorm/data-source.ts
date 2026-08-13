import 'reflect-metadata';
import { DataSource } from 'typeorm';
import path from 'node:path';
import { env } from '../../../config/env.js';
import { ServiceEntity } from './entities/ServiceEntity.js';
import { PlanEntity } from './entities/PlanEntity.js';
import { ProjectRequestEntity } from './entities/ProjectRequestEntity.js';
import { BlogPostEntity } from './entities/BlogPostEntity.js';
import { UserEntity } from './entities/UserEntity.js';
import { SiteConfigEntity } from './entities/SiteConfigEntity.js';
import { AuditLogEntity } from './entities/AuditLogEntity.js';
import { UserTokenEntity } from './entities/UserTokenEntity.js';
import { UserSessionEntity } from './entities/UserSessionEntity.js';
import { MediaEntity } from './entities/MediaEntity.js';
import { ContactEntity } from './entities/ContactEntity.js';
import { EmailTemplateEntity } from './entities/EmailTemplateEntity.js';
import { CrmMessageEntity } from './entities/CrmMessageEntity.js';
import { CadenceEntity } from './entities/CadenceEntity.js';
import { CadenceRunEntity } from './entities/CadenceRunEntity.js';
import { PageViewEntity } from './entities/PageViewEntity.js';

// Ruta a las migraciones relativa a ESTE archivo, para que funcione tanto en
// desarrollo/CLI con tsx (resuelve a src/…/*.ts) como en producción con node
// (resuelve a dist/…/*.js). __dirname existe porque el proyecto compila a CommonJS.
const migrationsGlob = path.join(__dirname, 'migrations', '*.{ts,js}');

/**
 * Fuente de datos de TypeORM. `synchronize: false`: el esquema se gestiona SOLO
 * con migraciones versionadas. `migrationsRun: true`: las migraciones pendientes
 * se aplican automáticamente al inicializar la conexión (en cada arranque/deploy),
 * así producción (Hostinger) no requiere un paso manual de migración.
 */
export const AppDataSource = new DataSource({
  type: 'mysql',
  host: env.db.host,
  port: env.db.port,
  username: env.db.user,
  password: env.db.password,
  database: env.db.name,
  entities: [ServiceEntity, PlanEntity, ProjectRequestEntity, BlogPostEntity, UserEntity, SiteConfigEntity, AuditLogEntity, UserTokenEntity, UserSessionEntity, MediaEntity, ContactEntity, EmailTemplateEntity, CrmMessageEntity, CadenceEntity, CadenceRunEntity, PageViewEntity],
  migrations: [migrationsGlob],
  synchronize: false,
  migrationsRun: true,
  // En MySQL el DDL hace commit implícito, lo que rompe la transacción única que
  // TypeORM usa por defecto para las migraciones. 'none' evita ese conflicto.
  migrationsTransactionMode: 'none',
  logging: false,
});
