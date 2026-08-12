import { SaveCadenceInput, SaveCadenceUseCase } from '../ports/input/SaveCadenceUseCase.js';
import { CadenceRepository } from '../ports/output/CadenceRepository.js';
import { Cadence } from '../../domain/entities/Cadence.js';
import { InvalidCadenceError } from '../../domain/exceptions/DomainError.js';

/** Crea o actualiza una cadencia (con sus pasos). El dominio valida pasos/nombre. */
export class SaveCadence implements SaveCadenceUseCase {
  constructor(private readonly repo: CadenceRepository) {}

  public async execute(input: SaveCadenceInput): Promise<Cadence> {
    const cadence = new Cadence({
      id: input.id,
      name: input.name,
      isActive: input.isActive,
      steps: input.steps || [],
      createdBy: input.createdBy ?? null,
    });

    if (input.id) {
      const updated = await this.repo.update(input.id, cadence);
      if (!updated) throw new InvalidCadenceError('La cadencia no existe.');
      return updated;
    }
    return await this.repo.save(cadence);
  }
}
