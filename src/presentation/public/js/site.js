/* ============================================================
   TryCatch GT — Footer y botón flotante de WhatsApp compartidos.
   Se inyectan en <footer id="site-footer"> de cada página y toman
   los datos de contacto desde /api/config.
   ============================================================ */

(() => {
  'use strict';

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function loadConfig() {
    try {
      const res = await fetch('/api/config');
      const payload = await res.json();
      return payload.success ? payload.data : null;
    } catch (_) {
      return null;
    }
  }

  function renderFooter(cfg) {
    const footer = document.getElementById('site-footer');
    if (!footer) return;

    const email = cfg && cfg.contactEmail ? cfg.contactEmail : '';
    const wa = cfg && cfg.whatsappLink ? cfg.whatsappLink : '';
    const year = new Date().getFullYear();

    const contactLinks = [
      email ? `<a href="mailto:${esc(email)}">${esc(email)}</a>` : '',
      wa ? `<a href="${esc(wa)}" target="_blank" rel="noopener">WhatsApp</a>` : '',
    ].join('');

    footer.innerHTML = `
      <div class="wrap footer__grid">
        <div class="footer__brand">
          <div class="footer__logo">TryCatch<span>GT</span></div>
          <p>Estudio de ingeniería de software y desarrollo de aplicaciones a medida. Hecho en Guatemala 🇬🇹</p>
        </div>
        <div class="footer__col">
          <h4>Navegación</h4>
          <a href="/#services">Servicios</a>
          <a href="/#pricing">Planes</a>
          <a href="/blog">Blog</a>
          <a href="/#quote">Cotizar</a>
        </div>
        <div class="footer__col">
          <h4>Contacto</h4>
          ${contactLinks || '<span class="footer__muted">Próximamente</span>'}
        </div>
        <div class="footer__col">
          <h4>Legal</h4>
          <a href="/privacidad">Privacidad</a>
          <a href="/terminos">Términos</a>
          <a href="/cookies">Cookies</a>
        </div>
      </div>
      <div class="footer__bottom">
        <div class="wrap">© ${year} TryCatch GT · Todos los derechos reservados</div>
      </div>`;
  }

  function renderWhatsAppFab(cfg) {
    if (!cfg || !cfg.whatsappLink || document.getElementById('wa-fab')) return;
    const a = document.createElement('a');
    a.id = 'wa-fab';
    a.className = 'wa-fab';
    a.href = cfg.whatsappLink;
    a.target = '_blank';
    a.rel = 'noopener';
    a.setAttribute('aria-label', 'Escríbenos por WhatsApp');
    a.innerHTML =
      '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">' +
      '<path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.477-.955zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.767.967-.94 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>' +
      '</svg>';
    document.body.appendChild(a);
  }

  /* ----------------------------------------------------------
     Menú móvil (hamburguesa). El navbar se comparte entre
     index, blog y post, así que la lógica vive aquí.
  ---------------------------------------------------------- */
  function initMobileNav() {
    const navbar = document.querySelector('.navbar');
    const burger = document.getElementById('nav-burger');
    const menu = document.getElementById('nav-menu');
    if (!navbar || !burger || !menu) return;

    const close = () => {
      navbar.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    };

    burger.addEventListener('click', () => {
      const open = navbar.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(open));
    });

    // Al tocar un enlace del menú, se cierra.
    menu.addEventListener('click', (e) => {
      if (e.target.closest('a')) close();
    });

    // Cerrar con Escape o al tocar fuera del navbar.
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
    document.addEventListener('click', (e) => {
      if (navbar.classList.contains('is-open') && !navbar.contains(e.target)) close();
    });
  }

  initMobileNav();

  loadConfig().then((cfg) => {
    renderFooter(cfg);
    renderWhatsAppFab(cfg);
  });
})();
