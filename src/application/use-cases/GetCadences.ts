import { GetCadencesUseCase } from '../ports/input/GetCadencesUseCase.js';
import { CadenceRepository } from '../ports/output/CadenceRepository.js';
import { Cadence } from '../../domain/entities/Cadence.js';

export class GetCadences implements GetCadencesUseCase {
  constructor(private readonly repo: CadenceRepository) {}

  public async execute(): Promise<Cadence[]> {
    return await this.repo.findAll();
  }
}
