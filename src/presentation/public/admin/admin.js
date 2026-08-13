/* ============================================================
   Panel administrativo TryCatch GT — multi-sección.
   Sesión por cookie httpOnly (fetch same-origin la envía sola).
   ============================================================ */

(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  // Ruta base del panel (puede ser secreta vía ADMIN_PATH); la inyecta el server.
  const ADMIN_BASE = document.querySelector('meta[name="admin-base"]')?.content || '/admin';

  // Lee la cookie CSRF (double-submit) para reenviarla como header en mutaciones.
  function csrfHeader() {
    const match = document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='));
    return match ? { 'X-CSRF-Token': decodeURIComponent(match.slice('XSRF-TOKEN='.length)) } : {};
  }

  // ── Loader de marca ───────────────────────────────────────
  // Overlay que aparece durante las mutaciones (guardar, eliminar, crear, subir).
  // Ref-count para peticiones concurrentes; un pequeño retardo evita el parpadeo
  // en operaciones instantáneas.
  let loaderCount = 0, loaderTimer = null;
  function showLoader() {
    loaderCount++;
    if (loaderCount === 1 && !loaderTimer) {
      loaderTimer = setTimeout(() => { loaderTimer = null; const el = $('tc-loader'); if (el) el.hidden = false; }, 120);
    }
  }
  function hideLoader() {
    loaderCount = Math.max(0, loaderCount - 1);
    if (loaderCount === 0) {
      if (loaderTimer) { clearTimeout(loaderTimer); loaderTimer = null; }
      const el = $('tc-loader'); if (el) el.hidden = true;
    }
  }
  // Envuelve una promesa mostrando el loader mientras dura (para subidas u otras
  // acciones que no pasan por api()).
  async function withLoader(promise) {
    showLoader();
    try { return await promise; } finally { hideLoader(); }
  }

  async function api(path, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const mutating = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
    if (mutating) showLoader();
    try {
      const res = await fetch(path, {
        credentials: 'same-origin',
        ...options,
        headers: { 'Content-Type': 'application/json', ...csrfHeader(), ...(options.headers || {}) },
      });
      let body = null;
      try { body = await res.json(); } catch (_) { /* sin cuerpo */ }
      return { ok: res.ok, status: res.status, body };
    } finally {
      if (mutating) hideLoader();
    }
  }

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fmtDate(v) {
    if (!v) return '';
    return new Date(v).toLocaleDateString('es-GT', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  function fmtNum(v) { return Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }); }

  // ── Toast ─────────────────────────────────────────────────
  function toast(message, type = 'success', ms = 3200) {
    let cont = $('toast-container');
    if (!cont) { cont = document.createElement('div'); cont.id = 'toast-container'; cont.className = 'toast-container'; document.body.appendChild(cont); }
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.innerHTML = `<span class="toast__icon">${type === 'error' ? '✕' : '✓'}</span><span>${esc(message)}</span>`;
    cont.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-open'));
    setTimeout(() => { el.classList.remove('is-open'); setTimeout(() => el.remove(), 220); }, ms);
  }

  // ── Modal de confirmación ─────────────────────────────────
  function confirmDialog(opts = {}) {
    const { title = 'Confirmar', message = '', confirmText = 'Confirmar', cancelText = 'Cancelar', danger = false } = opts;
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
          <h3 class="modal__title">${esc(title)}</h3>
          <p class="modal__msg">${esc(message)}</p>
          <div class="modal__actions">
            <button class="btn-ghost" data-act="cancel">${esc(cancelText)}</button>
            <button class="${danger ? 'btn-danger' : 'btn-primary'}" data-act="ok">${esc(confirmText)}</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('is-open'));
      function close(r) { overlay.classList.remove('is-open'); document.removeEventListener('keydown', onKey); setTimeout(() => overlay.remove(), 180); resolve(r); }
      function onKey(e) { if (e.key === 'Escape') close(false); else if (e.key === 'Enter') close(true); }
      overlay.addEventListener('click', (e) => { if (e.target === overlay) return close(false); const a = e.target.closest('[data-act]'); if (a) close(a.getAttribute('data-act') === 'ok'); });
      document.addEventListener('keydown', onKey);
      overlay.querySelector('[data-act="ok"]').focus();
    });
  }

  // ── Modal con input (reemplaza window.prompt) ─────────────
  function promptDialog(opts = {}) {
    const { title = 'Ingresa un valor', label = '', placeholder = '', confirmText = 'Aceptar', cancelText = 'Cancelar' } = opts;
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
          <h3 class="modal__title">${esc(title)}</h3>
          ${label ? `<label class="modal__label">${esc(label)}</label>` : ''}
          <input class="modal__input" type="text" placeholder="${esc(placeholder)}" />
          <div class="modal__actions">
            <button class="btn-ghost" data-act="cancel">${esc(cancelText)}</button>
            <button class="btn-primary" data-act="ok">${esc(confirmText)}</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('is-open'));
      const input = overlay.querySelector('.modal__input');
      function close(val) { overlay.classList.remove('is-open'); document.removeEventListener('keydown', onKey); setTimeout(() => overlay.remove(), 180); resolve(val); }
      function onKey(e) { if (e.key === 'Escape') close(null); else if (e.key === 'Enter') { e.preventDefault(); close(input.value.trim() || null); } }
      overlay.addEventListener('click', (e) => { if (e.target === overlay) return close(null); const a = e.target.closest('[data-act]'); if (a) close(a.getAttribute('data-act') === 'ok' ? (input.value.trim() || null) : null); });
      document.addEventListener('keydown', onKey);
      setTimeout(() => input.focus(), 50);
    });
  }

  // ── Vistas de sesión ──────────────────────────────────────
  const loginView = $('login-view');
  const dashboardView = $('dashboard-view');
  const forceView = $('force-pass-view');

  // Los drawers de las secciones (blog, servicios, planes, plantillas, cadencias)
  // vienen estáticos dentro del contenido; se reubican al <body> para que el overlay
  // fijo cubra toda la pantalla —incluida la barra superior— igual que los drawers
  // dinámicos del CRM/usuarios. Anidados en el flujo, la barra sticky tapaba su encabezado.
  document.querySelectorAll('#dashboard-view .drawer-overlay').forEach((ov) => document.body.appendChild(ov));

  function showLogin() { loginView.hidden = false; dashboardView.hidden = true; forceView.hidden = true; showLoginStep('password'); }
  function showDashboard() { loginView.hidden = true; dashboardView.hidden = false; forceView.hidden = true; applyRoleGate(currentUserRole); showSection('home'); loadOverview(); }

  // Oculta a los editores las secciones que en el servidor exigen rol admin
  // (contacto/config, auditoría y gestión de usuarios). Es solo cosmético: el
  // control real es requireRole en las rutas.
  function applyRoleGate(role) {
    const isAdmin = role === 'admin';
    // Secciones que en el servidor exigen rol admin: se ocultan sus botones de
    // navegación a los editores. El control real es requireRole en las rutas.
    document.querySelectorAll('.admin__nav-btn[data-section="inbox"], .admin__nav-btn[data-section="contact"], .admin__nav-btn[data-section="audit"], .admin__nav-btn[data-section="analytics"], .admin__nav-btn[data-section="users"], .admin__nav-btn[data-section="legal"], .admin__nav-btn[data-section="landings"]').forEach((b) => { b.hidden = !isAdmin; });
  }
  function showForce() { loginView.hidden = true; dashboardView.hidden = true; forceView.hidden = false; setTimeout(() => $('fp-current').focus(), 50); }

  async function checkSession() {
    const { ok, body } = await api('/api/auth/me');
    if (!ok) { showLogin(); return; }
    currentUserId = body && body.userId;
    currentUserRole = body && body.role;
    if (body && body.mustChangePassword) showForce(); else showDashboard();
  }

  // Cambio de contraseña obligatorio.
  $('force-pass-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('fp-error').textContent = '';
    const r = await api('/api/admin/account/password', { method: 'POST', body: JSON.stringify({ currentPassword: $('fp-current').value, newPassword: $('fp-new').value }) });
    if (r.ok) { $('fp-current').value = ''; $('fp-new').value = ''; toast('Contraseña actualizada'); showDashboard(); }
    else { const m = (r.body && r.body.error) || 'No se pudo cambiar.'; $('fp-error').textContent = m; toast(m, 'error'); }
  });
  $('fp-logout').addEventListener('click', async () => { await api('/api/auth/logout', { method: 'POST' }); showLogin(); });

  let mfaChallenge = null;
  let resetToken = null;
  function showLoginStep(step) {
    $('login-form').hidden = step !== 'password';
    $('mfa-login-card').hidden = step !== 'mfa';
    $('forgot-card').hidden = step !== 'forgot';
    $('reset-card').hidden = step !== 'reset';
    if (step === 'mfa') setTimeout(() => $('mfa-login-code').focus(), 50);
  }
  function showResetView(token) {
    resetToken = token;
    loginView.hidden = false; dashboardView.hidden = true; forceView.hidden = true;
    showLoginStep('reset');
  }

  // ¿Olvidaste tu contraseña?
  $('forgot-link').addEventListener('click', () => { $('forgot-msg').textContent = ''; showLoginStep('forgot'); });
  $('forgot-back').addEventListener('click', () => showLoginStep('password'));
  $('forgot-card').addEventListener('submit', async (e) => {
    e.preventDefault();
    const r = await api('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: $('forgot-email').value.trim() }) });
    // Respuesta uniforme (no revela si el correo existe).
    if (r.ok) { toast('Si el correo está registrado, te enviamos un enlace.'); $('forgot-email').value = ''; showLoginStep('password'); }
    else toast((r.body && r.body.error) || 'No se pudo procesar.', 'error');
  });
  $('reset-card').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('reset-msg').textContent = '';
    const r = await api('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token: resetToken, newPassword: $('reset-pass').value }) });
    if (r.ok) {
      toast('Contraseña actualizada. Inicia sesión con la nueva.');
      resetToken = null;
      history.replaceState(null, '', ADMIN_BASE);
      showLogin();
    } else { const m = (r.body && r.body.error) || 'No se pudo.'; $('reset-msg').textContent = m; toast(m, 'error'); }
  });

  // Carga Cloudflare Turnstile en el login si está activado en el panel.
  (async function initLoginTurnstile() {
    try {
      const res = await fetch('/api/config');
      const cfg = (await res.json()).data || {};
      const el = $('login-turnstile');
      if (!cfg.turnstileEnabled || !cfg.turnstileSiteKey || !el) return;
      el.setAttribute('data-sitekey', cfg.turnstileSiteKey);
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    } catch (_) { /* sin bloquear el login si falla */ }
  })();

  function loginTurnstileToken() {
    const input = document.querySelector('#login-form [name="cf-turnstile-response"]');
    return input ? input.value : '';
  }

  $('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('login-error').textContent = '';
    const { ok, body } = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: $('login-user').value, password: $('login-pass').value, 'cf-turnstile-response': loginTurnstileToken() }) });
    if (window.turnstile) window.turnstile.reset();
    if (ok && body && body.mfaRequired) {
      mfaChallenge = body.challenge;
      $('login-pass').value = '';
      $('mfa-login-code').value = '';
      $('mfa-login-error').textContent = '';
      showLoginStep('mfa');
    } else if (ok) {
      $('login-pass').value = '';
      await checkSession(); // carga rol + vista correcta (dashboard o cambio forzado)
    } else {
      $('login-error').textContent = (body && body.error) || 'No se pudo iniciar sesión.';
    }
  });

  $('mfa-login-card').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('mfa-login-error').textContent = '';
    const { ok, body } = await api('/api/auth/mfa', { method: 'POST', body: JSON.stringify({ challenge: mfaChallenge, code: $('mfa-login-code').value }) });
    if (ok) { mfaChallenge = null; await checkSession(); }
    else $('mfa-login-error').textContent = (body && body.error) || 'Código incorrecto.';
  });
  $('mfa-login-back').addEventListener('click', () => { mfaChallenge = null; showLoginStep('password'); });

  $('logout-btn').addEventListener('click', async () => { await api('/api/auth/logout', { method: 'POST' }); showLogin(); });

  // Si una llamada admin devuelve 401, la sesión caducó.
  function guard(result) {
    if (result.status === 401) { showLogin(); toast('Tu sesión expiró. Inicia de nuevo.', 'error'); return false; }
    return true;
  }

  // ── Navegación entre secciones ────────────────────────────
  const loaders = { home: loadOverview, analytics: loadAnalytics, inbox: loadInbox, leads: loadLeads, crm: loadCrm, templates: loadTemplates, cadences: loadCadences, blog: loadPosts, services: loadServicesSec, plans: loadPlansSec, landings: loadLandings, contact: loadContact, account: loadAccount, users: loadUsers, legal: loadLegal, audit: loadAudit };

  function showSection(name) {
    document.querySelectorAll('.admin-sec').forEach((s) => { s.hidden = s.id !== `sec-${name}`; });
    let activeBtn = null;
    document.querySelectorAll('.admin__nav-btn').forEach((b) => {
      const on = b.getAttribute('data-section') === name;
      b.classList.toggle('is-active', on);
      if (on) activeBtn = b;
    });
    // Refleja la sección activa en el título de la barra superior (sin icono ni badge).
    const title = $('admin-page-title');
    if (title && activeBtn) {
      const clone = activeBtn.cloneNode(true);
      clone.querySelectorAll('.admin__nav-ico, .nav-badge').forEach((n) => n.remove());
      title.textContent = clone.textContent.trim();
    }
    closeSidebar();
    if (loaders[name]) loaders[name]();
  }
  $('admin-nav').addEventListener('click', (e) => {
    const btn = e.target.closest('.admin__nav-btn');
    if (btn) showSection(btn.getAttribute('data-section'));
  });

  // ── Sidebar móvil ─────────────────────────────────────────
  function openSidebar() { $('dashboard-view').classList.add('sidebar-open'); }
  function closeSidebar() { $('dashboard-view').classList.remove('sidebar-open'); }
  $('sidebar-toggle').addEventListener('click', () => $('dashboard-view').classList.toggle('sidebar-open'));
  $('admin-scrim').addEventListener('click', closeSidebar);

  // ── Tema claro / oscuro ───────────────────────────────────
  const THEME_KEY = 'tc-admin-theme';
  function currentTheme() { return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
  function applyThemeIcon() { const b = $('theme-toggle'); if (b) b.textContent = currentTheme() === 'dark' ? '☀️' : '🌙'; }
  function setTheme(theme) {
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    try { localStorage.setItem(THEME_KEY, theme); } catch (_) { /* modo privado */ }
    applyThemeIcon();
    renderOverviewCharts(); // repinta con los colores del nuevo tema
    renderAnalyticsChart();
  }
  applyThemeIcon();
  $('theme-toggle').addEventListener('click', () => setTheme(currentTheme() === 'dark' ? 'light' : 'dark'));

  // ── INICIO (overview) ─────────────────────────────────────
  let lastOverview = null;      // último payload, para repintar al cambiar de tema
  const charts = {};            // instancias de Chart.js activas por id de canvas

  async function loadOverview() {
    const { ok, body } = await api('/api/admin/overview');
    if (!guard({ status: ok ? 200 : 401 })) return;
    if (!ok) return;
    const d = body.data;
    lastOverview = d;
    const badge = $('nav-leads');
    if (d.leadsPending > 0) { badge.hidden = false; badge.textContent = d.leadsPending; } else badge.hidden = true;
    setInboxBadge(d.inboxUnread || 0);
    const cards = [
      { label: 'Cotizaciones pendientes', value: d.leadsPending, accent: '#6c5ffc', icon: '📥' },
      { label: 'Cotizaciones totales', value: d.leadsTotal, accent: '#06b6d4', icon: '📊' },
      { label: 'Artículos publicados', value: d.postsPublished, accent: '#0ab39c', icon: '✅' },
      { label: 'Borradores', value: d.postsDraft, accent: '#f7b84b', icon: '📝' },
    ];
    $('stat-grid').innerHTML = cards.map((c) => `
      <div class="stat-card" style="--accent:${c.accent}">
        <div class="stat-card__icon">${c.icon}</div>
        <div class="stat-card__body">
          <div class="stat-card__value">${c.value}</div>
          <div class="stat-card__label">${esc(c.label)}</div>
        </div>
      </div>`).join('');
    renderOverviewCharts(d);
  }

  // Lee un token de color del tema activo (fallback por si el navegador aún no
  // resolvió la variable CSS).
  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }
  const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function monthLabel(key) {
    const m = Number(String(key).split('-')[1]);
    return MONTHS_ES[(m - 1 + 12) % 12] || key;
  }

  // Dibuja (o repinta) las gráficas del dashboard con los colores del tema actual.
  // Sin datos previos o sin Chart.js cargado, no hace nada.
  function renderOverviewCharts(data) {
    const d = data || lastOverview;
    if (!d || typeof window.Chart === 'undefined') return;
    Object.values(charts).forEach((c) => c && c.destroy());

    const primary = cssVar('--primary', '#6c5ffc');
    const grid = cssVar('--border', 'rgba(0,0,0,0.08)');
    const tick = cssVar('--text-muted', '#767d92');
    const surface = cssVar('--surface', '#ffffff');
    window.Chart.defaults.font.family = cssVar('--font', 'Inter, sans-serif');
    window.Chart.defaults.color = tick;

    // Área: cotizaciones por mes.
    const monthCanvas = $('chart-leads-month');
    const series = Array.isArray(d.leadsByMonth) ? d.leadsByMonth : [];
    if (monthCanvas && series.length) {
      const ctx = monthCanvas.getContext('2d');
      const fill = ctx.createLinearGradient(0, 0, 0, 260);
      fill.addColorStop(0, 'rgba(108,95,252,0.28)');
      fill.addColorStop(1, 'rgba(108,95,252,0.02)');
      charts.month = new window.Chart(ctx, {
        type: 'line',
        data: {
          labels: series.map((s) => monthLabel(s.month)),
          datasets: [{
            data: series.map((s) => s.count),
            borderColor: primary,
            backgroundColor: fill,
            borderWidth: 2.5,
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: surface,
            pointBorderColor: primary,
            pointBorderWidth: 2,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: tick } },
            y: { beginAtZero: true, grid: { color: grid }, ticks: { color: tick, precision: 0 } },
          },
        },
      });
    }

    // Dona: cotizaciones por estado.
    const statusCanvas = $('chart-leads-status');
    const byStatus = d.leadsByStatus || {};
    if (statusCanvas && (byStatus.pending || byStatus.reviewed || byStatus.contacted)) {
      charts.status = new window.Chart(statusCanvas.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: ['Pendiente', 'Revisado', 'Contactado'],
          datasets: [{
            data: [byStatus.pending || 0, byStatus.reviewed || 0, byStatus.contacted || 0],
            backgroundColor: [cssVar('--warning', '#f7b84b'), cssVar('--info', '#4b9fd5'), cssVar('--success', '#0ab39c')],
            borderColor: surface,
            borderWidth: 3,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '62%',
          plugins: { legend: { position: 'bottom', labels: { color: tick, usePointStyle: true, padding: 16 } } },
        },
      });
    }
  }

  // ── BANDEJA (correos entrantes del CRM) ───────────────────
  function setInboxBadge(n) {
    const b = $('nav-inbox');
    if (!b) return;
    if (n > 0) { b.hidden = false; b.textContent = n; } else b.hidden = true;
  }
  function fmtDateTime(v) {
    if (!v) return '';
    return new Date(v).toLocaleString('es-GT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
  let inboxItems = [];
  function inboxSnippet(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return (tmp.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90);
  }
  function inboxRow(m) {
    const initials = esc(leadInitials(m.contactName || m.contactEmail || '?'));
    return `<button class="inbox-item${m.unread ? ' is-unread' : ''}" data-id="${m.id}">
      <span class="inbox-item__avatar" style="--c:${leadColor(m.contactName || m.contactEmail || '?')}">${initials}</span>
      <span class="inbox-item__body">
        <span class="inbox-item__top">
          <span class="inbox-item__name">${esc(m.contactName || m.contactEmail)}</span>
          <span class="inbox-item__date">${esc(fmtDateTime(m.receivedAt || m.createdAt))}</span>
        </span>
        <span class="inbox-item__subject">${m.unread ? '<span class="inbox-dot" aria-label="No leído"></span>' : ''}${esc(m.subject || '(sin asunto)')}</span>
        <span class="inbox-item__snippet">${esc(inboxSnippet(m.bodyHtml))}</span>
      </span>
    </button>`;
  }
  // Panel de lectura (columna derecha). El cuerpo ya viene sanitizado del servidor.
  function renderInboxRead(m) {
    const read = $('inbox-read');
    if (!m) { read.innerHTML = '<div class="inbox-read__empty"><span class="inbox-read__empty-ico">📬</span><p>Selecciona un correo para leerlo.</p></div>'; return; }
    read.innerHTML = `
      <div class="inbox-read__head">
        <div class="inbox-read__from">
          <span class="inbox-item__avatar" style="--c:${leadColor(m.contactName || m.contactEmail || '?')}">${esc(leadInitials(m.contactName || m.contactEmail || '?'))}</span>
          <div class="inbox-read__who">
            <div class="inbox-read__name">${esc(m.contactName || m.contactEmail)}</div>
            <a class="lead-card__email" href="mailto:${esc(m.contactEmail)}">${esc(m.contactEmail)}</a>
          </div>
          <span class="inbox-read__date">${esc(fmtDateTime(m.receivedAt || m.createdAt))}</span>
        </div>
        <h3 class="inbox-read__subject">${esc(m.subject || '(sin asunto)')}</h3>
      </div>
      <div class="inbox-read__body">${m.bodyHtml || '<em class="admin-muted">(sin contenido)</em>'}</div>
      <div class="inbox-read__actions">
        <button class="btn-primary" id="inbox-reply">↩ Responder</button>
      </div>`;
    read.querySelector('#inbox-reply').addEventListener('click', async () => {
      const cr = await api(`/api/admin/contacts/${m.contactId}`);
      if (cr.ok && cr.body.data) openMailComposer(cr.body.data);
    });
  }
  async function loadInbox() {
    const cont = $('inbox-list');
    const r = await api('/api/admin/inbox');
    if (!guard(r) || !r.ok) { cont.innerHTML = '<p class="admin-muted">No se pudo cargar la bandeja.</p>'; return; }
    inboxItems = (r.body.data && r.body.data.items) || [];
    renderInboxRead(null);
    if (!inboxItems.length) { cont.innerHTML = '<p class="admin-muted">Aún no hay correos entrantes.</p>'; }
    else {
      cont.innerHTML = inboxItems.map(inboxRow).join('');
      cont.querySelectorAll('.inbox-item').forEach((el) => el.addEventListener('click', () => {
        const m = inboxItems.find((x) => String(x.id) === el.getAttribute('data-id'));
        cont.querySelectorAll('.inbox-item').forEach((x) => x.classList.remove('is-active'));
        el.classList.add('is-active');
        el.classList.remove('is-unread');
        renderInboxRead(m);
      }));
    }
    // Al abrir la bandeja se marcan como leídos y el badge se limpia.
    if ((r.body.data && r.body.data.unread) > 0) {
      await api('/api/admin/inbox/seen', { method: 'POST' });
    }
    setInboxBadge(0);
  }
  $('inbox-refresh').addEventListener('click', loadInbox);

  // ── AUDITORÍA ─────────────────────────────────────────────
  async function loadAudit() {
    const r = await api('/api/admin/audit');
    if (!guard(r) || !r.ok) return;
    const rows = r.body.data || [];
    const body = $('audit-body');
    if (!rows.length) { body.innerHTML = '<tr><td colspan="5" class="admin-muted">Sin eventos.</td></tr>'; return; }
    body.innerHTML = rows.map((e) => {
      const okStatus = e.status && e.status < 400;
      const when = e.createdAt ? new Date(e.createdAt).toLocaleString('es-GT') : '—';
      const who = e.actorLabel || e.actor || (e.actorId ? `#${e.actorId}` : '—');
      return `<tr>
        <td>${esc(when)}</td>
        <td><code>${esc(e.action)}</code></td>
        <td>${esc(who)}</td>
        <td><span class="badge-status ${okStatus ? 'published' : 'draft'}">${esc(e.status ?? '—')}</span></td>
        <td>${esc(e.ip || '—')}</td>
      </tr>`;
    }).join('');
  }
  $('audit-refresh').addEventListener('click', loadAudit);

  // ── VISITAS (analítica first-party) ───────────────────────
  let lastAnalytics = null;   // último payload, para repintar la gráfica al cambiar de tema
  let analyticsDays = 30;

  const DEVICE_LABEL = { desktop: 'Escritorio', mobile: 'Móvil', tablet: 'Tableta' };
  // Nombres de país en español para los códigos ISO que más aparecen; el resto cae al código.
  const COUNTRY_LABEL = { GT: 'Guatemala', US: 'Estados Unidos', MX: 'México', ES: 'España', SV: 'El Salvador', HN: 'Honduras', CR: 'Costa Rica', CO: 'Colombia', AR: 'Argentina', CL: 'Chile', PE: 'Perú', PA: 'Panamá', EC: 'Ecuador', NI: 'Nicaragua' };
  function countryFlag(code) {
    if (!/^[A-Za-z]{2}$/.test(code || '')) return '';
    return String.fromCodePoint(...code.toUpperCase().split('').map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
  }
  function dayLabel(key) {
    const parts = String(key).split('-');
    return `${Number(parts[2])} ${MONTHS_ES[(Number(parts[1]) - 1 + 12) % 12] || ''}`;
  }

  async function loadAnalytics() {
    const r = await api(`/api/admin/analytics?days=${analyticsDays}`);
    if (!guard(r) || !r.ok) return;
    const d = r.body.data;
    lastAnalytics = d;

    const avg = d.days ? Math.round(d.totalViews / d.days) : 0;
    const cards = [
      { label: 'Visitas totales', value: fmtNum(d.totalViews), accent: '#6c5ffc', icon: '👁️' },
      { label: 'Visitantes únicos', value: fmtNum(d.uniqueVisitors), accent: '#06b6d4', icon: '🧑' },
      { label: 'Promedio diario', value: fmtNum(avg), accent: '#0ab39c', icon: '📅' },
      { label: 'Páginas distintas', value: fmtNum(d.topPages.length), accent: '#f7b84b', icon: '📄' },
    ];
    $('analytics-stats').innerHTML = cards.map((c) => `
      <div class="stat-card" style="--accent:${c.accent}">
        <div class="stat-card__icon">${c.icon}</div>
        <div class="stat-card__body">
          <div class="stat-card__value">${c.value}</div>
          <div class="stat-card__label">${esc(c.label)}</div>
        </div>
      </div>`).join('');

    renderMiniTable('analytics-pages', d.topPages.map((p) => ({ name: p.path, count: p.count })), { mono: true });
    renderMiniTable('analytics-referrers', d.topReferrers.map((p) => ({ name: p.referrer, count: p.count })), { empty: 'Sin fuentes externas (tráfico directo).' });
    renderMiniTable('analytics-countries', d.byCountry.map((p) => ({ name: `${countryFlag(p.country)} ${COUNTRY_LABEL[p.country] || p.country}`.trim(), count: p.count })));
    renderMiniTable('analytics-devices', d.byDevice.map((p) => ({ name: DEVICE_LABEL[p.device] || p.device, count: p.count })));

    renderAnalyticsChart(d);
  }

  // Tabla compacta nombre → conteo con una mini-barra proporcional al máximo.
  function renderMiniTable(id, rows, opts = {}) {
    const body = $(id);
    if (!body) return;
    if (!rows.length) { body.innerHTML = `<tr><td class="admin-muted">${esc(opts.empty || 'Sin datos.')}</td></tr>`; return; }
    const max = Math.max(...rows.map((r) => r.count), 1);
    body.innerHTML = rows.map((r) => {
      const pct = Math.max(4, Math.round((r.count / max) * 100));
      const name = opts.mono ? `<code>${esc(r.name)}</code>` : esc(r.name);
      return `<tr>
        <td class="bar-cell">${name}<span class="bar" style="width:${pct}%"></span></td>
        <td class="num">${fmtNum(r.count)}</td>
      </tr>`;
    }).join('');
  }

  // Dibuja (o repinta) la gráfica de visitas por día con los colores del tema actual.
  function renderAnalyticsChart(data) {
    const d = data || lastAnalytics;
    if (!d || typeof window.Chart === 'undefined') return;
    const canvas = $('chart-visits-day');
    if (!canvas) return;
    if (charts.visits) charts.visits.destroy();

    const primary = cssVar('--primary', '#6c5ffc');
    const grid = cssVar('--border', 'rgba(0,0,0,0.08)');
    const tick = cssVar('--text-muted', '#767d92');
    const surface = cssVar('--surface', '#ffffff');
    const series = Array.isArray(d.viewsByDay) ? d.viewsByDay : [];
    const ctx = canvas.getContext('2d');
    const fill = ctx.createLinearGradient(0, 0, 0, 260);
    fill.addColorStop(0, 'rgba(108,95,252,0.28)');
    fill.addColorStop(1, 'rgba(108,95,252,0.02)');
    charts.visits = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels: series.map((s) => dayLabel(s.day)),
        datasets: [{
          data: series.map((s) => s.count),
          borderColor: primary,
          backgroundColor: fill,
          borderWidth: 2.5,
          fill: true,
          tension: 0.35,
          pointRadius: series.length > 45 ? 0 : 2.5,
          pointBackgroundColor: surface,
          pointBorderColor: primary,
          pointBorderWidth: 2,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: tick, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
          y: { beginAtZero: true, grid: { color: grid }, ticks: { color: tick, precision: 0 } },
        },
      },
    });
  }

  $('analytics-range').addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    analyticsDays = Number(btn.getAttribute('data-days')) || 30;
    document.querySelectorAll('#analytics-range .chip').forEach((c) => c.classList.toggle('is-active', c === btn));
    $('analytics-range-hint').textContent = `Últimos ${analyticsDays} días`;
    loadAnalytics();
  });

  // ── COTIZACIONES / LEADS ──────────────────────────────────
  const STATUS = { pending: 'Pendiente', reviewed: 'Revisado', contacted: 'Contactado' };
  const PAGE = 25;
  let allLeads = [];
  let leadQuery = '';
  let leadStatus = 'all';
  let leadLimit = PAGE;

  async function loadLeads() {
    const r = await api('/api/admin/leads');
    if (!guard(r)) return;
    if (!r.ok) { $('leads-list').innerHTML = '<p class="admin-muted">No se pudieron cargar.</p>'; return; }
    allLeads = r.body.data;
    leadLimit = PAGE;
    renderLeads();
  }

  function filteredLeads() {
    const q = leadQuery.trim().toLowerCase();
    return allLeads.filter((l) => {
      if (leadStatus !== 'all' && l.status !== leadStatus) return false;
      if (!q) return true;
      return [l.clientName, l.clientEmail, l.companyName, l.projectType, l.description]
        .some((f) => String(f || '').toLowerCase().includes(q));
    });
  }

  const AVATAR_COLORS = ['#8b5cf6', '#0066ff', '#06b6d4', '#ec4899', '#f59e0b', '#10b981'];
  function leadInitials(name) {
    return (name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || '?';
  }
  function leadColor(name) {
    let h = 0;
    for (const ch of name || 'x') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
  }

  function leadCard(l) {
    const statusOpts = Object.entries(STATUS)
      .map(([k, v]) => `<option value="${k}" ${k === l.status ? 'selected' : ''}>${v}</option>`)
      .join('');
    return `
      <article class="lead-card lead-card--${l.status}" data-id="${l.id}">
        <div class="lead-card__top">
          <div class="lead-card__avatar" style="--c:${leadColor(l.clientName)}">${esc(leadInitials(l.clientName))}</div>
          <div class="lead-card__id">
            <div class="lead-card__name">${esc(l.clientName)}${l.companyName ? `<span class="lead-card__company">${esc(l.companyName)}</span>` : ''}</div>
            <a class="lead-card__email" href="mailto:${esc(l.clientEmail)}"><span aria-hidden="true">✉</span> ${esc(l.clientEmail)}</a>
          </div>
          <select class="lead-card__status" data-id="${l.id}" aria-label="Estado de la cotización">${statusOpts}</select>
        </div>
        <div class="lead-card__tags">
          <span class="lead-tag"><span aria-hidden="true">💼</span> ${esc(l.projectType)}</span>
          <span class="lead-tag"><span aria-hidden="true">💰</span> ${esc(l.budgetRange || 'Por definir')}</span>
          <span class="lead-tag"><span aria-hidden="true">📅</span> ${fmtDate(l.createdAt)}</span>
        </div>
        ${l.description ? `<p class="lead-card__desc">${esc(l.description)}</p>` : ''}
      </article>`;
  }

  function renderLeads() {
    const cont = $('leads-list');
    if (!allLeads.length) { cont.innerHTML = '<p class="admin-muted">Aún no hay cotizaciones.</p>'; $('leads-count').textContent = ''; $('leads-more').hidden = true; return; }
    const all = filteredLeads();
    $('leads-count').textContent = `${all.length} cotización(es)`;
    if (!all.length) { cont.innerHTML = '<p class="admin-muted">Ninguna coincide con el filtro.</p>'; $('leads-more').hidden = true; return; }
    cont.innerHTML = all.slice(0, leadLimit).map(leadCard).join('');
    $('leads-more').hidden = all.length <= leadLimit;
    cont.querySelectorAll('.lead-card__status').forEach((sel) => {
      sel.addEventListener('change', async () => {
        const id = sel.getAttribute('data-id');
        const res = await api(`/api/admin/leads/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: sel.value }) });
        if (res.ok) {
          const lead = allLeads.find((x) => String(x.id) === id);
          if (lead) lead.status = sel.value;
          const card = sel.closest('.lead-card');
          if (card) card.className = `lead-card lead-card--${sel.value}`;
          toast('Estado actualizado');
          loadOverview();
        } else toast('No se pudo actualizar', 'error');
      });
    });
  }

  $('leads-search').addEventListener('input', (e) => { leadQuery = e.target.value; leadLimit = PAGE; renderLeads(); });
  $('leads-filter').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    leadStatus = chip.getAttribute('data-status');
    leadLimit = PAGE;
    $('leads-filter').querySelectorAll('.chip').forEach((c) => c.classList.toggle('is-active', c === chip));
    renderLeads();
  });
  $('leads-more-btn').addEventListener('click', () => { leadLimit += PAGE; renderLeads(); });
  $('leads-export').addEventListener('click', exportLeadsCsv);

  function exportLeadsCsv() {
    const rows = filteredLeads();
    if (!rows.length) { toast('No hay cotizaciones para exportar', 'error'); return; }
    const headers = ['ID', 'Nombre', 'Correo', 'Empresa', 'Tipo', 'Presupuesto', 'Estado', 'Fecha', 'Descripción'];
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [headers.map(cell).join(',')];
    for (const l of rows) {
      lines.push([
        l.id, l.clientName, l.clientEmail, l.companyName, l.projectType, l.budgetRange,
        STATUS[l.status] || l.status, new Date(l.createdAt).toISOString().slice(0, 10), l.description,
      ].map(cell).join(','));
    }
    const csv = '﻿' + lines.join('\r\n'); // BOM para que Excel respete UTF-8
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cotizaciones-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Exportadas ${rows.length} cotización(es)`);
  }

  // ── CLIENTES / CRM ────────────────────────────────────────
  const CRM_STAGES = {
    nuevo: 'Nuevo', contactado: 'Contactado', respondio: 'Respondió', reunion: 'Reunión',
    propuesta: 'Propuesta', ganado: 'Ganado', perdido: 'Perdido', dormido: 'Dormido',
  };
  const CRM_TIERS = { alta: 'Alta', media: 'Media', base: 'Base' };
  let allContacts = [];
  let crmQuery = '', crmTier = 'all', crmWeb = 'all', crmStage = 'all', crmArchived = 'active', crmLimit = PAGE;

  async function loadCrm() {
    // Se traen también los dados de baja; el filtro por estado se aplica en cliente.
    const r = await api('/api/admin/contacts?includeArchived=true');
    if (!guard(r)) return;
    if (!r.ok) { $('crm-list').innerHTML = '<p class="admin-muted">No se pudieron cargar los contactos.</p>'; return; }
    allContacts = r.body.data || [];
    crmLimit = PAGE;
    renderContacts();
  }

  function filteredContacts() {
    const q = crmQuery.trim().toLowerCase();
    return allContacts.filter((c) => {
      if (crmArchived === 'active' && c.archived) return false;
      if (crmArchived === 'archived' && !c.archived) return false;
      if (crmTier !== 'all' && c.tier !== crmTier) return false;
      if (crmStage !== 'all' && c.stage !== crmStage) return false;
      const hasWeb = !!(c.website && c.website.trim());
      if (crmWeb === 'si' && !hasWeb) return false;
      if (crmWeb === 'no' && hasWeb) return false;
      if (!q) return true;
      return [c.name, c.email, c.company, c.sector, c.location]
        .some((f) => String(f || '').toLowerCase().includes(q));
    });
  }

  // Color de la etapa del pipeline: da lectura inmediata del estado y evita que
  // el selector se vea como un recuadro gris suelto.
  const CRM_STAGE_COLORS = {
    nuevo: '#4b9fd5', contactado: '#6c5ffc', respondio: '#06b6d4', reunion: '#f7b84b',
    propuesta: '#ec4899', ganado: '#0ab39c', perdido: '#f1556c', dormido: '#98a0b3',
  };
  function crmStageColor(stage) { return CRM_STAGE_COLORS[stage] || '#98a0b3'; }

  function contactCard(c) {
    const stageOpts = Object.entries(CRM_STAGES)
      .map(([k, v]) => `<option value="${k}" ${k === c.stage ? 'selected' : ''}>${v}</option>`)
      .join('');
    const tierBadge = c.tier ? `<span class="crm-tier crm-tier--${c.tier}">${CRM_TIERS[c.tier]}</span>` : '';
    const webTag = (c.website && c.website.trim())
      ? `<a class="lead-tag" href="${esc(c.website)}" target="_blank" rel="noopener"><span aria-hidden="true">🔗</span> ${esc(c.website.replace(/^https?:\/\//, ''))}</a>`
      : '<span class="lead-tag lead-tag--warn"><span aria-hidden="true">🚫</span> Sin sitio</span>';
    const hasFollowup = !!((c.notes && c.notes.trim()) || c.nextActionAt);
    const nextTag = c.nextActionAt
      ? `<span class="lead-tag lead-tag--next"><span aria-hidden="true">🗓️</span> ${esc(fmtDate(c.nextActionAt))}</span>`
      : '';
    return `
      <article class="lead-card contact-card${c.archived ? ' is-archived' : ''}" data-id="${c.id}">
        <div class="contact-card__head">
          <div class="lead-card__avatar" style="--c:${leadColor(c.name)}">${esc(leadInitials(c.name))}</div>
          <div class="contact-card__id">
            <div class="contact-card__name-row">
              <span class="lead-card__name">${esc(c.name)}</span>
              ${c.archived ? '<span class="badge-archived">Dado de baja</span>' : ''}
              ${tierBadge}
              ${c.company ? `<span class="lead-card__company">${esc(c.company)}</span>` : ''}
            </div>
            <a class="lead-card__email" href="mailto:${esc(c.email)}"><span aria-hidden="true">✉</span> ${esc(c.email)}</a>
          </div>
          <select class="lead-card__status crm-stage" data-id="${c.id}" aria-label="Etapa del pipeline" style="--status-c:${crmStageColor(c.stage)}">${stageOpts}</select>
        </div>
        <div class="contact-card__meta">
          ${c.sector ? `<span class="lead-tag"><span aria-hidden="true">🏷️</span> ${esc(c.sector)}</span>` : ''}
          ${c.location ? `<span class="lead-tag"><span aria-hidden="true">📍</span> ${esc(c.location)}</span>` : ''}
          ${webTag}
          ${nextTag}
        </div>
        <div class="contact-card__foot">
          <button class="btn-ghost btn-sm crm-mail-btn" data-id="${c.id}"><span aria-hidden="true">✉️</span> Enviar correo</button>
          <button class="crm-followup-btn${hasFollowup ? ' is-set' : ''}" data-id="${c.id}"><span aria-hidden="true">📝</span> Notas y seguimiento</button>
        </div>
      </article>`;
  }

  // Drawer lateral: edición del contacto, seguimiento (notas / próxima acción /
  // etapa) y baja lógica. Se construye al vuelo (mismo patrón de overlay que los
  // diálogos) y al guardar re-renderiza la lista.
  function openCrmDrawer(contact) {
    const stageOpts = Object.entries(CRM_STAGES)
      .map(([k, v]) => `<option value="${k}" ${k === contact.stage ? 'selected' : ''}>${v}</option>`)
      .join('');
    const tierOpts = ['<option value="">Sin prioridad</option>']
      .concat(Object.entries(CRM_TIERS).map(([k, v]) => `<option value="${k}" ${k === contact.tier ? 'selected' : ''}>${v}</option>`))
      .join('');
    const nextVal = contact.nextActionAt ? String(contact.nextActionAt).slice(0, 10) : '';
    const val = (v) => esc(v || '');
    const overlay = document.createElement('div');
    overlay.className = 'drawer-overlay';
    overlay.innerHTML = `
      <aside class="drawer" role="dialog" aria-modal="true" aria-label="Editar ${esc(contact.name)}">
        <header class="drawer__head">
          <div class="drawer__id">
            <div class="lead-card__avatar" style="--c:${leadColor(contact.name)}">${esc(leadInitials(contact.name))}</div>
            <div class="drawer__idtext">
              <div class="drawer__name">${esc(contact.name)}${contact.archived ? '<span class="badge-archived">Dado de baja</span>' : ''}</div>
              <a class="lead-card__email" href="mailto:${esc(contact.email)}"><span aria-hidden="true">✉</span> ${esc(contact.email)}</a>
            </div>
          </div>
          <button class="drawer__close" data-act="cancel" aria-label="Cerrar">✕</button>
        </header>
        <div class="drawer__body">
          <p class="drawer__section">Datos del contacto</p>
          <div class="admin-field"><label for="drw-name">Nombre</label><input type="text" id="drw-name" value="${val(contact.name)}" /></div>
          <div class="admin-field"><label for="drw-company">Empresa</label><input type="text" id="drw-company" value="${val(contact.company)}" /></div>
          <div class="admin-grid-2">
            <div class="admin-field"><label for="drw-sector">Sector</label><input type="text" id="drw-sector" value="${val(contact.sector)}" /></div>
            <div class="admin-field"><label for="drw-location">Ubicación</label><input type="text" id="drw-location" value="${val(contact.location)}" /></div>
          </div>
          <div class="admin-grid-2">
            <div class="admin-field"><label for="drw-phone">Teléfono</label><input type="text" id="drw-phone" value="${val(contact.phone)}" /></div>
            <div class="admin-field"><label for="drw-tier">Prioridad</label><select id="drw-tier" class="crm-select">${tierOpts}</select></div>
          </div>
          <div class="admin-field"><label for="drw-website">Sitio web</label><input type="text" id="drw-website" value="${val(contact.website)}" placeholder="https://…" /></div>

          <p class="drawer__section">Seguimiento</p>
          <div class="admin-field"><label for="drw-stage">Etapa del pipeline</label><select id="drw-stage" class="crm-select">${stageOpts}</select></div>
          <div class="admin-field"><label for="drw-notes">Notas</label><textarea id="drw-notes" rows="7" placeholder="Contexto, acuerdos, historial de la conversación…">${esc(contact.notes || '')}</textarea></div>
          <div class="admin-field"><label for="drw-next">Próxima acción</label><input type="date" id="drw-next" value="${nextVal}" /></div>
        </div>
        <footer class="drawer__foot">
          <button class="btn-danger" data-act="archive">${contact.archived ? 'Reactivar' : 'Dar de baja'}</button>
          <div class="drawer__foot-right">
            <button class="btn-ghost" data-act="cancel">Cancelar</button>
            <button class="btn-primary" data-act="save">Guardar</button>
          </div>
        </footer>
      </aside>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('is-open'));

    const q = (sel) => overlay.querySelector(sel);
    function close() { overlay.classList.remove('is-open'); document.removeEventListener('keydown', onKey); setTimeout(() => overlay.remove(), 240); }
    function onKey(e) { if (e.key === 'Escape') close(); }

    async function save() {
      const stage = q('#drw-stage').value;
      const payload = {
        name: q('#drw-name').value.trim(),
        company: q('#drw-company').value.trim(),
        sector: q('#drw-sector').value.trim(),
        location: q('#drw-location').value.trim(),
        phone: q('#drw-phone').value.trim(),
        website: q('#drw-website').value.trim(),
        tier: q('#drw-tier').value || null,
        notes: q('#drw-notes').value.trim(),
        nextActionAt: q('#drw-next').value || null,
      };
      if (!payload.name) { toast('El nombre es obligatorio', 'error'); return; }
      const res = await api(`/api/admin/contacts/${contact.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      if (!res.ok) { toast((res.body && res.body.error) || 'No se pudo guardar', 'error'); return; }
      // La etapa vive en otro endpoint; solo se persiste si cambió.
      if (stage !== contact.stage) {
        const rs = await api(`/api/admin/contacts/${contact.id}/stage`, { method: 'PATCH', body: JSON.stringify({ stage }) });
        if (rs.ok) contact.stage = stage;
      }
      Object.assign(contact, payload);
      toast('Contacto guardado');
      close();
      renderContacts();
    }

    async function toggleArchive() {
      const willArchive = !contact.archived;
      if (willArchive) {
        const ok = await confirmDialog({
          title: 'Dar de baja el contacto',
          message: `Se dará de baja a “${contact.name}”. Se conserva su historial y correos, pero saldrá del pipeline activo. Puedes reactivarlo después.`,
          confirmText: 'Dar de baja', danger: true,
        });
        if (!ok) return;
      }
      const res = await api(`/api/admin/contacts/${contact.id}`, { method: 'PUT', body: JSON.stringify({ archived: willArchive }) });
      if (!res.ok) { toast((res.body && res.body.error) || 'No se pudo completar', 'error'); return; }
      contact.archived = willArchive;
      toast(willArchive ? 'Contacto dado de baja' : 'Contacto reactivado');
      close();
      renderContacts();
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) return close();
      const a = e.target.closest('[data-act]');
      if (!a) return;
      const act = a.getAttribute('data-act');
      if (act === 'save') save();
      else if (act === 'archive') toggleArchive();
      else close();
    });
    document.addEventListener('keydown', onKey);
    setTimeout(() => q('#drw-name').focus(), 60);
  }

  function renderContacts() {
    const cont = $('crm-list');
    if (!allContacts.length) { cont.innerHTML = '<p class="admin-muted">Aún no hay contactos.</p>'; $('crm-count').textContent = ''; $('crm-more').hidden = true; return; }
    const all = filteredContacts();
    $('crm-count').textContent = `${all.length} contacto(s)`;
    if (!all.length) { cont.innerHTML = '<p class="admin-muted">Ninguno coincide con el filtro.</p>'; $('crm-more').hidden = true; return; }
    cont.innerHTML = all.slice(0, crmLimit).map(contactCard).join('');
    $('crm-more').hidden = all.length <= crmLimit;

    cont.querySelectorAll('.crm-stage').forEach((sel) => {
      sel.addEventListener('change', async () => {
        const id = sel.getAttribute('data-id');
        sel.style.setProperty('--status-c', crmStageColor(sel.value));
        const res = await api(`/api/admin/contacts/${id}/stage`, { method: 'PATCH', body: JSON.stringify({ stage: sel.value }) });
        if (res.ok) {
          const c = allContacts.find((x) => String(x.id) === id);
          if (c) c.stage = sel.value;
          toast('Etapa actualizada');
        } else toast('No se pudo actualizar la etapa', 'error');
      });
    });
    cont.querySelectorAll('.crm-followup-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const c = allContacts.find((x) => String(x.id) === btn.getAttribute('data-id'));
        if (c) openCrmDrawer(c);
      });
    });
    cont.querySelectorAll('.crm-mail-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const c = allContacts.find((x) => String(x.id) === btn.getAttribute('data-id'));
        if (c) openMailComposer(c);
      });
    });
  }

  $('crm-search').addEventListener('input', (e) => { crmQuery = e.target.value; crmLimit = PAGE; renderContacts(); });
  $('crm-stage-filter').addEventListener('change', (e) => { crmStage = e.target.value; crmLimit = PAGE; renderContacts(); });
  $('crm-tier-filter').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip'); if (!chip) return;
    crmTier = chip.getAttribute('data-tier'); crmLimit = PAGE;
    $('crm-tier-filter').querySelectorAll('.chip').forEach((c) => c.classList.toggle('is-active', c === chip));
    renderContacts();
  });
  $('crm-web-filter').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip'); if (!chip) return;
    crmWeb = chip.getAttribute('data-web'); crmLimit = PAGE;
    $('crm-web-filter').querySelectorAll('.chip').forEach((c) => c.classList.toggle('is-active', c === chip));
    renderContacts();
  });
  $('crm-archived-filter').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip'); if (!chip) return;
    crmArchived = chip.getAttribute('data-arch'); crmLimit = PAGE;
    $('crm-archived-filter').querySelectorAll('.chip').forEach((c) => c.classList.toggle('is-active', c === chip));
    renderContacts();
  });
  $('crm-more-btn').addEventListener('click', () => { crmLimit += PAGE; renderContacts(); });

  // Nuevo contacto
  $('crm-new-toggle').addEventListener('click', () => { const f = $('crm-new-form'); f.hidden = !f.hidden; if (!f.hidden) $('cn-name').focus(); });
  $('crm-new-cancel').addEventListener('click', () => { $('crm-new-form').hidden = true; $('crm-new-form').reset(); });
  $('crm-new-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: $('cn-name').value.trim(),
      email: $('cn-email').value.trim(),
      company: $('cn-company').value.trim(),
      phone: $('cn-phone').value.trim(),
      sector: $('cn-sector').value.trim(),
      location: $('cn-location').value.trim(),
      website: $('cn-website').value.trim(),
      tier: $('cn-tier').value || null,
    };
    if (!payload.name || !payload.email) { toast('Nombre y correo son obligatorios', 'error'); return; }
    const res = await api('/api/admin/contacts', { method: 'POST', body: JSON.stringify(payload) });
    if (res.ok) {
      toast('Contacto creado');
      $('crm-new-form').reset(); $('crm-new-form').hidden = true;
      loadCrm();
    } else toast((res.body && res.body.error) || 'No se pudo crear el contacto', 'error');
  });

  $('crm-export').addEventListener('click', () => {
    const rows = filteredContacts();
    if (!rows.length) { toast('No hay contactos para exportar', 'error'); return; }
    const headers = ['ID', 'Nombre', 'Correo', 'Empresa', 'Sector', 'Ubicación', 'Sitio web', 'Prioridad', 'Etapa', 'Próxima acción', 'Notas'];
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [headers.map(cell).join(',')];
    for (const c of rows) {
      lines.push([
        c.id, c.name, c.email, c.company, c.sector, c.location, c.website,
        CRM_TIERS[c.tier] || '', CRM_STAGES[c.stage] || c.stage,
        c.nextActionAt ? String(c.nextActionAt).slice(0, 10) : '', c.notes,
      ].map(cell).join(','));
    }
    const csv = '﻿' + lines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Exportados ${rows.length} contacto(s)`);
  });

  // ── Editor genérico (rejilla de tarjetas + drawer) ────────
  function makeCrud(cfg) {
    // cfg: { path, listEl, overlayEl, titleEl, firstField, deleteBtn, toForm, fromForm, renderItem, errorEl, entityName, blank }
    let currentId = null;
    function open(title) {
      if (cfg.titleEl && title) cfg.titleEl.textContent = title;
      cfg.overlayEl.classList.add('is-open');
      if (cfg.firstField) setTimeout(() => { const el = $(cfg.firstField); if (el) el.focus(); }, 60);
    }
    function close() {
      cfg.overlayEl.classList.remove('is-open');
      if (cfg.errorEl) cfg.errorEl.textContent = '';
      currentId = null; mark(null);
    }
    function mark(id) { $(cfg.listEl).querySelectorAll('.admin-item').forEach((it) => it.classList.toggle('is-active', Number(it.getAttribute('data-id')) === id)); }
    async function load() {
      const r = await api(cfg.path);
      if (!guard(r)) return;
      if (!r.ok) { $(cfg.listEl).innerHTML = '<p class="admin-muted">No se pudo cargar.</p>'; return; }
      const items = r.body.data;
      $(cfg.listEl).innerHTML = items.length
        ? items.map(cfg.renderItem).join('')
        : '<p class="admin-muted">Aún no hay elementos.</p>';
      $(cfg.listEl).querySelectorAll('.admin-item').forEach((it) => it.addEventListener('click', () => edit(Number(it.getAttribute('data-id')))));
    }
    async function edit(id) {
      const r = await api(`${cfg.path}/${id}`);
      if (!r.ok) return;
      currentId = id; cfg.toForm(r.body.data); cfg.deleteBtn.hidden = false; open(`Editar ${cfg.entityName.toLowerCase()}`); mark(id);
    }
    function create() { cfg.toForm(cfg.blank || {}); cfg.deleteBtn.hidden = true; currentId = null; open(`Nuevo ${cfg.entityName.toLowerCase()}`); mark(null); }
    async function save() {
      if (cfg.errorEl) cfg.errorEl.textContent = '';
      const payload = cfg.fromForm();
      const r = await api(currentId ? `${cfg.path}/${currentId}` : cfg.path, { method: currentId ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      if (r.ok) { await load(); toast(`${cfg.entityName} guardado`); close(); }
      else { const m = (r.body && r.body.error) || 'No se pudo guardar.'; if (cfg.errorEl) cfg.errorEl.textContent = m; toast(m, 'error'); }
    }
    async function remove() {
      if (!currentId) return;
      const okc = await confirmDialog({ title: `Eliminar ${cfg.entityName.toLowerCase()}`, message: '¿Seguro? Esta acción no se puede deshacer.', confirmText: 'Eliminar', danger: true });
      if (!okc) return;
      const r = await api(`${cfg.path}/${currentId}`, { method: 'DELETE' });
      if (r.ok) { close(); load(); toast(`${cfg.entityName} eliminado`); } else toast('No se pudo eliminar', 'error');
    }
    // Cierre por scrim, botón ✕ del encabezado o Escape.
    cfg.overlayEl.addEventListener('click', (e) => { if (e.target === cfg.overlayEl) close(); });
    cfg.overlayEl.querySelectorAll('[data-drawer-close]').forEach((b) => b.addEventListener('click', close));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && cfg.overlayEl.classList.contains('is-open')) close(); });
    return { load, create, save, remove, close };
  }

  // ── Editor de texto enriquecido (contenteditable + execCommand) ──
  // Fábrica de editor: cada instancia gestiona su propia área, toolbar y rango.
  // Se usa en el blog y en las páginas legales.
  // ── Barra flotante de imagen (alinear / redimensionar / eliminar) ─────────
  // Singleton compartido por todos los editores enriquecidos. Aparece al hacer clic
  // en una imagen del área editable y actúa sobre esa imagen.
  let imgBar = null, imgBarTarget = null, imgBarChanged = null;
  function hideImgBar() { if (imgBar) imgBar.style.display = 'none'; imgBarTarget = null; imgBarChanged = null; }
  function positionImgBar() {
    if (!imgBar || !imgBarTarget) return;
    const r = imgBarTarget.getBoundingClientRect();
    imgBar.style.top = `${Math.max(6, r.top - 42)}px`;
    imgBar.style.left = `${Math.max(6, r.left)}px`;
  }
  // Redimensiona por el atributo width (px), lo email-safe. El CSS max-width:100%
  // evita que se desborde del editor aunque el ancho lógico sea mayor.
  function resizeImg(img, factor) {
    const cur = parseInt(img.getAttribute('width'), 10) || img.clientWidth || img.naturalWidth || 300;
    img.setAttribute('width', String(Math.max(40, Math.min(Math.round(cur * factor), 1000))));
  }
  // Alinea envolviendo la imagen en su propio párrafo con text-align (email-safe).
  function alignImg(img, dir) {
    let block = img.parentElement;
    if (!block || block.classList.contains('rt__area') || block.textContent.trim() !== '') {
      const p = document.createElement('p');
      img.replaceWith(p); p.appendChild(img);
      block = p;
    }
    block.style.textAlign = dir;
  }
  function buildImgBar() {
    imgBar = document.createElement('div');
    imgBar.className = 'rt-imgbar';
    imgBar.innerHTML =
      '<button type="button" data-a="left" title="Alinear a la izquierda">⯇</button>' +
      '<button type="button" data-a="center" title="Centrar">▤</button>' +
      '<button type="button" data-a="right" title="Alinear a la derecha">⯈</button>' +
      '<span class="rt-imgbar__sep"></span>' +
      '<button type="button" data-a="smaller" title="Reducir tamaño">−</button>' +
      '<button type="button" data-a="bigger" title="Aumentar tamaño">+</button>' +
      '<span class="rt-imgbar__sep"></span>' +
      '<button type="button" data-a="delete" title="Eliminar imagen">🗑</button>';
    imgBar.addEventListener('mousedown', (e) => e.preventDefault()); // no perder la imagen seleccionada
    imgBar.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || !imgBarTarget) return;
      const a = b.getAttribute('data-a');
      if (a === 'delete') { imgBarTarget.remove(); if (imgBarChanged) imgBarChanged(); hideImgBar(); return; }
      if (a === 'bigger') resizeImg(imgBarTarget, 1.15);
      else if (a === 'smaller') resizeImg(imgBarTarget, 0.85);
      else alignImg(imgBarTarget, a);
      if (imgBarChanged) imgBarChanged();
      positionImgBar();
    });
    document.body.appendChild(imgBar);
    // Al hacer scroll o cambiar el tamaño, la posición fija dejaría de coincidir: se oculta.
    window.addEventListener('scroll', hideImgBar, true);
    window.addEventListener('resize', hideImgBar);
  }
  function showImgBar(img, onChange) {
    if (!imgBar) buildImgBar();
    imgBarTarget = img;
    imgBarChanged = onChange;
    imgBar.style.display = 'flex';
    positionImgBar();
  }

  function makeRichEditor(rtArea, rtToolbar) {
    let savedRange = null;
    function saveRange() { const s = window.getSelection(); if (s && s.rangeCount && rtArea.contains(s.anchorNode)) savedRange = s.getRangeAt(0).cloneRange(); }
    function restoreRange() { if (savedRange) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(savedRange); } }
    function togglePlaceholder() { rtArea.classList.toggle('is-empty', rtArea.textContent.trim() === '' && !rtArea.querySelector('img, ul, ol, blockquote')); }
    rtArea.addEventListener('keyup', saveRange);
    rtArea.addEventListener('mouseup', saveRange);
    rtArea.addEventListener('input', togglePlaceholder);
    // Clic sobre una imagen: abre la barra flotante (alinear / redimensionar / borrar).
    rtArea.addEventListener('click', (e) => {
      if (e.target && e.target.tagName === 'IMG') {
        showImgBar(e.target, () => rtArea.dispatchEvent(new Event('input', { bubbles: true })));
      } else {
        hideImgBar();
      }
    });
    rtToolbar.addEventListener('mousedown', async (e) => {
      const btn = e.target.closest('.rt__btn');
      if (!btn) return;
      e.preventDefault(); // conserva la selección del área editable
      const cmd = btn.getAttribute('data-cmd');
      rtArea.focus(); restoreRange();
      if (cmd === 'createLink') {
        saveRange();
        const url = await promptDialog({ title: 'Insertar enlace', label: 'URL del enlace', placeholder: 'https://…' });
        rtArea.focus(); restoreRange();
        if (url) document.execCommand('createLink', false, url);
      } else if (cmd === 'image') {
        saveRange();
        pickAndInsertImage();
        return;
      } else if (cmd === 'formatBlock') {
        document.execCommand('formatBlock', false, btn.getAttribute('data-value'));
      } else if (cmd === 'foreColor') {
        // styleWithCSS produce <span style="color:…"> (lo que el sanitizador permite),
        // en vez del <font color> heredado que se descartaría.
        document.execCommand('styleWithCSS', false, true);
        document.execCommand('foreColor', false, btn.getAttribute('data-value'));
        document.execCommand('styleWithCSS', false, false);
      } else {
        document.execCommand(cmd, false, null);
      }
      saveRange();
      togglePlaceholder();
    });
    // ── Inserción de imágenes ─────────────────────────────────
    // Sube el archivo a /api/media (se guarda en la BD) y lo inserta con URL
    // ABSOLUTA (para que se vea en el correo, no solo en el panel) y un ancho tope
    // de 600px (email-safe). El saneador permite <img src alt width> con http/https.
    let fileInput = null;
    function pickAndInsertImage() {
      if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.hidden = true;
        fileInput.addEventListener('change', uploadPicked);
        document.body.appendChild(fileInput);
      }
      fileInput.value = '';
      fileInput.click();
    }
    async function uploadPicked() {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('image', file);
      let res, body = null;
      try {
        res = await withLoader(fetch('/api/admin/uploads', { method: 'POST', credentials: 'same-origin', headers: csrfHeader(), body: fd }));
        try { body = await res.json(); } catch (_) { /* sin cuerpo */ }
      } catch (_) { toast('No se pudo subir la imagen.', 'error'); return; }
      if (!res.ok || !body || !body.success) { toast((body && body.error) || 'No se pudo subir la imagen.', 'error'); return; }
      const url = new URL(body.data.url, location.origin).href;
      // Precarga para conocer el tamaño real y no ampliar imágenes pequeñas.
      const probe = new Image();
      probe.onload = () => { insertImageUrl(url, Math.min(probe.naturalWidth || 600, 600)); toast('Imagen insertada'); };
      probe.onerror = () => { insertImageUrl(url, 0); toast('Imagen insertada'); };
      probe.src = url;
    }
    // Garantiza un punto de inserción dentro del área editable: si el foco se perdió
    // al abrir el selector de archivos, coloca el caret al final.
    function ensureCaretInEditor() {
      const sel = window.getSelection();
      if (sel && sel.rangeCount && rtArea.contains(sel.anchorNode)) return sel;
      const r = document.createRange();
      r.selectNodeContents(rtArea);
      r.collapse(false);
      sel.removeAllRanges();
      sel.addRange(r);
      return sel;
    }
    // Inserta la imagen por DOM (más fiable que execCommand) y avisa del cambio para
    // repintar la vista previa. Luego se alinea/redimensiona con la barra flotante.
    function insertImageUrl(url, width) {
      rtArea.focus();
      restoreRange();
      const sel = ensureCaretInEditor();
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const img = document.createElement('img');
      img.src = url;
      img.alt = '';
      if (width) img.setAttribute('width', String(width));
      range.insertNode(img);
      range.setStartAfter(img);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      saveRange();
      rtArea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    return {
      set(html) { hideImgBar(); rtArea.innerHTML = html || ''; togglePlaceholder(); },
      get() { return rtArea.innerHTML.trim(); },
    };
  }
  try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (_) { /* navegador antiguo */ }

  const richEditor = makeRichEditor($('rt-area'), $('rt-toolbar'));

  // ── Páginas legales (Términos/Privacidad/Cookies) — mismo editor enriquecido ──
  const legalEditor = makeRichEditor($('rt-legal-area'), $('rt-legal-toolbar'));
  let legalData = null;
  let legalCurrent = 'terminos';
  async function loadLegal() {
    const r = await api('/api/admin/legal');
    if (!guard(r) || !r.ok) return;
    legalData = r.body.data;
    legalCurrent = $('legal-page').value || 'terminos';
    legalEditor.set(legalData[legalCurrent] || '');
  }
  $('legal-page').addEventListener('change', () => {
    // Conserva en memoria lo editado de la página anterior al cambiar de pestaña.
    if (legalData) legalData[legalCurrent] = legalEditor.get();
    legalCurrent = $('legal-page').value;
    legalEditor.set((legalData && legalData[legalCurrent]) || '');
  });
  $('legal-save').addEventListener('click', async () => {
    $('legal-error').textContent = '';
    const slug = $('legal-page').value;
    const r = await api(`/api/admin/legal/${slug}`, { method: 'PUT', body: JSON.stringify({ html: legalEditor.get() }) });
    if (r.ok) {
      if (legalData) legalData[slug] = r.body.data.html;
      legalEditor.set(r.body.data.html);
      toast('Página legal guardada');
    } else {
      const m = (r.body && r.body.error) || 'No se pudo guardar.';
      $('legal-error').textContent = m; toast(m, 'error');
    }
  });

  // ── Portada: subida + reposición por arrastre ──
  let coverPos = '50% 50%';
  const coverPrev = $('cover-preview');
  const coverHandle = $('cover-handle');

  function parsePos(v) { const m = String(v || '').match(/(-?\d+)%\s+(-?\d+)%/); return m ? [Number(m[1]), Number(m[2])] : [50, 50]; }
  function applyCoverPos() {
    coverPrev.style.backgroundPosition = coverPos;
    const [x, y] = parsePos(coverPos);
    coverHandle.style.left = x + '%';
    coverHandle.style.top = y + '%';
  }
  function setCoverPos(x, y) {
    const cx = Math.max(0, Math.min(100, Math.round(x)));
    const cy = Math.max(0, Math.min(100, Math.round(y)));
    coverPos = `${cx}% ${cy}%`;
    applyCoverPos();
  }
  function updateCoverPreview() {
    const url = $('f-cover').value.trim();
    if (url) {
      coverPrev.style.backgroundImage = `url("${url.replace(/"/g, '%22')}")`;
      coverPrev.classList.add('has-img');
      $('cover-clear').hidden = false;
      applyCoverPos();
    } else {
      coverPrev.style.backgroundImage = '';
      coverPrev.classList.remove('has-img');
      $('cover-clear').hidden = true;
    }
  }

  // Arrastrar sobre la vista previa mueve el punto de enfoque de la portada.
  let coverDragging = false;
  function coverPointer(e) {
    const r = coverPrev.getBoundingClientRect();
    setCoverPos(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
  }
  coverPrev.addEventListener('pointerdown', (e) => {
    if (!coverPrev.classList.contains('has-img')) return;
    coverDragging = true;
    coverPrev.setPointerCapture(e.pointerId);
    coverPointer(e);
  });
  coverPrev.addEventListener('pointermove', (e) => { if (coverDragging) coverPointer(e); });
  coverPrev.addEventListener('pointerup', () => { coverDragging = false; });
  coverPrev.addEventListener('pointercancel', () => { coverDragging = false; });

  $('cover-btn').addEventListener('click', () => $('cover-file').click());
  $('cover-clear').addEventListener('click', () => { $('f-cover').value = ''; coverPos = '50% 50%'; updateCoverPreview(); });
  $('f-cover').addEventListener('input', updateCoverPreview);
  $('cover-file').addEventListener('change', async () => {
    const file = $('cover-file').files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    const res = await withLoader(fetch('/api/admin/uploads', { method: 'POST', credentials: 'same-origin', headers: csrfHeader(), body: fd }));
    let body = null; try { body = await res.json(); } catch (_) { /* sin cuerpo */ }
    if (res.ok && body && body.success) { $('f-cover').value = body.data.url; updateCoverPreview(); toast('Imagen subida'); }
    else toast((body && body.error) || 'No se pudo subir la imagen.', 'error');
    $('cover-file').value = '';
  });

  // ── BLOG ──────────────────────────────────────────────────
  const blog = makeCrud({
    path: '/api/admin/posts', listEl: 'admin-list', overlayEl: $('blog-overlay'), titleEl: $('blog-title'), firstField: 'f-title',
    deleteBtn: $('delete-btn'), errorEl: $('editor-error'), entityName: 'Artículo',
    blank: { status: 'draft', author: 'Juan José Jolón Granados' },
    renderItem: (p) => `<div class="admin-item" data-id="${p.id}"><div class="admin-item__title">${esc(p.title)}</div><div class="admin-item__meta"><span class="badge-status ${p.status}">${p.status === 'published' ? 'Publicado' : 'Borrador'}</span><span>${esc(p.category)}</span></div></div>`,
    toForm: (p) => { $('f-id').value = p.id || ''; $('f-title').value = p.title || ''; $('f-category').value = p.category || ''; $('f-author').value = p.author || 'Juan José Jolón Granados'; $('f-slug').value = p.slug || ''; $('f-status').value = p.status || 'draft'; $('f-cover').value = p.coverImage || ''; coverPos = p.coverPosition || '50% 50%'; updateCoverPreview(); $('f-excerpt').value = p.excerpt || ''; richEditor.set(p.content || ''); },
    fromForm: () => ({ slug: $('f-slug').value.trim() || undefined, title: $('f-title').value.trim(), category: $('f-category').value.trim(), author: $('f-author').value.trim(), status: $('f-status').value, coverImage: $('f-cover').value.trim() || undefined, coverPosition: coverPos, excerpt: $('f-excerpt').value.trim() || undefined, content: richEditor.get() }),
  });
  function loadPosts() { blog.load(); }
  $('new-btn').addEventListener('click', blog.create);
  $('save-btn').addEventListener('click', blog.save);
  $('cancel-btn').addEventListener('click', blog.close);
  $('delete-btn').addEventListener('click', blog.remove);

  // ── SERVICIOS ─────────────────────────────────────────────
  const svc = makeCrud({
    path: '/api/admin/services', listEl: 'svc-list', overlayEl: $('svc-overlay'), titleEl: $('svc-title'), firstField: 'sv-title',
    deleteBtn: $('svc-delete'), errorEl: $('svc-error'), entityName: 'Servicio',
    blank: { icon: '⚙️', accentColor: '#8B5CF6' },
    renderItem: (s) => `<div class="admin-item" data-id="${s.id}"><div class="admin-item__title">${esc(s.icon)} ${esc(s.title)}</div><div class="admin-item__meta">${s.isFeatured ? '<span class="badge-status published">Destacado</span>' : ''}<span>${esc((s.tags || []).slice(0, 3).join(', '))}</span></div></div>`,
    toForm: (s) => { $('sv-id').value = s.id || ''; $('sv-title').value = s.title || ''; $('sv-icon').value = s.icon || ''; $('sv-accent').value = s.accentColor || ''; $('sv-slug').value = s.slug || ''; $('sv-desc').value = s.description || ''; $('sv-tags').value = (s.tags || []).join(', '); $('sv-featured').checked = !!s.isFeatured; },
    fromForm: () => ({ slug: $('sv-slug').value.trim() || undefined, title: $('sv-title').value.trim(), icon: $('sv-icon').value.trim(), accentColor: $('sv-accent').value.trim(), description: $('sv-desc').value.trim(), tags: $('sv-tags').value, isFeatured: $('sv-featured').checked }),
  });
  function loadServicesSec() { svc.load(); }
  $('svc-new').addEventListener('click', svc.create);
  $('svc-save').addEventListener('click', svc.save);
  $('svc-cancel').addEventListener('click', svc.close);
  $('svc-delete').addEventListener('click', svc.remove);

  // ── PLANES ────────────────────────────────────────────────
  const plans = makeCrud({
    path: '/api/admin/plans', listEl: 'plan-list', overlayEl: $('plan-overlay'), titleEl: $('plan-title'), firstField: 'pl-name',
    deleteBtn: $('plan-delete'), errorEl: $('plan-error'), entityName: 'Plan',
    blank: { currency: 'USD', accentColor: '#8B5CF6', ctaLabel: 'Elegir plan' },
    renderItem: (p) => `<div class="admin-item" data-id="${p.id}"><div class="admin-item__title">${esc(p.name)} ${p.isPopular ? '⭐' : ''}</div><div class="admin-item__meta"><span>$${fmtNum(p.priceMonthly)} / Q${fmtNum(p.priceMonthlyGtq)}</span></div></div>`,
    toForm: (p) => { $('pl-id').value = p.id || ''; $('pl-name').value = p.name || ''; $('pl-tagline').value = p.tagline || ''; $('pl-usd').value = p.priceMonthly ?? ''; $('pl-gtq').value = p.priceMonthlyGtq ?? ''; $('pl-accent').value = p.accentColor || ''; $('pl-cta').value = p.ctaLabel || ''; $('pl-features').value = (p.features || []).join('\n'); $('pl-services').value = (p.services || []).join('\n'); $('pl-popular').checked = !!p.isPopular; },
    fromForm: () => ({ name: $('pl-name').value.trim(), tagline: $('pl-tagline').value.trim(), priceMonthly: Number($('pl-usd').value) || 0, priceMonthlyGtq: Number($('pl-gtq').value) || 0, currency: 'USD', accentColor: $('pl-accent').value.trim(), ctaLabel: $('pl-cta').value.trim(), features: $('pl-features').value, services: $('pl-services').value, isPopular: $('pl-popular').checked }),
  });
  function loadPlansSec() { plans.load(); }
  $('plan-new').addEventListener('click', plans.create);
  $('plan-save').addEventListener('click', plans.save);
  $('plan-cancel').addEventListener('click', plans.close);
  $('plan-delete').addEventListener('click', plans.remove);

  // ── MUESTRAS (LANDINGS) ───────────────────────────────────
  // Refleja la URL pública y el iframe según el slug actual del formulario.
  function landingSyncUrl() {
    const slug = ($('landing-slug').value.trim() || '').toLowerCase();
    const row = $('landing-url-row');
    if (!slug) { row.hidden = true; return; }
    const url = `${location.origin}/muestras/${slug}`;
    $('landing-url').value = url;
    row.hidden = false;
  }
  const landing = makeCrud({
    path: '/api/admin/landings', listEl: 'landing-list', overlayEl: $('landing-overlay'), titleEl: $('landing-title'), firstField: 'landing-title-in',
    deleteBtn: $('landing-delete'), errorEl: $('landing-error'), entityName: 'Muestra',
    blank: {},
    renderItem: (m) => `<div class="admin-item" data-id="${m.id}"><div class="admin-item__title">🎨 ${esc(m.title)}</div><div class="admin-item__meta"><span>/muestras/${esc(m.slug)}</span></div></div>`,
    toForm: (m) => {
      $('landing-id').value = m.id || '';
      $('landing-title-in').value = m.title || '';
      $('landing-slug').value = m.slug || '';
      $('landing-html').value = m.html || '';
      // Reinicia la previsualización; se recarga bajo demanda con "Previsualizar".
      const frame = $('landing-frame'); frame.hidden = true; frame.removeAttribute('src');
      landingSyncUrl();
    },
    fromForm: () => ({ slug: $('landing-slug').value.trim() || undefined, title: $('landing-title-in').value.trim(), html: $('landing-html').value }),
  });
  function loadLandings() { landing.load(); }
  $('landing-new').addEventListener('click', landing.create);
  $('landing-save').addEventListener('click', landing.save);
  $('landing-cancel').addEventListener('click', landing.close);
  $('landing-delete').addEventListener('click', landing.remove);
  $('landing-slug').addEventListener('input', landingSyncUrl);
  // Copiar / abrir la URL pública.
  $('landing-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('landing-url').value); toast('URL copiada'); }
    catch { $('landing-url').select(); toast('Selecciona y copia (Ctrl+C)', 'error'); }
  });
  $('landing-open').addEventListener('click', () => { const u = $('landing-url').value; if (u) window.open(u, '_blank', 'noopener'); });
  // Subir un archivo .html a la textarea (lectura local, no toca el servidor).
  $('landing-upload').addEventListener('click', () => $('landing-file').click());
  $('landing-file').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { $('landing-html').value = String(reader.result || ''); toast('HTML cargado del archivo'); };
    reader.onerror = () => toast('No se pudo leer el archivo', 'error');
    reader.readAsText(file);
    e.target.value = ''; // permite volver a subir el mismo archivo
  });
  // Previsualiza apuntando el iframe a la URL pública real (/muestras/<slug>): así se
  // ve exactamente lo que sirve producción (con su CSP sandbox). Requiere haber
  // guardado antes; la CSP del panel (frame-src 'self') no permitiría un srcdoc.
  $('landing-preview-btn').addEventListener('click', () => {
    if (!$('landing-id').value) { toast('Guarda la muestra para previsualizarla', 'error'); return; }
    const slug = ($('landing-slug').value.trim() || '').toLowerCase();
    if (!slug) return;
    const frame = $('landing-frame');
    frame.src = `${location.origin}/muestras/${slug}`;
    frame.hidden = false;
  });

  // ── PLANTILLAS DE CORREO ──────────────────────────────────
  const TPL_SEGMENTS = { all: 'Todos', alta: 'Prioridad alta', media: 'Prioridad media', base: 'Prioridad base', 'sin-web': 'Sin sitio web' };
  const tplEditor = makeRichEditor($('rt-tpl-area'), $('rt-tpl-toolbar'));
  const tpl = makeCrud({
    path: '/api/admin/templates', listEl: 'tpl-list', overlayEl: $('tpl-overlay'), titleEl: $('tpl-title'), firstField: 'tpl-name',
    deleteBtn: $('tpl-delete'), errorEl: $('tpl-error'), entityName: 'Plantilla',
    blank: { segment: 'all' },
    renderItem: (t) => `<div class="admin-item" data-id="${t.id}"><div class="admin-item__title">${esc(t.name)}</div><div class="admin-item__meta"><span class="badge-status published">${esc(TPL_SEGMENTS[t.segment] || t.segment)}</span><span>${esc(t.subject)}</span></div></div>`,
    toForm: (t) => { $('tpl-id').value = t.id || ''; $('tpl-name').value = t.name || ''; $('tpl-subject').value = t.subject || ''; $('tpl-segment').value = t.segment || 'all'; tplEditor.set(t.bodyHtml || ''); },
    fromForm: () => ({ name: $('tpl-name').value.trim(), subject: $('tpl-subject').value.trim(), segment: $('tpl-segment').value, bodyHtml: tplEditor.get() }),
  });
  function loadTemplates() { tpl.load(); }
  $('tpl-new').addEventListener('click', tpl.create);
  $('tpl-save').addEventListener('click', tpl.save);
  $('tpl-cancel').addEventListener('click', tpl.close);
  $('tpl-delete').addEventListener('click', tpl.remove);
  // Inserta la variable en el cuerpo (en el punto del cursor) o en el asunto.
  $('tpl-vars').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-var]');
    if (!btn) return;
    const token = `{${btn.getAttribute('data-var')}}`;
    $('rt-tpl-area').focus();
    if (!document.execCommand('insertText', false, token)) {
      $('rt-tpl-area').innerHTML += token; // fallback navegadores sin execCommand
    }
  });

  // ── CADENCIAS DE SEGUIMIENTO ──────────────────────────────
  let cadTemplates = [];
  function tplSelectOptions(selectedId) {
    const opts = ['<option value="">— Elige plantilla —</option>'];
    let found = false;
    for (const t of cadTemplates) {
      const sel = String(t.id) === String(selectedId) ? ' selected' : '';
      if (sel) found = true;
      opts.push(`<option value="${t.id}"${sel}>${esc(t.name)}</option>`);
    }
    // Plantilla referenciada pero ya borrada: se conserva su id para no perderla.
    if (selectedId && !found) opts.push(`<option value="${esc(selectedId)}" selected>#${esc(selectedId)} (borrada)</option>`);
    return opts.join('');
  }
  function addStepRow(step) {
    const row = document.createElement('div');
    row.className = 'cad-step';
    row.innerHTML = `
      <label class="cad-step__delay">Espera <input type="number" min="0" class="cad-step-delay" value="${Number(step && step.delayDays) || 0}" /> día(s)</label>
      <select class="cad-step-tpl">${tplSelectOptions(step && step.templateId)}</select>
      <button type="button" class="btn-danger cad-step-del" title="Quitar paso">✕</button>`;
    row.querySelector('.cad-step-del').addEventListener('click', () => row.remove());
    $('cad-steps').appendChild(row);
  }
  const cad = makeCrud({
    path: '/api/admin/cadences', listEl: 'cad-list', overlayEl: $('cad-overlay'), titleEl: $('cad-title'), firstField: 'cad-name',
    deleteBtn: $('cad-delete'), errorEl: $('cad-error'), entityName: 'Cadencia',
    blank: { isActive: true, steps: [] },
    renderItem: (c) => `<div class="admin-item" data-id="${c.id}"><div class="admin-item__title">${esc(c.name)}</div><div class="admin-item__meta"><span class="badge-status ${c.isActive ? 'published' : 'draft'}">${c.isActive ? 'Activa' : 'Inactiva'}</span><span>${(c.steps || []).length} paso(s)</span></div></div>`,
    toForm: (c) => {
      $('cad-id').value = c.id || '';
      $('cad-name').value = c.name || '';
      $('cad-active').checked = c.isActive !== false;
      $('cad-steps').innerHTML = '';
      const steps = (c.steps && c.steps.length) ? c.steps : [{ delayDays: 0, templateId: '' }];
      steps.forEach(addStepRow);
    },
    fromForm: () => ({
      name: $('cad-name').value.trim(),
      isActive: $('cad-active').checked,
      steps: Array.from($('cad-steps').querySelectorAll('.cad-step')).map((row) => ({
        delayDays: Number(row.querySelector('.cad-step-delay').value) || 0,
        templateId: Number(row.querySelector('.cad-step-tpl').value) || 0,
      })),
    }),
  });
  async function loadCadences() {
    // Las plantillas alimentan los selectores de cada paso.
    const tr = await api('/api/admin/templates');
    if (!guard(tr)) return;
    cadTemplates = (tr.ok && tr.body.data) || [];
    cad.load();
  }
  $('cad-new').addEventListener('click', cad.create);
  $('cad-save').addEventListener('click', cad.save);
  $('cad-cancel').addEventListener('click', cad.close);
  $('cad-delete').addEventListener('click', cad.remove);
  $('cad-add-step').addEventListener('click', () => addStepRow({ delayDays: 0, templateId: '' }));
  $('cad-process').addEventListener('click', async () => {
    const r = await api('/api/admin/cadences/process', { method: 'POST' });
    if (!guard(r)) return;
    if (r.ok) { const d = r.body.data; toast(`Procesadas ${d.processed} · ${d.sent} enviadas · ${d.completed} completadas`); }
    else toast((r.body && r.body.error) || 'No se pudo procesar.', 'error');
  });

  // Cache de plantillas para el compositor de correo (se refresca al abrirlo).
  let mailTemplates = [];

  // Sustitución de variables en cliente (espejo de domain/services/renderTemplate),
  // solo para la vista previa. El envío real lo renderiza el servidor.
  function varVals(c) {
    return { nombre: c.name || '', empresa: c.company || c.name || '', sector: c.sector || '', ubicacion: c.location || '', sitio: c.website || '' };
  }
  function fillSubject(text, c) {
    const v = varVals(c);
    return String(text || '').replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
  }
  function fillBody(html, c) {
    const v = varVals(c);
    return String(html || '').replace(/\{(\w+)\}/g, (m, k) => (k in v ? esc(v[k]) : m));
  }

  const MSG_STATUS = { sent: 'Enviado', failed: 'Falló', received: 'Recibido', read: 'Leído' };

  function messageItem(m) {
    const when = m.createdAt ? new Date(m.createdAt).toLocaleString('es-GT') : '—';
    const dirIcon = m.direction === 'out' ? '↑' : '↓';
    const okStatus = m.status === 'sent' || m.status === 'received' || m.status === 'read';
    return `
      <details class="mail-msg mail-msg--${esc(m.direction)}">
        <summary>
          <span class="mail-msg__dir">${dirIcon}</span>
          <span class="mail-msg__subject">${esc(m.subject)}</span>
          <span class="badge-status ${okStatus ? 'published' : 'draft'}">${esc(MSG_STATUS[m.status] || m.status)}</span>
          <span class="mail-msg__date">${esc(when)}</span>
        </summary>
        <div class="mail-msg__body">${m.bodyHtml || '<em>(sin contenido)</em>'}</div>
      </details>`;
  }

  const RUN_STATUS = { active: 'En curso', completed: 'Completada', stopped: 'Detenida' };

  // Compositor de correo + historial + cadencias de un contacto (modal).
  async function openMailComposer(contact) {
    const [tplRes, msgRes, cadRes, runRes] = await Promise.all([
      api('/api/admin/templates'),
      api(`/api/admin/contacts/${contact.id}/messages`),
      api('/api/admin/cadences'),
      api(`/api/admin/contacts/${contact.id}/cadences`),
    ]);
    if (!guard(tplRes) || !guard(msgRes)) return;
    mailTemplates = (tplRes.ok && tplRes.body.data) || [];
    const messages = (msgRes.ok && msgRes.body.data) || [];
    const cadences = ((cadRes.ok && cadRes.body.data) || []).filter((c) => c.isActive);
    let runs = (runRes.ok && runRes.body.data) || [];
    const cadName = (id) => { const c = ((cadRes.ok && cadRes.body.data) || []).find((x) => String(x.id) === String(id)); return c ? c.name : `#${id}`; };
    const renderRuns = (list) => list.length
      ? list.map((r) => `<li>${esc(cadName(r.cadenceId))} — <span class="badge-status ${r.status === 'active' ? 'published' : 'draft'}">${esc(RUN_STATUS[r.status] || r.status)}</span> <span class="admin-hint">paso ${r.currentStep}</span></li>`).join('')
      : '<li class="admin-muted">Sin cadencias.</li>';
    const cadOptions = ['<option value="">— Elige cadencia —</option>']
      .concat(cadences.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`)).join('');

    const tplOptions = ['<option value="">— Escribir a mano —</option>']
      .concat(mailTemplates.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`))
      .join('');
    const advanceDefault = contact.stage === 'nuevo' ? 'checked' : '';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal modal--wide" role="dialog" aria-modal="true" aria-label="Enviar correo">
        <h3 class="modal__title">Enviar correo a ${esc(contact.name)}</h3>
        <p class="mail-to">Para: <strong>${esc(contact.email)}</strong></p>
        <div class="admin-field"><label>Plantilla</label><select class="modal__input" id="mail-tpl">${tplOptions}</select></div>
        <div class="admin-field"><label>Asunto *</label><input class="modal__input" id="mail-subject" type="text" placeholder="Asunto del correo" /></div>
        <div class="admin-field"><label>Mensaje *</label>
          <div class="rt">
            <div class="rt__toolbar" id="mail-rt-toolbar">
              <button type="button" class="rt__btn" data-cmd="bold" title="Negrita"><b>B</b></button>
              <button type="button" class="rt__btn" data-cmd="italic" title="Cursiva"><i>I</i></button>
              <button type="button" class="rt__btn" data-cmd="underline" title="Subrayado"><u>U</u></button>
              <span class="rt__sep"></span>
              <button type="button" class="rt__btn" data-cmd="insertUnorderedList" title="Lista con viñetas">• Lista</button>
              <button type="button" class="rt__btn" data-cmd="insertOrderedList" title="Lista numerada">1. Lista</button>
              <button type="button" class="rt__btn" data-cmd="createLink" title="Insertar enlace">🔗</button>
              <button type="button" class="rt__btn" data-cmd="image" title="Insertar imagen">🖼️</button>
              <span class="rt__sep"></span>
              <button type="button" class="rt__btn rt__color" data-cmd="foreColor" data-value="#111827" title="Negro" style="--sw:#111827"></button>
              <button type="button" class="rt__btn rt__color" data-cmd="foreColor" data-value="#6c5ffc" title="Violeta" style="--sw:#6c5ffc"></button>
              <button type="button" class="rt__btn rt__color" data-cmd="foreColor" data-value="#2563eb" title="Azul" style="--sw:#2563eb"></button>
              <button type="button" class="rt__btn rt__color" data-cmd="foreColor" data-value="#0ab39c" title="Verde" style="--sw:#0ab39c"></button>
              <button type="button" class="rt__btn rt__color" data-cmd="foreColor" data-value="#f59e0b" title="Ámbar" style="--sw:#f59e0b"></button>
              <button type="button" class="rt__btn rt__color" data-cmd="foreColor" data-value="#e11d48" title="Rojo" style="--sw:#e11d48"></button>
              <span class="rt__sep"></span>
              <button type="button" class="rt__btn" data-cmd="removeFormat" title="Quitar formato">✕</button>
            </div>
            <div class="rt__area mail-body" id="mail-body" contenteditable="true" data-placeholder="Escribe el mensaje…"></div>
          </div>
        </div>
        <label class="mail-advance"><input type="checkbox" id="mail-advance" ${advanceDefault} /> Avanzar a "Contactado" al enviar</label>
        <details class="mail-preview"><summary>Vista previa (con los datos del contacto)</summary><div class="mail-preview__box"><p class="mail-preview__subject" id="mail-prev-subject"></p><div id="mail-prev-body"></div></div></details>
        <p class="admin-error" id="mail-error"></p>
        <div class="modal__actions">
          <button class="btn-ghost" data-act="cancel">Cerrar</button>
          <button class="btn-primary" data-act="send">Enviar</button>
        </div>
        <h4 class="mail-history__title">Cadencias de seguimiento</h4>
        <ul class="mail-runs" id="mail-runs">${renderRuns(runs)}</ul>
        <div class="mail-enroll">
          <select class="modal__input" id="mail-cadence">${cadOptions}</select>
          <button class="btn-ghost" data-act="enroll"${cadences.length ? '' : ' disabled'}>Inscribir</button>
        </div>
        <h4 class="mail-history__title" id="mail-history-title">Historial (${messages.length})</h4>
        <div class="mail-history" id="mail-history">${messages.length ? messages.map(messageItem).join('') : '<p class="admin-muted">Aún no hay correos con este contacto.</p>'}</div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('is-open'));

    const selEl = overlay.querySelector('#mail-tpl');
    const subjEl = overlay.querySelector('#mail-subject');
    const bodyEl = overlay.querySelector('#mail-body');
    const errEl = overlay.querySelector('#mail-error');
    // Barra de formato (negrita, listas, enlace, color) sobre el cuerpo del correo.
    makeRichEditor(bodyEl, overlay.querySelector('#mail-rt-toolbar'));

    function refreshPreview() {
      overlay.querySelector('#mail-prev-subject').textContent = fillSubject(subjEl.value, contact) || '(sin asunto)';
      overlay.querySelector('#mail-prev-body').innerHTML = fillBody(bodyEl.innerHTML, contact);
    }
    selEl.addEventListener('change', () => {
      const t = mailTemplates.find((x) => String(x.id) === selEl.value);
      if (t) { subjEl.value = t.subject; bodyEl.innerHTML = t.bodyHtml; }
      refreshPreview();
    });
    subjEl.addEventListener('input', refreshPreview);
    bodyEl.addEventListener('input', refreshPreview);

    function close() { overlay.classList.remove('is-open'); setTimeout(() => overlay.remove(), 180); }
    overlay.addEventListener('click', async (e) => {
      if (e.target === overlay) return close();
      const a = e.target.closest('[data-act]');
      if (!a) return;
      if (a.getAttribute('data-act') === 'cancel') return close();
      if (a.getAttribute('data-act') === 'enroll') {
        errEl.textContent = '';
        const cadenceId = overlay.querySelector('#mail-cadence').value;
        if (!cadenceId) { errEl.textContent = 'Elige una cadencia.'; return; }
        a.disabled = true;
        const er = await api(`/api/admin/contacts/${contact.id}/enroll`, { method: 'POST', body: JSON.stringify({ cadenceId: Number(cadenceId) }) });
        a.disabled = false;
        if (!er.ok) { errEl.textContent = (er.body && er.body.error) || 'No se pudo inscribir.'; return; }
        toast('Contacto inscrito en la cadencia');
        const fr = await api(`/api/admin/contacts/${contact.id}/cadences`);
        runs = (fr.ok && fr.body.data) || [];
        overlay.querySelector('#mail-runs').innerHTML = renderRuns(runs);
        overlay.querySelector('#mail-cadence').value = '';
        return;
      }
      // Enviar
      errEl.textContent = '';
      if (!subjEl.value.trim() || !bodyEl.innerHTML.trim()) { errEl.textContent = 'El asunto y el mensaje son obligatorios.'; return; }
      a.disabled = true;
      const res = await api(`/api/admin/contacts/${contact.id}/email`, {
        method: 'POST',
        body: JSON.stringify({
          templateId: selEl.value || null,
          subject: subjEl.value.trim(),
          bodyHtml: bodyEl.innerHTML,
          advanceStage: overlay.querySelector('#mail-advance').checked,
        }),
      });
      a.disabled = false;
      if (!res.ok) { errEl.textContent = (res.body && res.body.error) || 'No se pudo enviar.'; return; }
      const sent = res.body && res.body.sent;
      if (sent === false) toast('Registrado, pero SMTP no está configurado: el correo no salió.', 'error');
      else toast('Correo enviado');
      // Refresca el historial y, si se avanzó, la etapa local.
      if (sent && overlay.querySelector('#mail-advance').checked && contact.stage === 'nuevo') {
        contact.stage = 'contactado';
        const card = document.querySelector(`.contact-card[data-id="${contact.id}"] .crm-stage`);
        if (card) card.value = 'contactado';
      }
      const fresh = await api(`/api/admin/contacts/${contact.id}/messages`);
      const list = (fresh.ok && fresh.body.data) || [];
      overlay.querySelector('#mail-history').innerHTML = list.length ? list.map(messageItem).join('') : '<p class="admin-muted">Aún no hay correos con este contacto.</p>';
      overlay.querySelector('#mail-history-title').textContent = `Historial (${list.length})`;
      subjEl.value = ''; bodyEl.innerHTML = ''; selEl.value = ''; refreshPreview();
    });
  }

  // ── CONTACTO ──────────────────────────────────────────────
  async function loadContact() {
    const r = await api('/api/admin/config');
    if (!guard(r) || !r.ok) return;
    const d = r.body.data;
    $('c-email').value = d.contactEmail || '';
    $('c-wa').value = d.whatsappNumber || '';
    $('c-msg').value = d.whatsappMessage || '';
    $('ts-enabled').checked = !!d.turnstileEnabled;
    $('ts-site').value = d.turnstileSiteKey || '';
    // Los secretos no llegan del servidor (enmascarados): se dejan vacíos y solo se
    // reescriben si el admin teclea uno nuevo. El placeholder indica si ya hay uno.
    $('ts-secret').value = '';
    $('ts-secret').placeholder = d.turnstileSecretConfigured ? '•••••••• (ya configurada)' : '0x4AAAAAAA...';
    $('smtp-host').value = d.smtpHost || '';
    $('smtp-port').value = d.smtpPort || '587';
    $('smtp-user').value = d.smtpUser || '';
    $('smtp-pass').value = '';
    $('smtp-pass').placeholder = d.smtpConfigured ? '•••••••• (ya configurada)' : '';
    $('smtp-from').value = d.smtpFrom || '';
    $('smtp-secure').checked = !!d.smtpSecure;
    $('mailhook-url').value = d.mailWebhookUrl || '';
    $('mailhook-secret').value = '';
    $('mailhook-secret').placeholder = d.mailWebhookConfigured ? '•••••••• (ya configurado)' : 'Genera una cadena larga y aleatoria';
    $('mailhook-apitoken').value = '';
    $('mailhook-apitoken').placeholder = d.mailApiConfigured ? '•••••••• (ya configurado)' : 'Bearer token del API';
    $('mailhook-apibase').value = d.mailApiBaseUrl || '';
    $('mailhook-apifolder').value = d.mailApiProcessedFolder || '';
  }
  $('smtp-save').addEventListener('click', async () => {
    $('smtp-error').textContent = '';
    const r = await api('/api/admin/config', { method: 'PUT', body: JSON.stringify({ smtpHost: $('smtp-host').value.trim(), smtpPort: $('smtp-port').value.trim(), smtpUser: $('smtp-user').value.trim(), smtpPass: $('smtp-pass').value, smtpFrom: $('smtp-from').value.trim(), smtpSecure: $('smtp-secure').checked }) });
    if (r.ok) toast('SMTP actualizado'); else { const m = (r.body && r.body.error) || 'No se pudo guardar.'; $('smtp-error').textContent = m; toast(m, 'error'); }
  });
  $('contact-save').addEventListener('click', async () => {
    $('contact-error').textContent = '';
    const r = await api('/api/admin/config', { method: 'PUT', body: JSON.stringify({ contactEmail: $('c-email').value, whatsappNumber: $('c-wa').value, whatsappMessage: $('c-msg').value }) });
    if (r.ok) toast('Contacto actualizado'); else { const m = (r.body && r.body.error) || 'No se pudo guardar.'; $('contact-error').textContent = m; toast(m, 'error'); }
  });
  $('turnstile-save').addEventListener('click', async () => {
    $('turnstile-error').textContent = '';
    const r = await api('/api/admin/config', { method: 'PUT', body: JSON.stringify({ turnstileEnabled: $('ts-enabled').checked, turnstileSiteKey: $('ts-site').value.trim(), turnstileSecretKey: $('ts-secret').value.trim() }) });
    if (r.ok) toast('Protección actualizada'); else { const m = (r.body && r.body.error) || 'No se pudo guardar.'; $('turnstile-error').textContent = m; toast(m, 'error'); }
  });
  $('mailhook-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('mailhook-url').value); toast('URL copiada'); }
    catch (_) { $('mailhook-url').select(); toast('Selecciona y copia la URL', 'error'); }
  });
  $('mailhook-save').addEventListener('click', async () => {
    $('mailhook-error').textContent = '';
    const secret = $('mailhook-secret').value.trim();
    const apiToken = $('mailhook-apitoken').value.trim();
    // URL base y carpeta (no secretos) siempre se envían; los secretos, solo si se
    // teclearon (vacío = "déjalo como está").
    const payload = {
      mailApiBaseUrl: $('mailhook-apibase').value.trim(),
      mailApiProcessedFolder: $('mailhook-apifolder').value.trim(),
    };
    if (secret) payload.mailWebhookSecret = secret;
    if (apiToken) payload.mailApiToken = apiToken;
    const r = await api('/api/admin/config', { method: 'PUT', body: JSON.stringify(payload) });
    if (r.ok) { toast('Correo entrante actualizado'); loadContact(); } else { const m = (r.body && r.body.error) || 'No se pudo guardar.'; $('mailhook-error').textContent = m; toast(m, 'error'); }
  });

  // ── PERFIL ────────────────────────────────────────────────
  let mfaPendingSecret = null;

  async function loadAccount() { await Promise.all([loadProfile(), loadSessions()]); }

  async function loadSessions() {
    const r = await api('/api/admin/account/sessions');
    if (!guard(r) || !r.ok) return;
    const rows = r.body.data || [];
    $('sessions-list').innerHTML = rows.map((s) => {
      const dev = esc((s.userAgent || 'Dispositivo desconocido').slice(0, 60));
      const when = s.lastSeenAt || s.createdAt;
      const meta = `${esc(s.ip || '—')} · ${when ? new Date(when).toLocaleString('es-GT') : ''}`;
      const action = s.current
        ? '<span class="badge-status published">Esta sesión</span>'
        : `<button class="btn-ghost btn-sm" data-session="${s.id}">Cerrar</button>`;
      return `<div class="user-row"><span>${dev} <span class="admin-hint">${meta}</span></span><span class="user-row__actions">${action}</span></div>`;
    }).join('') || '<p class="admin-muted">No hay sesiones activas.</p>';
  }
  $('sessions-list').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-session]');
    if (!btn) return;
    const r = await api(`/api/admin/account/sessions/${btn.getAttribute('data-session')}`, { method: 'DELETE' });
    if (r.ok) { toast('Sesión cerrada'); loadSessions(); }
    else toast((r.body && r.body.error) || 'No se pudo cerrar.', 'error');
  });

  async function loadProfile() {
    const r = await api('/api/admin/account');
    if (!guard(r) || !r.ok) return;
    const u = r.body.data;
    $('profile-username').textContent = u.displayName || u.fullName || u.username;
    $('profile-role').textContent = u.role === 'admin' ? 'Admin' : 'Editor';
    $('p-fullname').value = u.fullName || '';
    $('p-lastname').value = u.lastName || '';
    $('p-displayname').value = u.displayName || '';
    $('p-email').value = u.email || '';
    $('p-role').value = u.role === 'admin' ? 'Admin' : 'Editor';
    $('p-lastlogin').value = u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('es-GT') : 'Nunca';
    // Estado de verificación de correo
    if (!u.email) { $('p-email-status').textContent = 'Sin correo'; $('email-verify-btn').hidden = true; }
    else if (u.emailVerified) { $('p-email-status').textContent = '✅ Verificado'; $('email-verify-btn').hidden = true; }
    else { $('p-email-status').textContent = '⚠️ Sin verificar'; $('email-verify-btn').hidden = false; }
    // Avatar (con su punto de enfoque reposicionable)
    const av = $('profile-avatar');
    avatarPos = u.avatarPosition || '50% 50%';
    if (u.avatar) {
      av.style.backgroundImage = `url("${String(u.avatar).replace(/"/g, '%22')}")`;
      av.style.backgroundPosition = avatarPos;
      av.classList.add('has-img');
      applyAvatarHandle();
    } else {
      av.style.backgroundImage = ''; av.classList.remove('has-img');
      $('profile-initials').textContent = (u.username[0] || '?').toUpperCase();
    }
    // Estado MFA
    $('mfa-off').hidden = u.mfaEnabled;
    $('mfa-on').hidden = !u.mfaEnabled;
    $('mfa-setup').hidden = true;
    $('mfa-backup-view').hidden = true;
    $('mfa-backup-remaining').textContent = u.backupCodesRemaining ?? 0;
  }

  // Muestra (una única vez) los códigos de respaldo recién generados.
  let lastBackupCodes = [];
  function showBackupCodes(codes) {
    lastBackupCodes = codes || [];
    $('mfa-backup-list').innerHTML = lastBackupCodes.map((c) => `<li><code>${esc(c)}</code></li>`).join('');
    $('mfa-off').hidden = true;
    $('mfa-on').hidden = true;
    $('mfa-setup').hidden = true;
    $('mfa-backup-view').hidden = false;
  }

  let currentUserId = null; // id del usuario en sesión (para no auto-gestionarse)
  let currentUserRole = null; // rol en sesión (solo para el gate cosmético de la UI)
  // ── USUARIOS (tabla + drawers) ────────────────────────────
  let allUsers = [];
  function userStatusMeta(u) {
    if (u.deleted) return { label: 'Dado de baja', cls: 'draft' };
    return (u.isActive && u.status === 'active') ? { label: 'Activo', cls: 'published' } : { label: 'Inactivo', cls: 'draft' };
  }
  async function loadUsers() {
    const r = await api('/api/admin/users');
    if (!guard(r) || !r.ok) return;
    allUsers = r.body.data || [];
    const tb = $('users-tbody');
    if (!allUsers.length) { tb.innerHTML = '<tr><td colspan="5" class="admin-muted">Sin usuarios.</td></tr>'; return; }
    tb.innerHTML = allUsers.map((u) => {
      const st = userStatusMeta(u);
      const you = u.id === currentUserId ? ' <span class="admin-hint">(tú)</span>' : '';
      return `<tr data-id="${u.id}"${u.deleted ? ' class="is-deleted"' : ''}>
        <td><div class="u-cell"><span>${esc(u.displayName || u.username)}${you}</span><small>@${esc(u.username)}</small></div></td>
        <td>${u.email ? esc(u.email) : '<span class="admin-hint">—</span>'}</td>
        <td><span class="badge-status ${u.role === 'admin' ? 'published' : 'draft'}">${esc(u.role)}</span></td>
        <td><span class="badge-status ${st.cls}">${st.label}</span></td>
        <td>${u.mfaEnabled ? '🔒 Sí' : '<span class="admin-hint">No</span>'}</td>
      </tr>`;
    }).join('');
    tb.querySelectorAll('tr[data-id]').forEach((tr) => tr.addEventListener('click', () => {
      const u = allUsers.find((x) => String(x.id) === tr.getAttribute('data-id'));
      if (!u) return;
      if (u.id === currentUserId) { toast('Gestiona tu propia cuenta desde Perfil'); return; }
      openUserDrawer(u);
    }));
  }

  // Monta un drawer al vuelo y devuelve utilidades comunes (mismo patrón del CRM).
  function mountDrawer(html) {
    const overlay = document.createElement('div');
    overlay.className = 'drawer-overlay';
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('is-open'));
    function close() { overlay.classList.remove('is-open'); document.removeEventListener('keydown', onKey); setTimeout(() => overlay.remove(), 240); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    return { overlay, close, q: (sel) => overlay.querySelector(sel) };
  }

  function openUserDrawer(u) {
    const val = (v) => esc(v || '');
    const active = u.isActive && u.status === 'active';
    const { overlay, close, q } = mountDrawer(`
      <aside class="drawer" role="dialog" aria-modal="true" aria-label="Editar ${esc(u.username)}">
        <header class="drawer__head">
          <div class="drawer__id">
            <div class="lead-card__avatar" style="--c:${leadColor(u.displayName || u.username)}">${esc(leadInitials(u.displayName || u.username))}</div>
            <div class="drawer__idtext">
              <div class="drawer__name">${esc(u.displayName || u.username)}${u.deleted ? '<span class="badge-archived">Dado de baja</span>' : ''}</div>
              <span class="lead-card__email">@${esc(u.username)}</span>
            </div>
          </div>
          <button class="drawer__close" data-act="cancel" aria-label="Cerrar">✕</button>
        </header>
        <div class="drawer__body">
          <div class="admin-grid-2">
            <div class="admin-field"><label for="du-full">Nombre(s)</label><input type="text" id="du-full" value="${val(u.fullName)}" /></div>
            <div class="admin-field"><label for="du-last">Apellidos</label><input type="text" id="du-last" value="${val(u.lastName)}" /></div>
          </div>
          <div class="admin-field"><label for="du-display">Nombre para mostrar</label><input type="text" id="du-display" value="${val(u.displayName)}" /></div>
          <div class="admin-grid-2">
            <div class="admin-field"><label for="du-email">Correo</label><input type="email" id="du-email" value="${val(u.email)}" /></div>
            <div class="admin-field"><label for="du-role">Rol</label><select id="du-role" class="crm-select"><option value="editor"${u.role === 'editor' ? ' selected' : ''}>Editor</option><option value="admin"${u.role === 'admin' ? ' selected' : ''}>Admin</option></select></div>
          </div>
          <p class="drawer__section">Seguridad</p>
          <div class="user-actions">
            <button type="button" class="btn-ghost" data-act="reset-pass">🔑 Resetear contraseña</button>
            <button type="button" class="btn-ghost" data-act="reset-mfa"${u.mfaEnabled ? '' : ' disabled'}>🔒 Reiniciar 2FA</button>
            <button type="button" class="btn-ghost" data-act="toggle">${active ? '⏸ Desactivar' : '▶ Activar'}</button>
          </div>
        </div>
        <footer class="drawer__foot">
          ${u.deleted
            ? '<button type="button" class="btn-ghost" data-act="restore">Restaurar</button>'
            : '<button type="button" class="btn-danger" data-act="delete">Dar de baja</button>'}
          <div class="drawer__foot-right">
            <button type="button" class="btn-ghost" data-act="cancel">Cancelar</button>
            <button type="button" class="btn-primary" data-act="save">Guardar</button>
          </div>
        </footer>
      </aside>`);

    async function save() {
      const res = await api(`/api/admin/users/${u.id}`, { method: 'PUT', body: JSON.stringify({
        displayName: q('#du-display').value, fullName: q('#du-full').value, lastName: q('#du-last').value,
        email: q('#du-email').value, role: q('#du-role').value,
      }) });
      if (res.ok) { toast('Usuario actualizado'); close(); loadUsers(); }
      else toast((res.body && res.body.error) || 'No se pudo actualizar.', 'error');
    }
    async function resetPass() {
      const temp = await promptDialog({ title: 'Resetear contraseña', label: 'Contraseña temporal (mín. 12). El usuario deberá cambiarla al entrar.', placeholder: 'Contraseña temporal', confirmText: 'Resetear' });
      if (!temp) return;
      const res = await api(`/api/admin/users/${u.id}/reset-password`, { method: 'POST', body: JSON.stringify({ newPassword: temp }) });
      if (res.ok) toast('Contraseña reseteada. El usuario debe cambiarla al entrar.');
      else toast((res.body && res.body.error) || 'No se pudo resetear.', 'error');
    }
    async function resetMfa() {
      const ok = await confirmDialog({ title: 'Reiniciar 2FA', message: `Se desactivará el 2FA de “${u.displayName || u.username}” y se cerrarán sus sesiones. Podrá volver a activarlo desde su perfil.`, confirmText: 'Reiniciar 2FA', danger: true });
      if (!ok) return;
      const res = await api(`/api/admin/users/${u.id}/reset-mfa`, { method: 'POST' });
      if (res.ok) { toast('2FA reiniciado'); close(); loadUsers(); }
      else toast((res.body && res.body.error) || 'No se pudo reiniciar el 2FA.', 'error');
    }
    async function toggle() {
      const res = await api(`/api/admin/users/${u.id}`, { method: 'PUT', body: JSON.stringify({ isActive: !active, status: active ? 'disabled' : 'active' }) });
      if (res.ok) { toast(active ? 'Usuario desactivado' : 'Usuario activado'); close(); loadUsers(); }
      else toast((res.body && res.body.error) || 'No se pudo cambiar el estado.', 'error');
    }
    async function del() {
      const ok = await confirmDialog({ title: 'Dar de baja', message: 'Se marcará como dado de baja y se cerrarán sus sesiones. Podrás restaurarlo después.', confirmText: 'Dar de baja', danger: true });
      if (!ok) return;
      const res = await api(`/api/admin/users/${u.id}`, { method: 'DELETE' });
      if (res.ok) { toast('Usuario dado de baja'); close(); loadUsers(); }
      else toast((res.body && res.body.error) || 'No se pudo completar.', 'error');
    }
    async function restore() {
      const res = await api(`/api/admin/users/${u.id}/restore`, { method: 'POST' });
      if (res.ok) { toast('Usuario restaurado'); close(); loadUsers(); }
      else toast((res.body && res.body.error) || 'No se pudo restaurar.', 'error');
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) return close();
      const a = e.target.closest('[data-act]'); if (!a) return;
      const act = a.getAttribute('data-act');
      if (act === 'save') save();
      else if (act === 'reset-pass') resetPass();
      else if (act === 'reset-mfa') resetMfa();
      else if (act === 'toggle') toggle();
      else if (act === 'delete') del();
      else if (act === 'restore') restore();
      else close();
    });
    setTimeout(() => q('#du-display').focus(), 60);
  }

  function openNewUserDrawer() {
    const { overlay, close, q } = mountDrawer(`
      <aside class="drawer" role="dialog" aria-modal="true" aria-label="Nuevo usuario">
        <header class="drawer__head">
          <div class="drawer__name">Nuevo usuario</div>
          <button class="drawer__close" data-act="cancel" aria-label="Cerrar">✕</button>
        </header>
        <div class="drawer__body">
          <div class="admin-field"><label for="nu-name">Usuario *</label><input type="text" id="nu-name" autocomplete="off" placeholder="nombre.apellido" /></div>
          <div class="admin-field"><label for="nu-role">Rol</label><select id="nu-role" class="crm-select"><option value="editor">Editor</option><option value="admin">Admin</option></select></div>
          <div class="admin-field"><label for="nu-pass">Contraseña <span class="admin-hint">(mín. 12)</span></label><input type="password" id="nu-pass" autocomplete="new-password" /></div>
          <label class="admin-check"><input type="checkbox" id="nu-mustchange" checked /> Requerir cambio de contraseña en el primer acceso</label>
          <p class="admin-error" id="nu-error"></p>
        </div>
        <footer class="drawer__foot">
          <div class="drawer__foot-right">
            <button type="button" class="btn-ghost" data-act="cancel">Cancelar</button>
            <button type="button" class="btn-primary" data-act="save">Crear usuario</button>
          </div>
        </footer>
      </aside>`);
    async function save() {
      q('#nu-error').textContent = '';
      const res = await api('/api/admin/users', { method: 'POST', body: JSON.stringify({
        username: q('#nu-name').value, password: q('#nu-pass').value, role: q('#nu-role').value, mustChangePassword: q('#nu-mustchange').checked,
      }) });
      if (res.ok) { toast('Usuario creado'); close(); loadUsers(); }
      else { const m = (res.body && res.body.error) || 'No se pudo crear.'; q('#nu-error').textContent = m; toast(m, 'error'); }
    }
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) return close();
      const a = e.target.closest('[data-act]'); if (!a) return;
      if (a.getAttribute('data-act') === 'save') save(); else close();
    });
    setTimeout(() => q('#nu-name').focus(), 60);
  }

  $('users-new').addEventListener('click', openNewUserDrawer);

  // Avatar
  $('avatar-btn').addEventListener('click', () => $('avatar-file').click());
  $('avatar-file').addEventListener('change', async () => {
    const file = $('avatar-file').files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    const up = await withLoader(fetch('/api/admin/uploads', { method: 'POST', credentials: 'same-origin', headers: csrfHeader(), body: fd }));
    let ub = null; try { ub = await up.json(); } catch (_) {}
    if (!up.ok || !ub || !ub.success) { toast((ub && ub.error) || 'No se pudo subir la foto.', 'error'); return; }
    const r = await api('/api/admin/account', { method: 'PUT', body: JSON.stringify({ avatar: ub.data.url }) });
    if (r.ok) { loadProfile(); toast('Foto actualizada'); } else toast('No se pudo guardar la foto', 'error');
    $('avatar-file').value = '';
  });

  // Reposición del avatar por arrastre (mismo mecanismo que la portada del blog).
  // Se guarda al pulsar "Guardar perfil".
  let avatarPos = '50% 50%';
  const avEl = $('profile-avatar');
  const avHandle = $('avatar-handle');
  function applyAvatarHandle() {
    if (!avHandle) return;
    const [x, y] = parsePos(avatarPos);
    avHandle.style.left = x + '%';
    avHandle.style.top = y + '%';
  }
  function setAvatarPos(x, y) {
    const cx = Math.max(0, Math.min(100, Math.round(x)));
    const cy = Math.max(0, Math.min(100, Math.round(y)));
    avatarPos = `${cx}% ${cy}%`;
    avEl.style.backgroundPosition = avatarPos;
    applyAvatarHandle();
  }
  let avatarDragging = false;
  function avatarPointer(e) {
    const r = avEl.getBoundingClientRect();
    setAvatarPos(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
  }
  avEl.addEventListener('pointerdown', (e) => {
    if (!avEl.classList.contains('has-img')) return;
    if (e.target.closest('.profile-avatar__btn')) return; // pulsar 📷 no arrastra
    avatarDragging = true; avEl.setPointerCapture(e.pointerId); avatarPointer(e);
  });
  avEl.addEventListener('pointermove', (e) => { if (avatarDragging) avatarPointer(e); });
  avEl.addEventListener('pointerup', () => { avatarDragging = false; });
  avEl.addEventListener('pointercancel', () => { avatarDragging = false; });

  $('profile-save').addEventListener('click', async () => {
    $('profile-error').textContent = '';
    const r = await api('/api/admin/account', { method: 'PUT', body: JSON.stringify({ email: $('p-email').value, fullName: $('p-fullname').value, lastName: $('p-lastname').value, displayName: $('p-displayname').value, avatarPosition: avatarPos }) });
    if (r.ok) { loadProfile(); toast('Perfil actualizado'); }
    else { const m = (r.body && r.body.error) || 'No se pudo guardar.'; $('profile-error').textContent = m; toast(m, 'error'); }
  });
  $('email-verify-btn').addEventListener('click', async () => {
    const r = await api('/api/admin/account/email/verify/send', { method: 'POST' });
    if (!r.ok) { toast((r.body && r.body.error) || 'No se pudo enviar.', 'error'); return; }
    if (r.body.sent) toast('Te enviamos un enlace de verificación a tu correo.');
    else toast('SMTP no configurado: el enlace quedó en el log del servidor (modo dev).', 'success', 5000);
  });

  // MFA: activar
  $('mfa-setup-btn').addEventListener('click', async () => {
    const r = await api('/api/admin/account/mfa/setup', { method: 'POST' });
    if (!r.ok) { toast('No se pudo iniciar el 2FA', 'error'); return; }
    mfaPendingSecret = r.body.data.secret;
    $('mfa-qr').src = r.body.data.qr;
    $('mfa-secret').textContent = r.body.data.secret;
    $('mfa-code').value = '';
    $('mfa-error').textContent = '';
    $('mfa-off').hidden = true;
    $('mfa-setup').hidden = false;
  });
  $('mfa-cancel-btn').addEventListener('click', () => { mfaPendingSecret = null; loadProfile(); });
  $('mfa-enable-btn').addEventListener('click', async () => {
    $('mfa-error').textContent = '';
    const r = await api('/api/admin/account/mfa/enable', { method: 'POST', body: JSON.stringify({ secret: mfaPendingSecret, code: $('mfa-code').value }) });
    if (r.ok) { mfaPendingSecret = null; toast('2FA activado'); showBackupCodes(r.body && r.body.data && r.body.data.backupCodes); }
    else { const m = (r.body && r.body.error) || 'Código incorrecto.'; $('mfa-error').textContent = m; toast(m, 'error'); }
  });
  // Regenerar códigos de respaldo (exige un código TOTP actual).
  $('mfa-regen-btn').addEventListener('click', async () => {
    $('mfa-regen-error').textContent = '';
    const r = await api('/api/admin/account/mfa/backup-codes', { method: 'POST', body: JSON.stringify({ code: $('mfa-regen-code').value }) });
    if (r.ok) { $('mfa-regen-code').value = ''; toast('Códigos regenerados'); showBackupCodes(r.body && r.body.data && r.body.data.backupCodes); }
    else { const m = (r.body && r.body.error) || 'No se pudo regenerar.'; $('mfa-regen-error').textContent = m; toast(m, 'error'); }
  });
  // Acciones de la vista de códigos de respaldo.
  $('mfa-backup-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(lastBackupCodes.join('\n')); toast('Códigos copiados'); }
    catch { toast('No se pudo copiar', 'error'); }
  });
  $('mfa-backup-download').addEventListener('click', () => {
    const blob = new Blob([`Códigos de respaldo — TryCatch GT\n\n${lastBackupCodes.join('\n')}\n`], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'codigos-respaldo-trycatch.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $('mfa-backup-done').addEventListener('click', () => { lastBackupCodes = []; loadProfile(); });
  $('mfa-disable-btn').addEventListener('click', async () => {
    $('mfa-off-error').textContent = '';
    const r = await api('/api/admin/account/mfa/disable', { method: 'POST', body: JSON.stringify({ code: $('mfa-off-code').value }) });
    if (r.ok) { $('mfa-off-code').value = ''; loadProfile(); toast('2FA desactivado'); }
    else { const m = (r.body && r.body.error) || 'No se pudo desactivar.'; $('mfa-off-error').textContent = m; toast(m, 'error'); }
  });

  $('pass-save').addEventListener('click', async () => {
    $('pass-error').textContent = '';
    const r = await api('/api/admin/account/password', { method: 'POST', body: JSON.stringify({ currentPassword: $('a-current').value, newPassword: $('a-new').value }) });
    if (r.ok) { $('a-current').value = ''; $('a-new').value = ''; toast('Contraseña actualizada'); }
    else { const m = (r.body && r.body.error) || 'No se pudo cambiar.'; $('pass-error').textContent = m; toast(m, 'error'); }
  });
  $('sessions-revoke-btn').addEventListener('click', async () => {
    const ok = await confirmDialog({ title: 'Cerrar las demás sesiones', message: 'Se cerrará la sesión en todos los demás dispositivos. Esta sesión se mantiene abierta.', confirmText: 'Cerrar las demás', danger: true });
    if (!ok) return;
    const r = await api('/api/admin/account/sessions/revoke-all', { method: 'POST' });
    if (r.ok) { toast('Se cerraron las demás sesiones'); loadSessions(); }
    else toast((r.body && r.body.error) || 'No se pudo completar.', 'error');
  });
  // Enlace de recuperación de contraseña: /admin/reset-password?token=...
  const bootToken = new URLSearchParams(location.search).get('token');
  if (location.pathname.endsWith('/reset-password') && bootToken) {
    showResetView(bootToken);
  } else {
    checkSession();
  }
})();
