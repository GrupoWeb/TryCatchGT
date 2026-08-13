import { MigrationInterface, QueryRunner } from 'typeorm';

/** Analítica first-party: tabla de visitas a páginas públicas (page_views). */
export class CreatePageViews1787400000000 implements MigrationInterface {
  name = 'CreatePageViews1787400000000';

  public async up(q: QueryRunner): Promise<void> {
    const tbl = await q.query("SHOW TABLES LIKE 'page_views'");
    if (tbl.length) return;
    await q.query(`
      CREATE TABLE page_views (
        id BIGINT NOT NULL AUTO_INCREMENT,
        path VARCHAR(255) NOT NULL,
        referrer VARCHAR(255) NULL,
        country VARCHAR(2) NULL,
        device VARCHAR(16) NULL,
        browser VARCHAR(40) NULL,
        visitor_hash VARCHAR(64) NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        INDEX IDX_page_views_path (path),
        INDEX IDX_page_views_visitor_hash (visitor_hash),
        INDEX IDX_page_views_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    const tbl = await q.query("SHOW TABLES LIKE 'page_views'");
    if (tbl.length) await q.query('DROP TABLE page_views');
  }
}