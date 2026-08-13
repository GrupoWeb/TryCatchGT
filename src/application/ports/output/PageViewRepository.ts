// Una visita registrada a una página pública. La escritura la alimenta el
// middleware trackVisit; la lectura agregada la consume el panel (Analytics).
export interface PageViewEntry {
  path: string;
  referrer?: string | null;
  country?: string | null;
  device?: string | null;
  browser?: string | null;
  // Hash diario e irreversible del visitante (IP+UA+día+sal): permite contar
  // únicos sin cookies ni guardar datos personales. Rota cada día por diseño.
  visitorHash?: string | null;
}

// Resumen agregado listo para pintar el dashboard, para una ventana de `days` días.
export interface AnalyticsSummary {
  days: number;
  totalViews: number;
  uniqueVisitors: number;
  viewsByDay: Array<{ day: string; count: number }>;
  topPages: Array<{ path: string; count: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
  byCountry: Array<{ country: string; count: number }>;
  byDevice: Array<{ device: string; count: number }>;
}

export interface PageViewRepository {
  record(view: PageViewEntry): Promise<void>;
  summary(days: number): Promise<AnalyticsSummary>;
}