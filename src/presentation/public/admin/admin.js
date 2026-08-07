/* ============================================================
   Panel administrativo TryCatch GT — multi-sección.
   Sesión por cookie httpOnly (fetch same-origin la envía sola).
   ============================================================ */

(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  async function api(path, options = {}) {
    const res = await fetch(path, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    let body = null;
    try { body = await res.json(); } catch (_) { /* sin cuerpo */ }
    return { ok: res.ok, status: res.status, body };
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

  function showLogin() { loginView.hidden = false; dashboardView.hidden = true; showLoginStep('password'); }
  function showDashboard() { loginView.hidden = true; dashboardView.hidden = false; showSection('home'); loadOverview(); }

  async function checkSession() {
    const { ok } = await api('/api/auth/me');
    if (ok) showDashboard(); else showLogin();
  }

  let mfaChallenge = null;
  function showLoginStep(step) {
    $('login-form').hidden = step !== 'password';
    $('mfa-login-card').hidden = step !== 'mfa';
    if (step === 'mfa') setTimeout(() => $('mfa-login-code').focus(), 50);
  }

  $('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('login-error').textContent = '';
    const { ok, body } = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: $('login-user').value, password: $('login-pass').value }) });
    if (ok && body && body.mfaRequired) {
      mfaChallenge = body.challenge;
      $('login-pass').value = '';
      $('mfa-login-code').value = '';
      $('mfa-login-error').textContent = '';
      showLoginStep('mfa');
    } else if (ok) {
      $('login-pass').value = '';
      showDashboard();
    } else {
      $('login-error').textContent = (body && body.error) || 'No se pudo iniciar sesión.';
    }
  });

  $('mfa-login-card').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('mfa-login-error').textContent = '';
    const { ok, body } = await api('/api/auth/mfa', { method: 'POST', body: JSON.stringify({ challenge: mfaChallenge, code: $('mfa-login-code').value }) });
    if (ok) { mfaChallenge = null; showDashboard(); }
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
  const loaders = { home: loadOverview, leads: loadLeads, blog: loadPosts, services: loadServicesSec, plans: loadPlansSec, contact: loadContact, account: loadAccount };

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
  const rtArea = $('rt-area');
  let savedRange = null;
  function saveRange() { const s = window.getSelection(); if (s && s.rangeCount && rtArea.contains(s.anchorNode)) savedRange = s.getRangeAt(0).cloneRange(); }
  function restoreRange() { if (savedRange) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(savedRange); } }
  function toggleRtPlaceholder() { rtArea.classList.toggle('is-empty', rtArea.textContent.trim() === '' && !rtArea.querySelector('img, ul, ol, blockquote')); }
  rtArea.addEventListener('keyup', saveRange);
  rtArea.addEventListener('mouseup', saveRange);
  rtArea.addEventListener('input', toggleRtPlaceholder);
  try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (_) { /* navegador antiguo */ }

  $('rt-toolbar').addEventListener('mousedown', async (e) => {
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
    toggleRtPlaceholder();
  });

  const richEditor = {
    set(html) { rtArea.innerHTML = html || ''; toggleRtPlaceholder(); },
    get() { return rtArea.innerHTML.trim(); },
  };

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
    const res = await fetch('/api/admin/uploads', { method: 'POST', credentials: 'same-origin', body: fd });
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

  // ── CONTACTO ──────────────────────────────────────────────
  async function loadContact() {
    const r = await api('/api/admin/config');
    if (!guard(r) || !r.ok) return;
    $('c-email').value = r.body.data.contactEmail || '';
    $('c-wa').value = r.body.data.whatsappNumber || '';
    $('c-msg').value = r.body.data.whatsappMessage || '';
  }
  $('contact-save').addEventListener('click', async () => {
    $('contact-error').textContent = '';
    const r = await api('/api/admin/config', { method: 'PUT', body: JSON.stringify({ contactEmail: $('c-email').value, whatsappNumber: $('c-wa').value, whatsappMessage: $('c-msg').value }) });
    if (r.ok) toast('Contacto actualizado'); else { const m = (r.body && r.body.error) || 'No se pudo guardar.'; $('contact-error').textContent = m; toast(m, 'error'); }
  });

  // ── PERFIL ────────────────────────────────────────────────
  let mfaPendingSecret = null;

  async function loadAccount() { await Promise.all([loadProfile(), loadUsers()]); }

  async function loadProfile() {
    const r = await api('/api/admin/account');
    if (!guard(r) || !r.ok) return;
    const u = r.body.data;
    $('profile-username').textContent = u.username;
    $('profile-role').textContent = u.role === 'admin' ? 'Admin' : 'Editor';
    $('p-email').value = u.email || '';
    $('p-role').value = u.role;
    // Avatar
    const av = $('profile-avatar');
    if (u.avatar) { av.style.backgroundImage = `url("${String(u.avatar).replace(/"/g, '%22')}")`; av.classList.add('has-img'); }
    else { av.style.backgroundImage = ''; av.classList.remove('has-img'); $('profile-initials').textContent = (u.username[0] || '?').toUpperCase(); }
    // Estado MFA
    $('mfa-off').hidden = u.mfaEnabled;
    $('mfa-on').hidden = !u.mfaEnabled;
    $('mfa-setup').hidden = true;
  }

  async function loadUsers() {
    const r = await api('/api/admin/users');
    if (!guard(r) || !r.ok) return;
    $('users-list').innerHTML = r.body.data.map((u) => `<div class="user-row"><span>${esc(u.username)}${u.mfaEnabled ? ' 🔒' : ''}</span><span class="badge-status ${u.role === 'admin' ? 'published' : 'draft'}">${esc(u.role)}</span></div>`).join('');
  }

  // Avatar
  $('avatar-btn').addEventListener('click', () => $('avatar-file').click());
  $('avatar-file').addEventListener('change', async () => {
    const file = $('avatar-file').files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    const up = await fetch('/api/admin/uploads', { method: 'POST', credentials: 'same-origin', body: fd });
    let ub = null; try { ub = await up.json(); } catch (_) {}
    if (!up.ok || !ub || !ub.success) { toast((ub && ub.error) || 'No se pudo subir la foto.', 'error'); return; }
    const r = await api('/api/admin/account', { method: 'PUT', body: JSON.stringify({ avatar: ub.data.url }) });
    if (r.ok) { loadProfile(); toast('Foto actualizada'); } else toast('No se pudo guardar la foto', 'error');
    $('avatar-file').value = '';
  });

  $('profile-save').addEventListener('click', async () => {
    $('profile-error').textContent = '';
    const r = await api('/api/admin/account', { method: 'PUT', body: JSON.stringify({ email: $('p-email').value, role: $('p-role').value }) });
    if (r.ok) { loadProfile(); toast('Perfil actualizado'); }
    else { const m = (r.body && r.body.error) || 'No se pudo guardar.'; $('profile-error').textContent = m; toast(m, 'error'); }
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
    if (r.ok) { mfaPendingSecret = null; loadProfile(); toast('2FA activado'); }
    else { const m = (r.body && r.body.error) || 'Código incorrecto.'; $('mfa-error').textContent = m; toast(m, 'error'); }
  });
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
  $('user-save').addEventListener('click', async () => {
    $('user-error').textContent = '';
    const r = await api('/api/admin/users', { method: 'POST', body: JSON.stringify({ username: $('u-name').value, password: $('u-pass').value, role: $('u-role').value }) });
    if (r.ok) { $('u-name').value = ''; $('u-pass').value = ''; toast('Usuario creado'); loadAccount(); }
    else { const m = (r.body && r.body.error) || 'No se pudo crear.'; $('user-error').textContent = m; toast(m, 'error'); }
  });

  checkSession();
})();
