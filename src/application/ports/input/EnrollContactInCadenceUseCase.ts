import { CadenceRun } from '../../../domain/entities/CadenceRun.js';

export interface EnrollContactInCadenceInput {
  contactId: number;
  cadenceId: number;
}

export interface EnrollContactInCadenceUseCase {
  execute(input: EnrollContactInCadenceInput): Promise<CadenceRun>;
}
