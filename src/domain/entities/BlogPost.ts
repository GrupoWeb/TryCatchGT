import { DomainError } from '../exceptions/DomainError.js';

export type BlogStatus = 'draft' | 'published';

export interface BlogPostProps {
  id?: number;
  slug?: string;
  title: string;
  excerpt?: string;
  content: string;
  category: string;
  author: string;
  coverImage?: string;
  coverPosition?: string;
  readingTime?: number;
  status?: BlogStatus;
  publishedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Convierte un texto en un slug URL-safe (sin acentos ni simbolos). */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // elimina las marcas diacriticas
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

/** Estima el tiempo de lectura en minutos (~200 palabras por minuto). */
export function estimateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export class BlogPost {
  public readonly id?: number;
  public readonly slug: string;
  public readonly title: string;
  public readonly excerpt: string;
  public readonly content: string;
  public readonly category: string;
  public readonly author: string;
  public readonly coverImage: string;
  public readonly coverPosition: string;
  public readonly readingTime: number;
  public readonly status: BlogStatus;
  public readonly publishedAt: Date | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: BlogPostProps) {
    if (!props.title || props.title.trim().length < 3) {
      throw new DomainError('El titulo del articulo es obligatorio (min. 3 caracteres).');
    }
    if (!props.content || props.content.trim().length < 10) {
      throw new DomainError('El contenido del articulo es demasiado corto (min. 10 caracteres).');
    }

    this.title = props.title.trim();
    this.content = props.content.trim();
    this.slug = props.slug?.trim() || slugify(this.title);
    this.category = props.category?.trim() || 'General';
    this.author = props.author?.trim() || 'TryCatch GT';
    this.coverImage = props.coverImage?.trim() || '';
    this.coverPosition = props.coverPosition?.trim() || '50% 50%';
    this.excerpt = (props.excerpt?.trim() || this.content.replace(/<[^>]*>/g, '')).slice(0, 220);
    this.readingTime = props.readingTime && props.readingTime > 0
      ? props.readingTime
      : estimateReadingTime(this.content);
    this.status = props.status === 'published' ? 'published' : 'draft';
    this.id = props.id;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
    this.publishedAt = props.publishedAt ?? (this.status === 'published' ? this.createdAt : null);
  }
}
