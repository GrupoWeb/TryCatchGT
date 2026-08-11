import { Response } from 'express';
import { AuthedRequest } from '../middleware/requireAuth.js';
import { SaveCadence } from '../../../application/use-cases/SaveCadence.js';
import { GetCadences } from '../../../application/use-cases/GetCadences.js';
import { DeleteCadence } from '../../../application/use-cases/DeleteCadence.js';
import { EnrollContactInCadence } from '../../../application/use-cases/EnrollContactInCadence.js';
import { ProcessDueCadences } from '../../../application/use-cases/ProcessDueCadences.js';
import { CadenceRepository } from '../../../application/ports/output/CadenceRepository.js';
import { CadenceRunRepository } from '../../../application/ports/output/CadenceRunRepository.js';
import { Cadence } from '../../../domain/entities/Cadence.js';
import { CadenceRun } from '../../../domain/entities/CadenceRun.js';
import { CadenceStepProps } from '../../../domain/entities/Cadence.js';
import { DomainError } from '../../../domain/exceptions/DomainError.js';

function toView(c: Cadence) {
  return {
    id: c.id,
    name: c.name,
    isActive: c.isActive,
    steps: c.steps.map((s) => ({ delayDays: s.delayDays, templateId: s.templateId })),
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function runView(r: CadenceRun) {
  return {
    id: r.id,
    cadenceId: r.cadenceId,
    contactId: r.contactId,
    currentStep: r.currentStep,
    status: r.status,
    nextRunAt: r.nextRunAt,
    lastSentAt: r.lastSentAt,
  };
}

/** Normaliza los pasos que llegan del panel a la forma del dominio. */
function parseSteps(raw: unknown): CadenceStepProps[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s) => ({
    delayDays: Number((s as Record<string, unknown>)?.delayDays),
    templateId: Number((s as Record<string, unknown>)?.templateId),
  }));
}

export class CadenceAdminController {
  constructor(
    private readonly cadenceRepo: CadenceRepository,
    private readonly runRepo: CadenceRunRepository,
    private readonly getCadences: GetCadences,
    private readonly saveCadence: SaveCadence,
    private readonly deleteCadence: DeleteCadence,
    private readonly enroll: EnrollContactInCadence,
    private readonly processDue: ProcessDueCadences,
  ) {}

  public list = async (_req: AuthedRequest, res: Response): Promise<void> => {
    const cadences = await this.getCadences.execute();
    res.status(200).json({ success: true, data: cadences.map(toView) });
  };

  public getById = async (req: AuthedRequest, res: Response): Promise<void> => {
    const cadence = await this.cadenceRepo.findById(Number(req.params.id));
    if (!cadence) {
      res.status(404).json({ success: false, error: 'Cadencia no encontrada.' });
      return;
    }
    res.status(200).json({ success: true, data: toView(cadence) });
  };

  public create = async (req: AuthedRequest, res: Response): Promise<void> => {
    try {
      const b = req.body ?? {};
      const cadence = await this.saveCadence.execute({
        name: b.name,
        isActive: b.isActive,
        steps: parseSteps(b.steps),
        createdBy: req.userId ?? null,
      });
      res.status(201).json({ success: true, data: toView(cadence) });
    } catch (err) {
      if (err instanceof DomainError) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }
      throw err;
    }
  };

  public update = async (req: AuthedRequest, res: Response): Promise<void> => {
    try {
      const b = req.body ?? {};
      const cadence = await this.saveCadence.execute({
        id: Number(req.params.id),
        name: b.name,
        isActive: b.isActive,
        steps: parseSteps(b.steps),
      });
      res.status(200).json({ success: true, data: toView(cadence) });
    } catch (err) {
      if (err instanceof DomainError) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }
      throw err;
    }
  };

  public remove = async (req: AuthedRequest, res: Response): Promise<void> => {
    const ok = await this.deleteCadence.execute(Number(req.params.id));
    if (!ok) {
      res.status(404).json({ success: false, error: 'Cadencia no encontrada.' });
      return;
    }
    res.status(200).json({ success: true });
  };

  // Inscribe un contacto (POST /api/admin/contacts/:id/enroll { cadenceId }).
  public enrollContact = async (req: AuthedRequest, res: Response): Promise<void> => {
    try {
      const run = await this.enroll.execute({
        contactId: Number(req.params.id),
        cadenceId: Number(req.body?.cadenceId),
      });
      res.status(201).json({ success: true, data: runView(run) });
    } catch (err) {
      if (err instanceof DomainError) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }
      throw err;
    }
  };

  // Inscripciones de un contacto (para la ficha).
  public contactRuns = async (req: AuthedRequest, res: Response): Promise<void> => {
    const runs = await this.runRepo.findByContact(Number(req.params.id));
    res.status(200).json({ success: true, data: runs.map(runView) });
  };

  // Dispara el procesamiento de cadencias vencidas al instante (además del scheduler).
  public process = async (_req: AuthedRequest, res: Response): Promise<void> => {
    const result = await this.processDue.execute();
    res.status(200).json({ success: true, data: result });
  };
}
