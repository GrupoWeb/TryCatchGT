export interface LandingSampleProps {
  id?: number;
  slug: string;
  title: string;
  html: string;
  createdBy?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Página de muestra (landing) generada para enseñar a un prospecto. Guarda un HTML
 * arbitrario que se sirve en una URL pública (`/muestras/<slug>`). El HTML NO se
 * sanea (los landings usan su propio CSS/JS); el aislamiento se hace al servir con
 * una CSP `sandbox` (origen opaco), no reescribiendo el contenido.
 */
export class LandingSample {
  public readonly id?: number;
  public readonly slug: string;
  public readonly title: string;
  public readonly html: string;
  public readonly createdBy: number | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: LandingSampleProps) {
    this.id = props.id;
    this.slug = props.slug;
    this.title = props.title;
    this.html = props.html;
    this.createdBy = props.createdBy ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? this.createdAt;
  }
}
