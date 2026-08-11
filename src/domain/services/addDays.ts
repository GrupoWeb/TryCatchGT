/** Devuelve una nueva fecha desplazada `days` días (usado para programar pasos). */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
