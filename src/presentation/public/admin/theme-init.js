/*
 * Aplica el tema guardado ANTES del primer render para evitar el parpadeo (FOUC).
 * Se carga de forma bloqueante en el <head>. La CSP de producción prohíbe scripts
 * inline, por eso vive en su propio archivo servido desde el mismo origen.
 * Claro es el tema por defecto (no se marca data-theme).
 */
(function () {
  try {
    if (localStorage.getItem('tc-admin-theme') === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch (_) {
    /* localStorage puede fallar en modo privado; se ignora y queda el tema claro. */
  }
})();
