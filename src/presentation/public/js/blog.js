/* Blog listing: carga /api/blog, arma el filtro de categorías y renderiza. */
(() => {
  'use strict';

  const grid = document.getElementById('blog-grid');
  const filterBar = document.getElementById('blog-filter');
  let posts = [];
  let activeCategory = 'Todos';

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(value) {
    if (!value) return '';
    const d = new Date(value);
    return d.toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  async function load() {
    try {
      const res = await fetch('/api/blog');
      const payload = await res.json();
      if (!payload.success) throw new Error('Respuesta inválida');
      posts = payload.data;
      renderFilter();
      renderGrid();
    } catch (err) {
      grid.innerHTML = '<p class="article__state">No se pudieron cargar los artículos.</p>';
      console.error('Error cargando blog:', err);
    }
  }

  function renderFilter() {
    const categories = ['Todos', ...Array.from(new Set(posts.map((p) => p.category)))];
    filterBar.innerHTML = categories
      .map(
        (c) =>
          `<button class="blog-filter__btn ${c === activeCategory ? 'is-active' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`,
      )
      .join('');
    filterBar.querySelectorAll('.blog-filter__btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeCategory = btn.getAttribute('data-cat');
        renderFilter();
        renderGrid();
      });
    });
  }

  function renderGrid() {
    const visible =
      activeCategory === 'Todos' ? posts : posts.filter((p) => p.category === activeCategory);

    if (!visible.length) {
      grid.innerHTML = '<p class="article__state">Aún no hay artículos en esta categoría.</p>';
      return;
    }

    grid.innerHTML = visible
      .map((p) => {
        const cover = p.coverImage
          ? ` style="background-image:url('${esc(p.coverImage)}');background-position:${esc(p.coverPosition || '50% 50%')}"`
          : '';
        return `
          <a class="post-card" href="/blog/${esc(p.slug)}">
            <div class="post-card__cover"${cover}></div>
            <div class="post-card__body">
              <span class="post-card__cat">${esc(p.category)}</span>
              <h3>${esc(p.title)}</h3>
              <p>${esc(p.excerpt)}</p>
              <div class="post-card__meta">${formatDate(p.publishedAt)} · ${esc(p.readingTime)} min de lectura</div>
            </div>
          </a>`;
      })
      .join('');
  }

  load();
})();
