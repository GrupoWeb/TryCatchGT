/**
 * Directivas de Content-Security-Policy del sitio, extraídas para poder probarlas
 * sin arrancar el servidor. `useDefaults: false` en helmet obliga a declararlas
 * todas explícitamente.
 */
export interface CspOptions {
  isProduction: boolean;
  forceHttps: boolean;
}

export function buildCspDirectives({ isProduction, forceHttps }: CspOptions): Record<string, string[]> {
  return {
    defaultSrc: ["'self'"],
    baseUri: ["'self'"],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    // Cloudflare Turnstile carga su script y renderiza en un iframe desde challenges.cloudflare.com.
    scriptSrc: isProduction
      ? ["'self'", 'https://challenges.cloudflare.com']
      : ["'self'", "'unsafe-inline'", 'https://challenges.cloudflare.com'],
    // Acotado a lo que realmente se usa: imágenes propias (portadas del blog
    // subidas a /uploads, sirven desde el mismo origen) y data: para el QR de
    // MFA. Se retira el comodín https: para no permitir imágenes de terceros.
    imgSrc: ["'self'", 'data:'],
    connectSrc: ["'self'", 'https://challenges.cloudflare.com'],
    frameSrc: ["'self'", 'https://challenges.cloudflare.com'],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
    formAction: ["'self'"],
    // Desacoplado de isProduction (C4): solo fuerza https si FORCE_HTTPS lo pide.
    ...(forceHttps ? { upgradeInsecureRequests: [] } : {}),
  };
}
