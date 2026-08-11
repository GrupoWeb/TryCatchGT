import { CadenceRun } from '../../../domain/entities/CadenceRun.js';

export interface CadenceRunRepository {
  save(run: CadenceRun): Promise<CadenceRun>;
  // Inscripciones activas cuyo próximo envío ya venció (next_run_at <= now).
  findDue(now: Date): Promise<CadenceRun[]>;
  findByContact(contactId: number): Promise<CadenceRun[]>;
  findActive(cadenceId: number, contactId: number): Promise<CadenceRun | null>;
  // Corta todas las inscripciones activas de un contacto (respondió). Devuelve
  // cuántas se detuvieron.
  stopActiveByContact(contactId: number): Promise<number>;
}
