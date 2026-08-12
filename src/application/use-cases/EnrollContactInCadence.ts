import {
  EnrollContactInCadenceInput,
  EnrollContactInCadenceUseCase,
} from '../ports/input/EnrollContactInCadenceUseCase.js';
import { ContactRepository } from '../ports/output/ContactRepository.js';
import { CadenceRepository } from '../ports/output/CadenceRepository.js';
import { CadenceRunRepository } from '../ports/output/CadenceRunRepository.js';
import { CadenceRun } from '../../domain/entities/CadenceRun.js';
import { addDays } from '../../domain/services/addDays.js';
import { InvalidCadenceError, InvalidContactError } from '../../domain/exceptions/DomainError.js';

/**
 * Inscribe un contacto en una cadencia. Programa el primer paso (`nextRunAt` =
 * ahora + delay del paso 0). Evita inscripciones activas duplicadas del mismo
 * contacto en la misma cadencia.
 */
export class EnrollContactInCadence implements EnrollContactInCadenceUseCase {
  constructor(
    private readonly contacts: ContactRepository,
    private readonly cadences: CadenceRepository,
    private readonly runs: CadenceRunRepository,
  ) {}

  public async execute(input: EnrollContactInCadenceInput): Promise<CadenceRun> {
    const contact = await this.contacts.findById(input.contactId);
    if (!contact) throw new InvalidContactError('El contacto no existe.');

    const cadence = await this.cadences.findById(input.cadenceId);
    if (!cadence) throw new InvalidCadenceError('La cadencia no existe.');
    if (!cadence.isActive) throw new InvalidCadenceError('La cadencia está inactiva.');

    const existing = await this.runs.findActive(input.cadenceId, input.contactId);
    if (existing) throw new InvalidCadenceError('El contacto ya está inscrito en esta cadencia.');

    const firstDelay = cadence.steps[0].delayDays;
    return await this.runs.save(
      new CadenceRun({
        cadenceId: cadence.id!,
        contactId: contact.id!,
        currentStep: 0,
        status: 'active',
        nextRunAt: addDays(new Date(), firstDelay),
      }),
    );
  }
}
