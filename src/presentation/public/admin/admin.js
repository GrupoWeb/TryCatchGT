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

  function showLogin() { loginView.hidden = false; dashboardView.hidden = true; forceView.hidden = true; showLoginStep('password'); }
  function showDashboard() { loginView.hidden = true; dashboardView.hidden = false; forceView.hidden = true; applyRoleGate(currentUserRole); showSection('home'); loadOverview(); }

  // Oculta a los editores las secciones que en el servidor exigen rol admin
  // (contacto/config, auditoría y gestión de usuarios). Es solo cosmético: el
  // control real es requireRole en las rutas.
  function applyRoleGate(role) {
    const isAdmin = role === 'admin';
    // Secciones que en el servidor exigen rol admin: se ocultan sus botones de
    // navegación a los editores. El control real es requireRole en las rutas.
    document.querySelectorAll('.admin__nav-btn[data-section="contact"], .admin__nav-btn[data-section="audit"], .admin__nav-btn[data-section="users"], .admin__nav-btn[data-section="legal"]').forEach((b) => { b.hidden = !isAdmin; });
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
  const loaders = { home: loadOverview, leads: loadLeads, crm: loadCrm, templates: loadTemplates, blog: loadPosts, services: loadServicesSec, plans: loadPlansSec, contact: loadContact, account: loadAccount, users: loadUsers, legal: loadLegal, audit: loadAudit };

  function showSection(name) {
    document.querySelectorAll('.admin-sec').forEach((s) => { s.hidden = s.id !== `sec-${name}`; });
    document.querySelectorAll('.admin__nav-btn').forEach((b) => b.classList.toggle('is-active', b.getAttribute('data-section') === name));
    if (loaders[name]) loaders[name]();
  }
  $('admin-nav').addEventListener('click', (e) => {
    const btn = e.target.closest('.admin__nav-btn');
    if (btn) showSection(btn.getAttribute('data-section'));
  });

  // ── INICIO (overview) ─────────────────────────────────────
  async function loadOverview() {
    const { ok, body } = await api('/api/admin/overview');
    if (!guard({ status: ok ? 200 : 401 })) return;
    if (!ok) return;
    const d = body.data;
    const badge = $('nav-leads');
    if (d.leadsPending > 0) { badge.hidden = false; badge.textContent = d.leadsPending; } else badge.hidden = true;
    const cards = [
      { label: 'Cotizaciones pendientes', value: d.leadsPending, accent: '#EC4899', icon: '📥' },
      { label: 'Cotizaciones totales', value: d.leadsTotal, accent: '#06B6D4', icon: '📊' },
      { label: 'Artículos publicados', value: d.postsPublished, accent: '#4ade80', icon: '✅' },
      { label: 'Borradores', value: d.postsDraft, accent: '#fbbf24', icon: '📝' },
    ];
    $('stat-grid').innerHTML = cards.map((c) => `
      <div class="stat-card" style="--accent:${c.accent}">
        <div class="stat-card__icon">${c.icon}</div>
        <div class="stat-card__value">${c.value}</div>
        <div class="stat-card__label">${esc(c.label)}</div>
      </div>`).join('');
  }

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
  let crmQuery = '', crmTier = 'all', crmWeb = 'all', crmStage = 'all', crmLimit = PAGE;

  async function loadCrm() {
    const r = await api('/api/admin/contacts');
    if (!guard(r)) return;
    if (!r.ok) { $('crm-list').innerHTML = '<p class="admin-muted">No se pudieron cargar los contactos.</p>'; return; }
    allContacts = r.body.data || [];
    crmLimit = PAGE;
    renderContacts();
  }

  function filteredContacts() {
    const q = crmQuery.trim().toLowerCase();
    return allContacts.filter((c) => {
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

  function contactCard(c) {
    const stageOpts = Object.entries(CRM_STAGES)
      .map(([k, v]) => `<option value="${k}" ${k === c.stage ? 'selected' : ''}>${v}</option>`)
      .join('');
    const tierBadge = c.tier ? `<span class="crm-tier crm-tier--${c.tier}">${CRM_TIERS[c.tier]}</span>` : '';
    const webTag = (c.website && c.website.trim())
      ? `<a class="lead-tag" href="${esc(c.website)}" target="_blank" rel="noopener"><span aria-hidden="true">🔗</span> ${esc(c.website.replace(/^https?:\/\//, ''))}</a>`
      : '<span class="lead-tag lead-tag--warn"><span aria-hidden="true">🚫</span> Sin sitio</span>';
    const nextVal = c.nextActionAt ? String(c.nextActionAt).slice(0, 10) : '';
    return `
      <article class="lead-card contact-card" data-id="${c.id}">
        <div class="lead-card__top">
          <div class="lead-card__avatar" style="--c:${leadColor(c.name)}">${esc(leadInitials(c.name))}</div>
          <div class="lead-card__id">
            <div class="lead-card__name">${esc(c.name)}${tierBadge}${c.company ? `<span class="lead-card__company">${esc(c.company)}</span>` : ''}</div>
            <a class="lead-card__email" href="mailto:${esc(c.email)}"><span aria-hidden="true">✉</span> ${esc(c.email)}</a>
          </div>
          <select class="lead-card__status crm-stage" data-id="${c.id}" aria-label="Etapa del pipeline">${stageOpts}</select>
        </div>
        <div class="lead-card__tags">
          ${c.sector ? `<span class="lead-tag"><span aria-hidden="true">🏷️</span> ${esc(c.sector)}</span>` : ''}
          ${c.location ? `<span class="lead-tag"><span aria-hidden="true">📍</span> ${esc(c.location)}</span>` : ''}
          ${webTag}
        </div>
        <div class="crm-card__actions">
          <button class="btn-ghost crm-mail-btn" data-id="${c.id}">✉️ Enviar correo</button>
        </div>
        <details class="crm-followup">
          <summary>Notas y seguimiento</summary>
          <div class="admin-field"><label for="cn-notes-${c.id}">Notas</label><textarea id="cn-notes-${c.id}" class="crm-notes" rows="3">${esc(c.notes || '')}</textarea></div>
          <div class="crm-followup__row">
            <div class="admin-field"><label for="cn-next-${c.id}">Próxima acción</label><input type="date" id="cn-next-${c.id}" class="crm-next" value="${nextVal}" /></div>
            <button class="btn-primary crm-save" data-id="${c.id}">Guardar</button>
          </div>
        </details>
      </article>`;
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
        const res = await api(`/api/admin/contacts/${id}/stage`, { method: 'PATCH', body: JSON.stringify({ stage: sel.value }) });
        if (res.ok) {
          const c = allContacts.find((x) => String(x.id) === id);
          if (c) c.stage = sel.value;
          toast('Etapa actualizada');
        } else toast('No se pudo actualizar la etapa', 'error');
      });
    });
    cont.querySelectorAll('.crm-save').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const notes = cont.querySelector(`#cn-notes-${id}`).value.trim();
        const nextRaw = cont.querySelector(`#cn-next-${id}`).value;
        const res = await api(`/api/admin/contacts/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ notes, nextActionAt: nextRaw || null }),
        });
        if (res.ok) {
          const c = allContacts.find((x) => String(x.id) === id);
          if (c) { c.notes = notes; c.nextActionAt = nextRaw || null; }
          toast('Contacto guardado');
        } else toast((res.body && res.body.error) || 'No se pudo guardar', 'error');
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

  // ── Editor genérico (lista + formulario) ──────────────────
  function makeCrud(cfg) {
    // cfg: { path, listEl, editorEl, emptyEl, deleteBtn, idField, toForm, fromForm, renderItem, errorEl, entityName }
    let currentId = null;
    function open() { cfg.editorEl.hidden = false; cfg.emptyEl.hidden = true; }
    function close() { cfg.editorEl.hidden = true; cfg.emptyEl.hidden = false; if (cfg.errorEl) cfg.errorEl.textContent = ''; currentId = null; mark(null); }
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
      currentId = id; cfg.toForm(r.body.data); cfg.deleteBtn.hidden = false; open(); mark(id);
    }
    function create() { cfg.toForm(cfg.blank || {}); cfg.deleteBtn.hidden = true; currentId = null; open(); mark(null); }
    async function save() {
      if (cfg.errorEl) cfg.errorEl.textContent = '';
      const payload = cfg.fromForm();
      const r = await api(currentId ? `${cfg.path}/${currentId}` : cfg.path, { method: currentId ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      if (r.ok) { await load(); currentId = r.body.data.id; cfg.toForm(r.body.data); cfg.deleteBtn.hidden = false; mark(currentId); toast(`${cfg.entityName} guardado`); }
      else { const m = (r.body && r.body.error) || 'No se pudo guardar.'; if (cfg.errorEl) cfg.errorEl.textContent = m; toast(m, 'error'); }
    }
    async function remove() {
      if (!currentId) return;
      const okc = await confirmDialog({ title: `Eliminar ${cfg.entityName.toLowerCase()}`, message: '¿Seguro? Esta acción no se puede deshacer.', confirmText: 'Eliminar', danger: true });
      if (!okc) return;
      const r = await api(`${cfg.path}/${currentId}`, { method: 'DELETE' });
      if (r.ok) { close(); load(); toast(`${cfg.entityName} eliminado`); } else toast('No se pudo eliminar', 'error');
    }
    return { load, create, save, remove, close };
  }

  // ── Editor de texto enriquecido (contenteditable + execCommand) ──
  // Fábrica de editor: cada instancia gestiona su propia área, toolbar y rango.
  // Se usa en el blog y en las páginas legales.
  function makeRichEditor(rtArea, rtToolbar) {
    let savedRange = null;
    function saveRange() { const s = window.getSelection(); if (s && s.rangeCount && rtArea.contains(s.anchorNode)) savedRange = s.getRangeAt(0).cloneRange(); }
    function restoreRange() { if (savedRange) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(savedRange); } }
    function togglePlaceholder() { rtArea.classList.toggle('is-empty', rtArea.textContent.trim() === '' && !rtArea.querySelector('img, ul, ol, blockquote')); }
    rtArea.addEventListener('keyup', saveRange);
    rtArea.addEventListener('mouseup', saveRange);
    rtArea.addEventListener('input', togglePlaceholder);
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
      } else if (cmd === 'formatBlock') {
        document.execCommand('formatBlock', false, btn.getAttribute('data-value'));
      } else {
        document.execCommand(cmd, false, null);
      }
      saveRange();
      togglePlaceholder();
    });
    return {
      set(html) { rtArea.innerHTML = html || ''; togglePlaceholder(); },
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
    path: '/api/admin/posts', listEl: 'admin-list', editorEl: $('editor'), emptyEl: $('editor-empty'),
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
    path: '/api/admin/services', listEl: 'svc-list', editorEl: $('svc-editor'), emptyEl: $('svc-empty'),
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
    path: '/api/admin/plans', listEl: 'plan-list', editorEl: $('plan-editor'), emptyEl: $('plan-empty'),
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

  // ── PLANTILLAS DE CORREO ──────────────────────────────────
  const TPL_SEGMENTS = { all: 'Todos', alta: 'Prioridad alta', media: 'Prioridad media', base: 'Prioridad base', 'sin-web': 'Sin sitio web' };
  const tplEditor = makeRichEditor($('rt-tpl-area'), $('rt-tpl-toolbar'));
  const tpl = makeCrud({
    path: '/api/admin/templates', listEl: 'tpl-list', editorEl: $('tpl-editor'), emptyEl: $('tpl-empty'),
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

  // Compositor de correo + historial de un contacto (modal).
  async function openMailComposer(contact) {
    const [tplRes, msgRes] = await Promise.all([
      api('/api/admin/templates'),
      api(`/api/admin/contacts/${contact.id}/messages`),
    ]);
    if (!guard(tplRes) || !guard(msgRes)) return;
    mailTemplates = (tplRes.ok && tplRes.body.data) || [];
    const messages = (msgRes.ok && msgRes.body.data) || [];

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
        <div class="admin-field"><label>Mensaje *</label><div class="mail-body" id="mail-body" contenteditable="true" data-placeholder="Escribe el mensaje…"></div></div>
        <label class="mail-advance"><input type="checkbox" id="mail-advance" ${advanceDefault} /> Avanzar a "Contactado" al enviar</label>
        <details class="mail-preview"><summary>Vista previa (con los datos del contacto)</summary><div class="mail-preview__box"><p class="mail-preview__subject" id="mail-prev-subject"></p><div id="mail-prev-body"></div></div></details>
        <p class="admin-error" id="mail-error"></p>
        <div class="modal__actions">
          <button class="btn-ghost" data-act="cancel">Cerrar</button>
          <button class="btn-primary" data-act="send">Enviar</button>
        </div>
        <h4 class="mail-history__title">Historial (${messages.length})</h4>
        <div class="mail-history" id="mail-history">${messages.length ? messages.map(messageItem).join('') : '<p class="admin-muted">Aún no hay correos con este contacto.</p>'}</div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('is-open'));

    const selEl = overlay.querySelector('#mail-tpl');
    const subjEl = overlay.querySelector('#mail-subject');
    const bodyEl = overlay.querySelector('#mail-body');
    const errEl = overlay.querySelector('#mail-error');

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
      overlay.querySelector('.mail-history__title').textContent = `Historial (${list.length})`;
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
  async function loadUsers() {
    const r = await api('/api/admin/users');
    if (!guard(r) || !r.ok) return;
    $('users-list').innerHTML = r.body.data.map((u) => {
      const self = u.id === currentUserId;
      const name = esc(u.displayName || u.username);
      const statusLabel = u.deleted ? 'Eliminado' : (u.isActive && u.status === 'active' ? 'Activo' : 'Inactivo');
      const statusCls = u.deleted ? 'draft' : (u.isActive && u.status === 'active' ? 'published' : 'draft');
      const actions = self
        ? '<span class="admin-hint">(tú)</span>'
        : u.deleted
          ? `<button class="btn-ghost btn-sm" data-act="restore" data-id="${u.id}">Restaurar</button>`
          : `<button class="btn-ghost btn-sm" data-act="edit" data-id="${u.id}">Editar</button>
             <button class="btn-ghost btn-sm" data-act="reset" data-id="${u.id}">Resetear clave</button>
             <button class="btn-ghost btn-sm" data-act="toggle" data-id="${u.id}" data-active="${u.isActive && u.status === 'active' ? '1' : '0'}">${u.isActive && u.status === 'active' ? 'Desactivar' : 'Activar'}</button>
             <button class="btn-danger btn-sm" data-act="delete" data-id="${u.id}">Eliminar</button>`;
      return `<div class="user-row">
        <span>${name}${u.mfaEnabled ? ' 🔒' : ''} <span class="admin-hint">@${esc(u.username)}</span></span>
        <span class="badge-status ${u.role === 'admin' ? 'published' : 'draft'}">${esc(u.role)}</span>
        <span class="badge-status ${statusCls}">${statusLabel}</span>
        <span class="user-row__actions">${actions}</span>
      </div>`;
    }).join('');
  }

  // Modal de edición de un usuario (terceros).
  function editUserDialog(u) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true" aria-label="Editar usuario">
          <h3 class="modal__title">Editar: ${esc(u.username)}</h3>
          <div class="admin-field"><label>Nombre para mostrar</label><input class="modal__input" id="eu-display" type="text" value="${esc(u.displayName || '')}" /></div>
          <div class="admin-field"><label>Nombre(s)</label><input class="modal__input" id="eu-full" type="text" value="${esc(u.fullName || '')}" /></div>
          <div class="admin-field"><label>Apellidos</label><input class="modal__input" id="eu-last" type="text" value="${esc(u.lastName || '')}" /></div>
          <div class="admin-field"><label>Correo</label><input class="modal__input" id="eu-email" type="email" value="${esc(u.email || '')}" /></div>
          <div class="admin-field"><label>Rol</label><select class="modal__input" id="eu-role"><option value="admin"${u.role === 'admin' ? ' selected' : ''}>Admin</option><option value="editor"${u.role === 'editor' ? ' selected' : ''}>Editor</option></select></div>
          <div class="modal__actions">
            <button class="btn-ghost" data-act="cancel">Cancelar</button>
            <button class="btn-primary" data-act="ok">Guardar</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('is-open'));
      function close(val) { overlay.classList.remove('is-open'); setTimeout(() => overlay.remove(), 180); resolve(val); }
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) return close(null);
        const a = e.target.closest('[data-act]');
        if (!a) return;
        if (a.getAttribute('data-act') === 'ok') {
          close({ displayName: overlay.querySelector('#eu-display').value, fullName: overlay.querySelector('#eu-full').value, lastName: overlay.querySelector('#eu-last').value, email: overlay.querySelector('#eu-email').value, role: overlay.querySelector('#eu-role').value });
        } else close(null);
      });
    });
  }

  $('users-list').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const act = btn.getAttribute('data-act');
    if (act === 'edit') {
      const r = await api(`/api/admin/users/${id}`);
      if (!guard(r) || !r.ok) return;
      const fields = await editUserDialog(r.body.data);
      if (!fields) return;
      const res = await api(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(fields) });
      if (res.ok) { toast('Usuario actualizado'); loadUsers(); }
      else toast((res.body && res.body.error) || 'No se pudo actualizar.', 'error');
    } else if (act === 'toggle') {
      const activate = btn.getAttribute('data-active') === '0';
      const res = await api(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify({ isActive: activate, status: activate ? 'active' : 'disabled' }) });
      if (res.ok) { toast(activate ? 'Usuario activado' : 'Usuario desactivado'); loadUsers(); }
      else toast((res.body && res.body.error) || 'No se pudo cambiar el estado.', 'error');
    } else if (act === 'delete') {
      const ok = await confirmDialog({ title: 'Eliminar usuario', message: 'Se marcará como eliminado y se cerrarán sus sesiones. Podrás restaurarlo después.', confirmText: 'Eliminar', danger: true });
      if (!ok) return;
      const res = await api(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) { toast('Usuario eliminado'); loadUsers(); }
      else toast((res.body && res.body.error) || 'No se pudo eliminar.', 'error');
    } else if (act === 'restore') {
      const res = await api(`/api/admin/users/${id}/restore`, { method: 'POST' });
      if (res.ok) { toast('Usuario restaurado'); loadUsers(); }
      else toast((res.body && res.body.error) || 'No se pudo restaurar.', 'error');
    } else if (act === 'reset') {
      const temp = await promptDialog({ title: 'Resetear contraseña', label: 'Contraseña temporal (mín. 12). El usuario deberá cambiarla al entrar.', placeholder: 'Contraseña temporal', confirmText: 'Resetear' });
      if (!temp) return;
      const res = await api(`/api/admin/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ newPassword: temp }) });
      if (res.ok) { toast('Contraseña reseteada. El usuario debe cambiarla al entrar.'); }
      else toast((res.body && res.body.error) || 'No se pudo resetear.', 'error');
    }
  });

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
  $('user-save').addEventListener('click', async () => {
    $('user-error').textContent = '';
    const r = await api('/api/admin/users', { method: 'POST', body: JSON.stringify({ username: $('u-name').value, password: $('u-pass').value, role: $('u-role').value, mustChangePassword: $('u-mustchange').checked }) });
    if (r.ok) { $('u-name').value = ''; $('u-pass').value = ''; toast('Usuario creado'); loadUsers(); }
    else { const m = (r.body && r.body.error) || 'No se pudo crear.'; $('user-error').textContent = m; toast(m, 'error'); }
  });

  // Enlace de recuperación de contraseña: /admin/reset-password?token=...
  const bootToken = new URLSearchParams(location.search).get('token');
  if (location.pathname.endsWith('/reset-password') && bootToken) {
    showResetView(bootToken);
  } else {
    checkSession();
  }
})();
