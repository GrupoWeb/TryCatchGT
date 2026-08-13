import { PageViewRepository, PageViewEntry, AnalyticsSummary } from '../../../application/ports/output/PageViewRepository.js';
import { AppDataSource } from './data-source.js';
import { PageViewEntity } from './entities/PageViewEntity.js';

export class TypeOrmPageViewRepository implements PageViewRepository {
  private get repo() {
    return AppDataSource.getRepository(PageViewEntity);
  }

  public async record(view: PageViewEntry): Promise<void> {
    await this.repo.insert({
      path: view.path.slice(0, 255),
      referrer: view.referrer ? view.referrer.slice(0, 255) : null,
      country: view.country ? view.country.slice(0, 2) : null,
      device: view.device ?? null,
      browser: view.browser ? view.browser.slice(0, 40) : null,
      visitorHash: view.visitorHash ?? null,
    });
  }

  public async summary(days: number): Promise<AnalyticsSummary> {
    const safeDays = Math.min(Math.max(1, Math.floor(days) || 30), 365);
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (safeDays - 1));

    const base = () =>
      this.repo.createQueryBuilder('v').where('v.created_at >= :since', { since });

    const [totalViews, uniqueRow, dayRows, pageRows, referrerRows, countryRows, deviceRows] = await Promise.all([
      base().getCount(),
      base().select('COUNT(DISTINCT v.visitor_hash)', 'n').getRawOne<{ n: string }>(),
      base()
        .select('DATE(v.created_at)', 'day')
        .addSelect('COUNT(*)', 'count')
        .groupBy('day')
        .orderBy('day', 'ASC')
        .getRawMany<{ day: string; count: string }>(),
      base()
        .select('v.path', 'path')
        .addSelect('COUNT(*)', 'count')
        .groupBy('v.path')
        .orderBy('count', 'DESC')
        .limit(10)
        .getRawMany<{ path: string; count: string }>(),
      base()
        .select('v.referrer', 'referrer')
        .addSelect('COUNT(*)', 'count')
        .where('v.created_at >= :since AND v.referrer IS NOT NULL', { since })
        .groupBy('v.referrer')
        .orderBy('count', 'DESC')
        .limit(10)
        .getRawMany<{ referrer: string; count: string }>(),
      base()
        .select('v.country', 'country')
        .addSelect('COUNT(*)', 'count')
        .where('v.created_at >= :since AND v.country IS NOT NULL', { since })
        .groupBy('v.country')
        .orderBy('count', 'DESC')
        .limit(10)
        .getRawMany<{ country: string; count: string }>(),
      base()
        .select('v.device', 'device')
        .addSelect('COUNT(*)', 'count')
        .where('v.created_at >= :since AND v.device IS NOT NULL', { since })
        .groupBy('v.device')
        .orderBy('count', 'DESC')
        .getRawMany<{ device: string; count: string }>(),
    ]);

    return {
      days: safeDays,
      totalViews,
      uniqueVisitors: Number(uniqueRow?.n ?? 0),
      viewsByDay: buildDailySeries(dayRows, safeDays),
      topPages: pageRows.map((r) => ({ path: r.path, count: Number(r.count) })),
      topReferrers: referrerRows.map((r) => ({ referrer: r.referrer, count: Number(r.count) })),
      byCountry: countryRows.map((r) => ({ country: r.country, count: Number(r.count) })),
      byDevice: deviceRows.map((r) => ({ device: r.device, count: Number(r.count) })),
    };
  }
}

/**
 * Rellena la serie diaria completa (incluidos los días sin visitas, con 0) para los
 * últimos `days` días, ordenada cronológicamente y lista para graficar. El driver de
 * MySQL devuelve DATE(...) como cadena 'YYYY-MM-DD' o como Date; se normaliza a clave.
 */
function buildDailySeries(rows: Array<{ day: unknown; count: string }>, days: number): Array<{ day: string; count: number }> {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(dayKey(r.day), Number(r.count));

  const out: Array<{ day: string; count: number }> = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const key = dayKey(cursor);
    out.push({ day: key, count: counts.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function dayKey(value: unknown): string {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  // Cadena 'YYYY-MM-DD' (posiblemente con hora): nos quedamos con la parte de fecha.
  return String(value).slice(0, 10);
}