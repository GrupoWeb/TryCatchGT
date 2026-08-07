export interface PlanProps {
  id?: number;
  slug: string;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceMonthlyGtq: number;
  currency: string;
  features: string[];
  services: string[];
  accentColor: string;
  ctaLabel: string;
  isPopular?: boolean;
}

export class Plan {
  public readonly id?: number;
  public readonly slug: string;
  public readonly name: string;
  public readonly tagline: string;
  public readonly priceMonthly: number;
  public readonly priceMonthlyGtq: number;
  public readonly currency: string;
  public readonly features: string[];
  public readonly services: string[];
  public readonly accentColor: string;
  public readonly ctaLabel: string;
  public readonly isPopular: boolean;

  constructor(props: PlanProps) {
    this.id = props.id;
    this.slug = props.slug;
    this.name = props.name;
    this.tagline = props.tagline;
    this.priceMonthly = props.priceMonthly;
    this.priceMonthlyGtq = props.priceMonthlyGtq;
    this.currency = props.currency;
    this.features = props.features;
    this.services = props.services;
    this.accentColor = props.accentColor;
    this.ctaLabel = props.ctaLabel;
    this.isPopular = props.isPopular ?? false;
  }
}
