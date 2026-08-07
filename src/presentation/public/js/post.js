/* Single post: extrae el slug de la URL (/blog/<slug>) y carga /api/blog/<slug>. */
(() => {
  'use strict';

  const container = document.getElementById('post');

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function formatDate(value) {
    if (!value) return '';
    return new Date(value).toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function getSlug() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    return parts[0] === 'blog' && parts[1] ? decodeURIComponent(parts[1]) : '';
  }

  async function load() {
    const slug = getSlug();
    if (!slug) {
      renderError('Artículo no encontrado.');
      return;
    }
    try {
      const res = await fetch(`/api/blog/${encodeURIComponent(slug)}`);
      if (res.status === 404) {
        renderError('Este artículo no existe o fue movido.');
        return;
      }
      const payload = await res.json();
      if (!payload.success) throw new Error('Respuesta inválida');
      render(payload.data);
    } catch (err) {
      renderError('No se pudo cargar el artículo.');
      console.error('Error cargando artículo:', err);
    }
  }

  function render(post) {
    document.title = `${post.title} · TryCatch GT`;
    const cover = post.coverImage
      ? `<img class="article__cover" style="object-position:${esc(post.coverPosition || '50% 50%')}" src="${esc(post.coverImage)}" alt="${esc(post.title)}" />`
      : '';
    // El contenido lo redacta el admin (fuente confiable), por eso se inserta como HTML.
    container.innerHTML = `
      <a class="back-link" href="/blog" style="color:var(--text-muted);text-decoration:none;font-size:14px;display:inline-block;margin-bottom:20px">← Volver al blog</a>
      <div class="article__meta">
        <span class="article__cat">${esc(post.category)}</span>
        <span>·</span>
        <span>${formatDate(post.publishedAt)}</span>
        <span>·</span>
        <span>${esc(post.readingTime)} min de lectura</span>
      </div>
      <h1>${esc(post.title)}</h1>
      <div class="article__meta">Por ${esc(post.author)}</div>
      ${cover}
      <div class="article__content">${post.content}</div>`;
  }

  function renderError(message) {
    container.innerHTML = `
      <div class="article__state">
        <p>${esc(message)}</p>
        <p style="margin-top:16px"><a href="/blog" style="color:var(--cyan)">← Volver al blog</a></p>
      </div>`;
  }

  load();
})();
