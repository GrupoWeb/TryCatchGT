/* ============================================================
   TryCatch GT — Frontend interactions
   · Carga de servicios vía /api/services
   · Envío AJAX de cotización a /api/projects
   · Animación de nodos de arquitectura en el canvas
   ============================================================ */

(() => {
  'use strict';

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* -------------------------------------------------------
     1) Render de servicios desde la API
  ------------------------------------------------------- */
  const grid = document.getElementById('services-grid');

  async function loadServices() {
    try {
      const res = await fetch('/api/services');
      const payload = await res.json();
      if (!payload.success || !Array.isArray(payload.data)) {
        throw new Error('Respuesta inválida');
      }
      renderServices(payload.data);
    } catch (err) {
      grid.innerHTML =
        '<p style="color:var(--text-muted);grid-column:1/-1;text-align:center">' +
        'No se pudieron cargar los servicios en este momento.</p>';
      console.error('Error cargando servicios:', err);
    }
  }

  function renderServices(services) {
    grid.innerHTML = services
      .map((s) => {
        const tags = (s.tags || [])
          .map((t) => `<span>${escapeHtml(t)}</span>`)
          .join('');
        return `
          <article class="card" style="--accent:${escapeAttr(s.accentColor)}">
            <div class="card__icon">${escapeHtml(s.icon)}</div>
            <h3>${escapeHtml(s.title)}</h3>
            <p>${escapeHtml(s.description)}</p>
            <div class="card__tags">${tags}</div>
          </article>`;
      })
      .join('');
  }

  /* -------------------------------------------------------
     1b) Render de planes mensuales desde la API
  ------------------------------------------------------- */
  const pricingGrid = document.getElementById('pricing-grid');
  const currencyToggle = document.getElementById('currency-toggle');

  // Moneda mostrada: se detecta el país por zona horaria (Guatemala → GTQ),
  // con opción de cambiarla manualmente. Se recuerda la elección del usuario.
  let loadedPlans = [];
  let displayCurrency = detectCurrency();

  function detectCurrency() {
    const saved = localStorage.getItem('tcgt_currency');
    if (saved === 'GTQ' || saved === 'USD') return saved;
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      const locale = navigator.language || '';
      if (tz === 'America/Guatemala' || /-GT$/i.test(locale)) return 'GTQ';
    } catch (_) { /* entornos sin Intl: cae a USD */ }
    return 'USD';
  }

  const CURRENCY = {
    GTQ: { symbol: 'Q', field: 'priceMonthlyGtq', label: 'GTQ · facturación mensual' },
    USD: { symbol: '$', field: 'priceMonthly', label: 'USD · facturación mensual' },
  };

  async function loadPlans() {
    try {
      const res = await fetch('/api/plans');
      const payload = await res.json();
      if (!payload.success || !Array.isArray(payload.data)) {
        throw new Error('Respuesta inválida');
      }
      loadedPlans = payload.data;
      renderPlans(loadedPlans);
      syncCurrencyToggle();
    } catch (err) {
      pricingGrid.innerHTML =
        '<p style="color:var(--text-muted);grid-column:1/-1;text-align:center">' +
        'No se pudieron cargar los planes en este momento.</p>';
      console.error('Error cargando planes:', err);
    }
  }

  function renderPlans(plans) {
    pricingGrid.innerHTML = plans
      .map((p) => {
        const features = (p.features || [])
          .map((f) => `<li><span class="plan__check">✓</span>${escapeHtml(f)}</li>`)
          .join('');
        const services = (p.services || [])
          .map((s) => `<span>${escapeHtml(s)}</span>`)
          .join('');
        const servicesBlock = services
          ? `<div class="plan__services"><span class="plan__services-label">Cubre</span>${services}</div>`
          : '';
        const badge = p.isPopular ? '<span class="plan__badge">Más popular</span>' : '';
        const cfg = CURRENCY[displayCurrency];
        const price = formatPrice(p[cfg.field]);
        return `
          <article class="plan ${p.isPopular ? 'plan--popular' : ''}" style="--accent:${escapeAttr(p.accentColor)}">
            ${badge}
            <div class="plan__name">${escapeHtml(p.name)}</div>
            <p class="plan__tagline">${escapeHtml(p.tagline)}</p>
            <div class="plan__price">
              <span class="plan__amount">${cfg.symbol}${price}</span>
              <span class="plan__period">/ mes</span>
            </div>
            <div class="plan__currency">${cfg.label}</div>
            <ul class="plan__features">${features}</ul>
            ${servicesBlock}
            <a href="#quote" class="plan__cta" data-plan="${escapeAttr(p.name)}">${escapeHtml(p.ctaLabel)}</a>
          </article>`;
      })
      .join('');

    // Al elegir un plan, prellenar la cotización con el plan de interés.
    pricingGrid.querySelectorAll('.plan__cta').forEach((btn) => {
      btn.addEventListener('click', () => {
        const planName = btn.getAttribute('data-plan');
        const prefix = `Plan de interés: ${planName}.\n\n`;
        if (!description.value.startsWith('Plan de interés:')) {
          description.value = prefix + description.value;
        } else {
          description.value = prefix + description.value.replace(/^Plan de interés:.*\n\n?/, '');
        }
        description.focus();
      });
    });
  }

  function formatPrice(value) {
    return Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  function syncCurrencyToggle() {
    if (!currencyToggle) return;
    currencyToggle.querySelectorAll('.currency-toggle__btn').forEach((btn) => {
      const active = btn.getAttribute('data-currency') === displayCurrency;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  if (currencyToggle) {
    currencyToggle.addEventListener('click', (event) => {
      const btn = event.target.closest('.currency-toggle__btn');
      if (!btn) return;
      const next = btn.getAttribute('data-currency');
      if (next === displayCurrency) return;
      displayCurrency = next;
      localStorage.setItem('tcgt_currency', next);
      if (loadedPlans.length) renderPlans(loadedPlans);
      syncCurrencyToggle();
    });
  }

  /* -------------------------------------------------------
     2) Envío del formulario de cotización (AJAX)
  ------------------------------------------------------- */
  const form = document.getElementById('quote-form');
  const statusEl = document.getElementById('form-status');
  const submitBtn = document.getElementById('submit-btn');
  const description = document.getElementById('description');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('', '');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando…';

    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const payload = await res.json();

      if (res.ok && payload.success) {
        setStatus(payload.message || '¡Solicitud enviada con éxito!', 'is-success');
        form.reset();
      } else {
        setStatus(payload.error || 'No se pudo enviar la solicitud.', 'is-error');
      }
    } catch (err) {
      setStatus('Error de conexión. Inténtalo de nuevo.', 'is-error');
      console.error('Error enviando cotización:', err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar solicitud →';
    }
  });

  function setStatus(message, cls) {
    statusEl.textContent = message;
    statusEl.className = 'form-status' + (cls ? ' ' + cls : '');
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  function escapeAttr(value) {
    return String(value ?? '').replace(/"/g, '&quot;');
  }

  /* -------------------------------------------------------
     3) Canvas: nodos de arquitectura conectada
  ------------------------------------------------------- */
  const canvas = document.getElementById('nodes-canvas');
  const ctx = canvas.getContext('2d');
  const COLORS = ['#8b5cf6', '#0066ff', '#06b6d4', '#ec4899'];
  let nodes = [];
  let width = 0;
  let height = 0;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    const count = Math.min(70, Math.floor((width * height) / 24000));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.6 + 0.8,
      color: COLORS[(Math.random() * COLORS.length) | 0],
    }));
  }

  function tick() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      a.x += a.vx;
      a.y += a.vy;
      if (a.x < 0 || a.x > width) a.vx *= -1;
      if (a.y < 0 || a.y > height) a.vy *= -1;

      // conexiones
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 140) {
          ctx.strokeStyle = `rgba(255,255,255,${(1 - dist / 140) * 0.12})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // nodo
      ctx.fillStyle = a.color;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', resize);
  resize();
  tick();

  loadServices();
  loadPlans();
})();
