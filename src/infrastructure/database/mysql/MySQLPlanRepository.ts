import { PlanRepository } from '../../../application/ports/output/PlanRepository.js';
import { Plan } from '../../../domain/entities/Plan.js';
import { pool } from './connection.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

/** Normaliza una columna JSON de MySQL (string o array) a string[]. */
function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

const DEFAULT_PLANS: Plan[] = [
  new Plan({
    id: 1,
    slug: 'esencial',
    name: 'Esencial',
    tagline: 'Para mantener tu producto vivo y con mejoras constantes.',
    priceMonthly: 399,
    priceMonthlyGtq: 2999,
    currency: 'USD',
    features: [
      '20 horas de desarrollo al mes',
      'Corrección de bugs y ajustes pequeños',
      'Pruebas manuales antes de cada entrega',
      '1 reunión de seguimiento al mes',
      'Soporte por correo (respuesta en 48 h)',
    ],
    services: ['Web', 'APIs'],
    accentColor: '#06B6D4',
    ctaLabel: 'Empezar con Esencial',
    isPopular: false,
  }),
  new Plan({
    id: 2,
    slug: 'impulso',
    name: 'Impulso',
    tagline: 'Ritmo constante de nuevas funcionalidades para tu producto.',
    priceMonthly: 999,
    priceMonthlyGtq: 7499,
    currency: 'USD',
    features: [
      '60 horas de desarrollo al mes',
      'Nuevas funcionalidades + mantenimiento',
      'Interfaces limpias con librerías de componentes',
      'Despliegue a producción incluido',
      'Reunión de seguimiento quincenal',
      'Soporte prioritario (respuesta en 24 h)',
    ],
    services: ['Web', 'Móvil', 'APIs'],
    accentColor: '#8B5CF6',
    ctaLabel: 'Elegir Impulso',
    isPopular: true,
  }),
  new Plan({
    id: 3,
    slug: 'dedicado',
    name: 'Dedicado',
    tagline: 'Dedicación casi a tiempo completo, enfocada en un solo proyecto.',
    priceMonthly: 1899,
    priceMonthlyGtq: 13999,
    currency: 'USD',
    features: [
      '120 horas de desarrollo al mes',
      'Un cliente prioritario a la vez',
      'Desarrollo full-stack de punta a punta',
      'Configuración de despliegue y hosting',
      'Reunión de seguimiento semanal',
      'Soporte prioritario (respuesta el mismo día)',
    ],
    services: ['Web', 'Móvil', 'APIs', 'Cloud'],
    accentColor: '#EC4899',
    ctaLabel: 'Hablar de Dedicado',
    isPopular: false,
  }),
];

export class MySQLPlanRepository implements PlanRepository {
  public async findAll(): Promise<Plan[]> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM plans ORDER BY price_monthly ASC');
      if (rows.length === 0) return DEFAULT_PLANS;

      return rows.map((row) => {
        const features = parseJsonArray(row.features);
        const services = parseJsonArray(row.services);

        return new Plan({
          id: row.id,
          slug: row.slug,
          name: row.name,
          tagline: row.tagline,
          priceMonthly: Number(row.price_monthly),
          priceMonthlyGtq: Number(row.price_monthly_gtq),
          currency: row.currency,
          features,
          services,
          accentColor: row.accent_color,
          ctaLabel: row.cta_label,
          isPopular: Boolean(row.is_popular),
        });
      });
    } catch {
      // Fallback a los planes por defecto si MySQL aún no tiene la tabla
      return DEFAULT_PLANS;
    }
  }

  public async findBySlug(slug: string): Promise<Plan | null> {
    const plans = await this.findAll();
    return plans.find((p) => p.slug === slug) || null;
  }

  public async findById(id: number): Promise<Plan | null> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM plans WHERE id = ? LIMIT 1', [id]);
      if (rows.length === 0) return null;
      const row = rows[0];
      return new Plan({
        id: row.id,
        slug: row.slug,
        name: row.name,
        tagline: row.tagline,
        priceMonthly: Number(row.price_monthly),
        priceMonthlyGtq: Number(row.price_monthly_gtq),
        currency: row.currency,
        features: parseJsonArray(row.features),
        services: parseJsonArray(row.services),
        accentColor: row.accent_color,
        ctaLabel: row.cta_label,
        isPopular: Boolean(row.is_popular),
      });
    } catch {
      return (await this.findAll()).find((p) => p.id === id) ?? null;
    }
  }

  public async save(plan: Plan): Promise<Plan> {
    const features = JSON.stringify(plan.features ?? []);
    const services = JSON.stringify(plan.services ?? []);
    if (plan.id) {
      await pool.execute<ResultSetHeader>(
        `UPDATE plans SET slug=?, name=?, tagline=?, price_monthly=?, price_monthly_gtq=?, currency=?,
           features=?, services=?, accent_color=?, cta_label=?, is_popular=? WHERE id=?`,
        [plan.slug, plan.name, plan.tagline, plan.priceMonthly, plan.priceMonthlyGtq, plan.currency,
         features, services, plan.accentColor, plan.ctaLabel, plan.isPopular, plan.id],
      );
      return plan;
    }
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO plans (slug, name, tagline, price_monthly, price_monthly_gtq, currency, features, services, accent_color, cta_label, is_popular)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [plan.slug, plan.name, plan.tagline, plan.priceMonthly, plan.priceMonthlyGtq, plan.currency,
       features, services, plan.accentColor, plan.ctaLabel, plan.isPopular],
    );
    return new Plan({ ...plan, id: result.insertId });
  }

  public async delete(id: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>('DELETE FROM plans WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}
