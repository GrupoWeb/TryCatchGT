export interface SiteConfigRepository {
  getAll(): Promise<Record<string, string>>;
  setMany(values: Record<string, string>): Promise<void>;
}
