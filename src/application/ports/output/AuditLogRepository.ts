export interface AuditLogEntry {
  id?: number;
  action: string;
  actorId?: number | null;
  actor?: string | null;
  ip?: string | null;
  method?: string | null;
  path?: string | null;
  status?: number | null;
  detail?: string | null;
  createdAt?: Date;
}

export interface AuditLogRepository {
  record(entry: AuditLogEntry): Promise<void>;
  list(limit: number): Promise<AuditLogEntry[]>;
}
