export interface ServiceProps {
  id?: number;
  slug: string;
  title: string;
  description: string;
  icon: string;
  accentColor: string;
  tags: string[];
  isFeatured?: boolean;
}

export class Service {
  public readonly id?: number;
  public readonly slug: string;
  public readonly title: string;
  public readonly description: string;
  public readonly icon: string;
  public readonly accentColor: string;
  public readonly tags: string[];
  public readonly isFeatured: boolean;

  constructor(props: ServiceProps) {
    this.id = props.id;
    this.slug = props.slug;
    this.title = props.title;
    this.description = props.description;
    this.icon = props.icon;
    this.accentColor = props.accentColor;
    this.tags = props.tags;
    this.isFeatured = props.isFeatured ?? false;
  }
}
