import { ServiceRepository } from '../../../application/ports/output/ServiceRepository.js';
import { Service } from '../../../domain/entities/Service.js';
import { pool } from './connection.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const DEFAULT_SERVICES: Service[] = [
  new Service({
    id: 1,
    slug: 'web-custom',
    title: 'Desarrollo Web Custom',
    description: 'Plataformas SaaS, dashboards interactivos y web apps complejas de alto rendimiento.',
    icon: '🌐',
    accentColor: '#0066FF',
    tags: ['React', 'Next.js', 'TypeScript', 'Node.js'],
    isFeatured: true,
  }),
  new Service({
    id: 2,
    slug: 'mobile-apps',
    title: 'Apps Móviles Nativas y Híbridas',
    description: 'Aplicaciones móviles para iOS y Android fluidas, rápidas y conectadas en tiempo real.',
    icon: '📱',
    accentColor: '#8B5CF6',
    tags: ['Flutter', 'React Native', 'Swift', 'Kotlin'],
    isFeatured: true,
  }),
  new Service({
    id: 3,
    slug: 'backend-apis',
    title: 'APIs & Microservicios',
    description: 'Arquitecturas backend distribuidas, escalables y con baja latencia.',
    icon: '⚙️',
    accentColor: '#06B6D4',
    tags: ['Go', 'Node.js', 'Python', 'REST/gRPC'],
    isFeatured: false,
  }),
  new Service({
    id: 4,
    slug: 'cloud-devops',
    title: 'Cloud Infrastructure & DevOps',
    description: 'Automatización de pipelines CI/CD, contenedorización y despliegue robusto en la nube.',
    icon: '☁️',
    accentColor: '#EC4899',
    tags: ['AWS', 'GCP', 'Docker', 'Kubernetes'],
    isFeatured: false,
  }),
];

export class MySQLServiceRepository implements ServiceRepository {
  public async findAll(): Promise<Service[]> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM services ORDER BY id ASC');
      if (rows.length === 0) return DEFAULT_SERVICES;

      return rows.map((row) => {
        let tags: string[] = [];
        if (typeof row.tags === 'string') {
          try { tags = JSON.parse(row.tags); } catch { tags = []; }
        } else if (Array.isArray(row.tags)) {
          tags = row.tags;
        }

        return new Service({
          id: row.id,
          slug: row.slug,
          title: row.title,
          description: row.description,
          icon: row.icon,
          accentColor: row.accent_color,
          tags,
          isFeatured: Boolean(row.is_featured),
        });
      });
    } catch {
      // Fallback a los servicios por defecto si MySQL aún no tiene la tabla
      return DEFAULT_SERVICES;
    }
  }

  public async findBySlug(slug: string): Promise<Service | null> {
    const services = await this.findAll();
    return services.find((s) => s.slug === slug) || null;
  }

  public async findById(id: number): Promise<Service | null> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM services WHERE id = ? LIMIT 1', [id]);
      if (rows.length === 0) return null;
      const row = rows[0];
      return new Service({
        id: row.id,
        slug: row.slug,
        title: row.title,
        description: row.description,
        icon: row.icon,
        accentColor: row.accent_color,
        tags: this.parseTags(row.tags),
        isFeatured: Boolean(row.is_featured),
      });
    } catch {
      return (await this.findAll()).find((s) => s.id === id) ?? null;
    }
  }

  public async save(service: Service): Promise<Service> {
    const tags = JSON.stringify(service.tags ?? []);
    if (service.id) {
      await pool.execute<ResultSetHeader>(
        `UPDATE services SET slug=?, title=?, description=?, icon=?, accent_color=?, tags=?, is_featured=? WHERE id=?`,
        [service.slug, service.title, service.description, service.icon, service.accentColor, tags, service.isFeatured, service.id],
      );
      return service;
    }
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO services (slug, title, description, icon, accent_color, tags, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [service.slug, service.title, service.description, service.icon, service.accentColor, tags, service.isFeatured],
    );
    return new Service({ ...service, id: result.insertId });
  }

  public async delete(id: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>('DELETE FROM services WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  private parseTags(value: unknown): string[] {
    if (Array.isArray(value)) return value as string[];
    if (typeof value === 'string') {
      try { const p = JSON.parse(value); return Array.isArray(p) ? p : []; } catch { return []; }
    }
    return [];
  }
}
