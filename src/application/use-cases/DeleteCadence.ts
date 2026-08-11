import { DeleteCadenceUseCase } from '../ports/input/DeleteCadenceUseCase.js';
import { CadenceRepository } from '../ports/output/CadenceRepository.js';

export class DeleteCadence implements DeleteCadenceUseCase {
  constructor(private readonly repo: CadenceRepository) {}

  public async execute(id: number): Promise<boolean> {
    return await this.repo.delete(id);
  }
}
