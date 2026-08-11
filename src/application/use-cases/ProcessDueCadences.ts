import {
  ProcessDueCadencesResult,
  ProcessDueCadencesUseCase,
} from '../ports/input/ProcessDueCadencesUseCase.js';
import { CadenceRepository } from '../ports/output/CadenceRepository.js';
import { CadenceRunRepository } from '../ports/output/CadenceRunRepository.js';
import { SendContactEmail } from './SendContactEmail.js';
import { CadenceRun } from '../../domain/entities/CadenceRun.js';
import { addDays } from '../../domain/services/addDays.js';

/**
 * Procesa las inscripciones cuyo próximo paso ya venció: envía el correo del paso
 * actual (reusa SendContactEmail, que registra el intento en el timeline) y
 * reprograma el siguiente, o marca la inscripción como completada.
 *
 * Lo ejecuta el scheduler periódicamente y también el botón "Procesar ahora" del
 * panel. Cada inscripción se procesa de forma aislada: un fallo no detiene el lote.
 * Avanza el paso aunque el envío no salga (SMTP sin configurar): el intento queda
 * como 'failed' en crm_messages y la cadencia no se atasca en un reintento infinito.
 */
export class ProcessDueCadences implements ProcessDueCadencesUseCase {
  constructor(
    private readonly runs: CadenceRunRepository,
    private readonly cadences: CadenceRepository,
    private readonly sendContactEmail: SendContactEmail,
  ) {}

  public async execute(now: Date = new Date()): Promise<ProcessDueCadencesResult> {
    const due = await this.runs.findDue(now);
    const result: ProcessDueCadencesResult = { processed: 0, sent: 0, completed: 0, stopped: 0 };

    for (const run of due) {
      result.processed++;
      try {
        const cadence = await this.cadences.findById(run.cadenceId);
        // La cadencia se borró o desactivó tras la inscripción: se corta.
        if (!cadence || !cadence.isActive) {
          await this.runs.save(this.withState(run, { status: 'stopped', nextRunAt: null }));
          result.stopped++;
          continue;
        }

        const step = cadence.steps[run.currentStep];
        if (!step) {
          await this.runs.save(this.withState(run, { status: 'completed', nextRunAt: null }));
          result.completed++;
          continue;
        }

        const outcome = await this.sendContactEmail.execute({
          contactId: run.contactId,
          templateId: step.templateId,
          advanceStage: false,
        });
        if (outcome.sent) result.sent++;

        const nextStep = run.currentStep + 1;
        if (nextStep >= cadence.steps.length) {
          await this.runs.save(
            this.withState(run, { currentStep: nextStep, status: 'completed', nextRunAt: null, lastSentAt: now }),
          );
          result.completed++;
        } else {
          await this.runs.save(
            this.withState(run, {
              currentStep: nextStep,
              status: 'active',
              nextRunAt: addDays(now, cadence.steps[nextStep].delayDays),
              lastSentAt: now,
            }),
          );
        }
      } catch (err) {
        // No se propaga: el resto del lote debe seguir procesándose.
        console.error(`⚠️  Cadencia: fallo al procesar la inscripción #${run.id}:`, (err as Error).message);
      }
    }

    return result;
  }

  private withState(
    run: CadenceRun,
    patch: Partial<Pick<CadenceRun, 'currentStep' | 'status' | 'nextRunAt' | 'lastSentAt'>>,
  ): CadenceRun {
    return new CadenceRun({
      id: run.id,
      cadenceId: run.cadenceId,
      contactId: run.contactId,
      currentStep: patch.currentStep ?? run.currentStep,
      status: patch.status ?? run.status,
      nextRunAt: patch.nextRunAt !== undefined ? patch.nextRunAt : run.nextRunAt,
      lastSentAt: patch.lastSentAt !== undefined ? patch.lastSentAt : run.lastSentAt,
      createdAt: run.createdAt,
    });
  }
}
