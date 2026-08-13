/**
 * Rutas típicas de escáneres/bots que sondean WordPress, phpMyAdmin, secretos o
 * paneles de otros CMS. Esta app es Node (sin PHP ni WordPress), así que NINGUNA
 * ruta legítima coincide con estos patrones. Se usa para dos cosas:
 *   1) no contar estas peticiones en la analítica (ensucian "Páginas más vistas"), y
 *   2) responder 404 en vez de servir la landing (evita "soft 404s" ante bots).
 */
const SCANNER_RE = /(?:^\/wp-|^\/wordpress(?:\/|$)|xmlrpc\.php|wp-login|wp-includes|wp-content|^\/\.(?:env|git|aws|ssh|vscode)|\/phpmyadmin|^\/administrator(?:\/|$)|\/vendor\/|\.php$|\.aspx?$|cgi-bin)/i;

export function isScannerPath(pathName: string): boolean {
  return SCANNER_RE.test(pathName);
}
