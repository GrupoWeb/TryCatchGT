import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Siembra un kit de prospección para el CRM: 5 plantillas de correo (variables
 * {nombre} {empresa} {sector} {ubicacion} {sitio}) y una cadencia de 3 pasos que
 * las encadena (presentación → recordatorio → cierre).
 *
 * Idempotente por NOMBRE (no por id fijo): así no pisa plantillas/cadencias que el
 * usuario haya creado a mano. Si ya existe una con el mismo nombre, actualiza su
 * contenido; si no, la inserta. Corre sola al arrancar (migrationsRun: true).
 *
 * La firma usa el nombre del remitente y como CTA "responder a este correo" (sin
 * número de WhatsApp para no fijar datos que pueden cambiar); edítalos en el panel.
 */
export class SeedProspectingTemplates1787500000000 implements MigrationInterface {
  name = 'SeedProspectingTemplates1787500000000';

  public async up(q: QueryRunner): Promise<void> {
    const sign = (extra = true) =>
      `<p>Saludos,<br>Juan José Jolón Granados — <strong>TryCatch GT</strong>` +
      `<br>WhatsApp: <a href="https://wa.me/50255349970" rel="noopener noreferrer nofollow" target="_blank">+502 5534-9970</a>` +
      (extra ? `<br><a href="https://trycatchgt.org" rel="noopener noreferrer nofollow" target="_blank">trycatchgt.org</a>` : '') +
      `</p>`;

    const templates: Array<{ key: string; name: string; subject: string; segment: string; body: string }> = [
      {
        key: 'sin-web',
        name: 'Prospección · Sin sitio web',
        subject: '{nombre}, una idea para {empresa}',
        segment: 'sin-web',
        body:
          `<p>Hola {nombre},</p>` +
          `<p>Soy Juan José Jolón Granados, de <strong>TryCatch GT</strong>, un estudio de software aquí en Guatemala.</p>` +
          `<p>Vi que {empresa} aún no tiene sitio web y por eso te escribo: hoy la mayoría de personas busca en Google antes de decidir, y sin una página tu negocio de {sector} queda invisible frente a la competencia que sí aparece.</p>` +
          `<p>Ayudamos a negocios como el tuyo en {ubicacion} a tener una presencia profesional que <strong>genera confianza y clientes</strong>, sin tecnicismos y con un costo pensado para MIPYMEs.</p>` +
          `<p>¿Te parece si te muestro en 15 minutos cómo se vería? Sin compromiso: solo respóndeme a este correo.</p>` +
          sign(),
      },
      {
        key: 'mejorar',
        name: 'Prospección · Mejorar presencia',
        subject: 'Una idea para {empresa}',
        segment: 'all',
        body:
          `<p>Hola {nombre},</p>` +
          `<p>Le eché un vistazo a {empresa} y me gustó lo que hacen en {sector}. Te escribo con una idea concreta.</p>` +
          `<p>Muchos negocios en {ubicacion} pierden clientes no por su producto, sino porque su web carga lento, no se ve bien en el celular o no aparece en Google. Eso se arregla y se nota en ventas.</p>` +
          `<p>En <strong>TryCatch GT</strong> hacemos justo eso: sitios rápidos, modernos y que traen clientes.</p>` +
          `<p>¿Te comparto en 15 minutos 2 o 3 mejoras específicas para {empresa}? Sin compromiso: respóndeme a este correo.</p>` +
          sign(),
      },
      {
        key: 'presentacion',
        name: 'Prospección · Presentación',
        subject: 'Una idea para {empresa}',
        segment: 'all',
        body:
          `<p>Hola {nombre},</p>` +
          `<p>Soy Juan José Jolón Granados, de <strong>TryCatch GT</strong>, estudio de software en Guatemala. Me encontré con {empresa} y me llamó la atención lo que hacen en {sector}.</p>` +
          `<p>Ayudamos a negocios de {ubicacion} a conseguir más clientes por internet: una web profesional, aparecer en Google y procesos digitales que ahorran tiempo.</p>` +
          `<p>¿Te muestro en 15 minutos una idea concreta para {empresa}? Sin compromiso: respóndeme a este correo y coordinamos.</p>` +
          sign(),
      },
      {
        key: 'recordatorio',
        name: 'Seguimiento · Recordatorio',
        subject: '¿Lo viste, {nombre}?',
        segment: 'all',
        body:
          `<p>Hola {nombre},</p>` +
          `<p>Te escribí hace unos días con una idea para mejorar la presencia de {empresa} en internet. Sé que el día a día no deja tiempo, así que te lo dejo fácil.</p>` +
          `<p>Con responder <strong>"me interesa"</strong> a este correo, te preparo una propuesta corta y sin costo para {empresa}.</p>` +
          sign(false),
      },
      {
        key: 'cierre',
        name: 'Seguimiento · Cierre',
        subject: '¿Lo dejamos para más adelante?',
        segment: 'all',
        body:
          `<p>Hola {nombre},</p>` +
          `<p>No quiero llenarte la bandeja, así que este es mi último correo por ahora.</p>` +
          `<p>Si en algún momento {empresa} quiere una web que traiga clientes o digitalizar algún proceso, aquí estaré. Guarda mi correo y escríbeme cuando sea buen momento.</p>` +
          `<p>¡Mucho éxito con {empresa}!</p>` +
          sign(),
      },
    ];

    const idByKey: Record<string, number> = {};
    for (const t of templates) {
      idByKey[t.key] = await this.ensureTemplate(q, t.name, t.subject, t.body, t.segment);
    }

    // Cadencia de 3 pasos: presentación (día 0) → recordatorio (día 3) → cierre (día 7).
    const steps = [
      { delayDays: 0, templateId: idByKey['presentacion'] },
      { delayDays: 3, templateId: idByKey['recordatorio'] },
      { delayDays: 7, templateId: idByKey['cierre'] },
    ];
    await this.ensureCadence(q, 'Prospección MIPYME (3 pasos)', JSON.stringify(steps));
  }

  /** Inserta la plantilla si no existe (por nombre) o actualiza su contenido; devuelve su id. */
  private async ensureTemplate(q: QueryRunner, name: string, subject: string, body: string, segment: string): Promise<number> {
    const found = await q.query('SELECT id FROM crm_templates WHERE name = ? LIMIT 1', [name]);
    if (found.length) {
      await q.query('UPDATE crm_templates SET subject = ?, body_html = ?, segment = ? WHERE id = ?', [subject, body, segment, found[0].id]);
      return Number(found[0].id);
    }
    await q.query('INSERT INTO crm_templates (name, subject, body_html, segment) VALUES (?, ?, ?, ?)', [name, subject, body, segment]);
    const row = await q.query('SELECT id FROM crm_templates WHERE name = ? ORDER BY id DESC LIMIT 1', [name]);
    return Number(row[0].id);
  }

  /** Inserta la cadencia si no existe (por nombre) o actualiza sus pasos. */
  private async ensureCadence(q: QueryRunner, name: string, stepsJson: string): Promise<void> {
    const found = await q.query('SELECT id FROM crm_cadences WHERE name = ? LIMIT 1', [name]);
    if (found.length) {
      await q.query('UPDATE crm_cadences SET steps_json = ?, is_active = 1 WHERE id = ?', [stepsJson, found[0].id]);
      return;
    }
    await q.query('INSERT INTO crm_cadences (name, is_active, steps_json) VALUES (?, 1, ?)', [name, stepsJson]);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query("DELETE FROM crm_cadences WHERE name = 'Prospección MIPYME (3 pasos)'");
    await q.query(
      "DELETE FROM crm_templates WHERE name IN ('Prospección · Sin sitio web','Prospección · Mejorar presencia','Prospección · Presentación','Seguimiento · Recordatorio','Seguimiento · Cierre')",
    );
  }
}
