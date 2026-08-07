import { Request, Response } from 'express';
import fs from 'node:fs';

/**
 * Live reload para desarrollo (sin dependencias externas).
 * Vigila el directorio del frontend con fs.watch y notifica al navegador
 * por Server-Sent Events para que recargue. Solo debe montarse en dev.
 */

const RELOAD_SNIPPET = `
<script>
  (function () {
    var es = new EventSource('/dev/livereload');
    var connected = false;
    es.addEventListener('open', function () {
      // Reconexión tras caída = el servidor se reinició (cambio en el backend).
      if (connected) location.reload();
      connected = true;
    });
    es.addEventListener('message', function (e) {
      // Cambio en un archivo del frontend.
      if (e.data === 'reload') location.reload();
    });
  })();
</script>`;

export interface LiveReload {
  sseHandler: (req: Request, res: Response) => void;
  injectInto: (html: string) => string;
}

export function createLiveReload(publicDir: string): LiveReload {
  const clients = new Set<Response>();
  let debounce: NodeJS.Timeout | null = null;

  function notify(): void {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      for (const res of clients) res.write('data: reload\n\n');
    }, 100);
  }

  try {
    fs.watch(publicDir, { recursive: true }, (_event, filename) => {
      // Ignora la carpeta de imágenes subidas: es contenido en tiempo de
      // ejecución, no código fuente. Sin esto, cada subida recargaría la página.
      if (filename) {
        const norm = filename.toString().replace(/\\/g, '/');
        if (norm === 'uploads' || norm.startsWith('uploads/')) return;
      }
      notify();
    });
  } catch (error) {
    console.warn('⚠️  Live reload no disponible:', (error as Error).message);
  }

  function sseHandler(_req: Request, res: Response): void {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.flushHeaders();
    res.write('retry: 1000\n\n');
    clients.add(res);
    res.on('close', () => clients.delete(res));
  }

  function injectInto(html: string): string {
    return html.includes('</body>')
      ? html.replace('</body>', `${RELOAD_SNIPPET}\n</body>`)
      : html + RELOAD_SNIPPET;
  }

  return { sseHandler, injectInto };
}
