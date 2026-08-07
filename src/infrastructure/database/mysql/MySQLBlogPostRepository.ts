import { BlogPostRepository } from '../../../application/ports/output/BlogPostRepository.js';
import { BlogPost } from '../../../domain/entities/BlogPost.js';
import { pool } from './connection.js';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

const AUTHOR = 'Juan José Jolón Granados';

// Artículos de arranque (también sembrados en schema.sql). Se usan como store
// en memoria cuando MySQL no está disponible.
const DEFAULT_POSTS: BlogPost[] = [
  new BlogPost({
    id: 1,
    slug: 'ciberseguridad-en-wordpress',
    title: 'Ciberseguridad en WordPress: Amenazas, Buenas Prácticas y Mantenimiento Proactivo',
    category: 'Technology',
    author: AUTHOR,
    coverImage: '',
    status: 'published',
    publishedAt: new Date('2026-03-18T10:00:00Z'),
    createdAt: new Date('2026-03-18T10:00:00Z'),
    excerpt:
      'Las amenazas a sitios WordPress crecen cada año. Repasamos los vectores de ataque más comunes y las prácticas de mantenimiento proactivo que mantienen tu sitio seguro.',
    content:
      '<p>WordPress impulsa una enorme parte de la web, y esa popularidad lo convierte en un objetivo constante. Los ataques más comunes explotan plugins desactualizados, contraseñas débiles y configuraciones por defecto.</p>' +
      '<h2>Amenazas frecuentes</h2>' +
      '<p>Inyección SQL, fuerza bruta al login, malware inyectado por plugins comprometidos y ataques XSS son el pan de cada día. La mayoría se previenen con higiene básica: actualizaciones, backups y monitoreo.</p>' +
      '<h2>Mantenimiento proactivo</h2>' +
      '<p>Un plan de mantenimiento proactivo incluye actualizaciones controladas, respaldos automáticos, escaneo de malware y un firewall de aplicaciones (WAF). Prevenir siempre cuesta menos que recuperar.</p>',
  }),
  new BlogPost({
    id: 2,
    slug: 'ciberseguridad-para-audiencias-latinoamericanas',
    title: 'La Importancia de la Ciberseguridad en el Mantenimiento de WordPress para Audiencias Latinoamericanas',
    category: 'Technology',
    author: AUTHOR,
    coverImage: '',
    status: 'published',
    publishedAt: new Date('2026-03-18T09:00:00Z'),
    createdAt: new Date('2026-03-18T09:00:00Z'),
    excerpt:
      'La ciberseguridad es el conjunto de prácticas y tecnologías diseñadas para proteger sistemas, redes y datos. Por qué importa especialmente para negocios en Latinoamérica.',
    content:
      '<p>La ciberseguridad es el conjunto de prácticas y tecnologías diseñadas para proteger sistemas, redes y datos frente a accesos no autorizados y ataques maliciosos.</p>' +
      '<p>En Latinoamérica, la adopción digital de las PYMEs crece más rápido que su madurez en seguridad, lo que abre una brecha que los atacantes aprovechan. Invertir en mantenimiento seguro no es un lujo, es continuidad de negocio.</p>' +
      '<h2>Primeros pasos</h2>' +
      '<p>Autenticación robusta, copias de seguridad verificadas y actualizaciones periódicas forman la base. A partir de ahí se construyen capas adicionales según el riesgo de cada negocio.</p>',
  }),
  new BlogPost({
    id: 3,
    slug: 'mantenimiento-profesional-wordpress',
    title: 'Mantenimiento Profesional para tu Sitio WordPress',
    category: 'WordPress Maintenance',
    author: AUTHOR,
    coverImage: '',
    status: 'published',
    publishedAt: new Date('2026-03-14T09:00:00Z'),
    createdAt: new Date('2026-03-14T09:00:00Z'),
    excerpt:
      'La seguridad web es un aspecto fundamental para cualquier negocio con presencia online. Qué incluye un servicio de mantenimiento profesional y por qué vale la pena.',
    content:
      '<p>La seguridad web es un aspecto fundamental para cualquier negocio con presencia online. Un sitio caído o comprometido se traduce en pérdida de ventas y de confianza.</p>' +
      '<p>El mantenimiento profesional cubre actualizaciones, monitoreo de disponibilidad, respaldos, optimización de rendimiento y soporte ante incidentes. Todo para que tú te enfoques en tu negocio, no en apagar incendios.</p>',
  }),
];

export class MySQLBlogPostRepository implements BlogPostRepository {
  private readonly memoryStore: BlogPost[] = DEFAULT_POSTS.map((p) => p);
  private memorySequence = DEFAULT_POSTS.length + 1;

  public async findPublished(category?: string): Promise<BlogPost[]> {
    const cat = category && category.toLowerCase() !== 'all' ? category : undefined;
    try {
      let sql = "SELECT * FROM blog_posts WHERE status = 'published'";
      const params: unknown[] = [];
      if (cat) {
        sql += ' AND category = ?';
        params.push(cat);
      }
      sql += ' ORDER BY published_at DESC, id DESC';
      const [rows] = await pool.query<RowDataPacket[]>(sql, params);
      return rows.map((row) => this.mapRow(row));
    } catch {
      return this.memoryStore
        .filter((p) => p.status === 'published' && (!cat || p.category === cat))
        .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));
    }
  }

  public async findAll(): Promise<BlogPost[]> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM blog_posts ORDER BY updated_at DESC, id DESC',
      );
      return rows.map((row) => this.mapRow(row));
    } catch {
      return [...this.memoryStore].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }
  }

  public async findBySlug(slug: string): Promise<BlogPost | null> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM blog_posts WHERE slug = ? LIMIT 1',
        [slug],
      );
      return rows.length > 0 ? this.mapRow(rows[0]) : null;
    } catch {
      return this.memoryStore.find((p) => p.slug === slug) ?? null;
    }
  }

  public async findById(id: number): Promise<BlogPost | null> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM blog_posts WHERE id = ? LIMIT 1',
        [id],
      );
      return rows.length > 0 ? this.mapRow(rows[0]) : null;
    } catch {
      return this.memoryStore.find((p) => p.id === id) ?? null;
    }
  }

  public async save(post: BlogPost): Promise<BlogPost> {
    try {
      if (post.id) {
        await pool.execute<ResultSetHeader>(
          `UPDATE blog_posts SET slug=?, title=?, excerpt=?, content=?, category=?, author=?,
             cover_image=?, cover_position=?, reading_time=?, status=?, published_at=?, updated_at=?
           WHERE id=?`,
          [
            post.slug, post.title, post.excerpt, post.content, post.category, post.author,
            post.coverImage || null, post.coverPosition, post.readingTime, post.status, post.publishedAt,
            post.updatedAt, post.id,
          ],
        );
        return post;
      }
      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO blog_posts
           (slug, title, excerpt, content, category, author, cover_image, cover_position, reading_time, status, published_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          post.slug, post.title, post.excerpt, post.content, post.category, post.author,
          post.coverImage || null, post.coverPosition, post.readingTime, post.status, post.publishedAt,
          post.createdAt, post.updatedAt,
        ],
      );
      return new BlogPost({ ...this.toProps(post), id: result.insertId });
    } catch (error) {
      console.warn('⚠️  No se pudo escribir el artículo en MySQL, usando memoria:', (error as Error).message);
      return this.saveInMemory(post);
    }
  }

  public async delete(id: number): Promise<boolean> {
    try {
      const [result] = await pool.execute<ResultSetHeader>('DELETE FROM blog_posts WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch {
      const idx = this.memoryStore.findIndex((p) => p.id === id);
      if (idx === -1) return false;
      this.memoryStore.splice(idx, 1);
      return true;
    }
  }

  private saveInMemory(post: BlogPost): BlogPost {
    if (post.id) {
      const idx = this.memoryStore.findIndex((p) => p.id === post.id);
      if (idx !== -1) {
        this.memoryStore[idx] = post;
        return post;
      }
    }
    const stored = new BlogPost({ ...this.toProps(post), id: this.memorySequence++ });
    this.memoryStore.push(stored);
    return stored;
  }

  private toProps(post: BlogPost) {
    return {
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      category: post.category,
      author: post.author,
      coverImage: post.coverImage,
      coverPosition: post.coverPosition,
      readingTime: post.readingTime,
      status: post.status,
      publishedAt: post.publishedAt,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }

  private mapRow(row: RowDataPacket): BlogPost {
    return new BlogPost({
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt ?? undefined,
      content: row.content,
      category: row.category,
      author: row.author,
      coverImage: row.cover_image ?? undefined,
      coverPosition: row.cover_position ?? undefined,
      readingTime: Number(row.reading_time) || undefined,
      status: row.status,
      publishedAt: row.published_at ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
