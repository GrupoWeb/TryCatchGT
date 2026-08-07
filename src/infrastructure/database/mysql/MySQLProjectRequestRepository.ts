import { ProjectRequestRepository } from '../../../application/ports/output/ProjectRequestRepository.js';
import { ProjectRequest, ProjectRequestStatus } from '../../../domain/entities/ProjectRequest.js';
import { pool } from './connection.js';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

/**
 * Repositorio de solicitudes de proyecto respaldado por MySQL.
 * Si la tabla o la conexión no están disponibles, degrada de forma
 * transparente a un almacén en memoria para no romper el flujo de captación.
 */
export class MySQLProjectRequestRepository implements ProjectRequestRepository {
  private readonly memoryStore: ProjectRequest[] = [];
  private memorySequence = 1;

  public async save(request: ProjectRequest): Promise<ProjectRequest> {
    try {
      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO project_requests
           (client_name, client_email, company_name, project_type, budget_range, description, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          request.clientName,
          request.clientEmail.getValue(),
          request.companyName || null,
          request.projectType,
          request.budgetRange || null,
          request.description,
          request.status,
        ],
      );

      return this.rehydrate(request, result.insertId);
    } catch (error) {
      console.warn(
        '⚠️  No se pudo escribir la solicitud en MySQL, usando memoria:',
        (error as Error).message,
      );
      const stored = this.rehydrate(request, this.memorySequence++);
      this.memoryStore.push(stored);
      return stored;
    }
  }

  public async findAll(): Promise<ProjectRequest[]> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM project_requests ORDER BY created_at DESC',
      );
      return rows.map((row) => this.mapRow(row));
    } catch {
      return [...this.memoryStore];
    }
  }

  public async findById(id: number): Promise<ProjectRequest | null> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM project_requests WHERE id = ? LIMIT 1',
        [id],
      );
      return rows.length > 0 ? this.mapRow(rows[0]) : null;
    } catch {
      return this.memoryStore.find((r) => r.id === id) ?? null;
    }
  }

  public async updateStatus(id: number, status: ProjectRequestStatus): Promise<boolean> {
    try {
      const [result] = await pool.execute<ResultSetHeader>(
        'UPDATE project_requests SET status = ? WHERE id = ?',
        [status, id],
      );
      return result.affectedRows > 0;
    } catch {
      const idx = this.memoryStore.findIndex((r) => r.id === id);
      if (idx === -1) return false;
      const r = this.memoryStore[idx];
      this.memoryStore[idx] = new ProjectRequest({
        id: r.id,
        clientName: r.clientName,
        clientEmail: r.clientEmail.getValue(),
        companyName: r.companyName,
        projectType: r.projectType,
        budgetRange: r.budgetRange,
        description: r.description,
        status,
        createdAt: r.createdAt,
      });
      return true;
    }
  }

  private rehydrate(request: ProjectRequest, id: number): ProjectRequest {
    return new ProjectRequest({
      id,
      clientName: request.clientName,
      clientEmail: request.clientEmail.getValue(),
      companyName: request.companyName,
      projectType: request.projectType,
      budgetRange: request.budgetRange,
      description: request.description,
      status: request.status,
      createdAt: request.createdAt,
    });
  }

  private mapRow(row: RowDataPacket): ProjectRequest {
    return new ProjectRequest({
      id: row.id,
      clientName: row.client_name,
      clientEmail: row.client_email,
      companyName: row.company_name ?? undefined,
      projectType: row.project_type,
      budgetRange: row.budget_range ?? undefined,
      description: row.description,
      status: row.status,
      createdAt: row.created_at,
    });
  }
}
