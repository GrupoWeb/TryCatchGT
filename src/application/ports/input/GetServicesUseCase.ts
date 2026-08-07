import { Service } from '../../../domain/entities/Service.js';

export interface GetServicesUseCase {
  execute(): Promise<Service[]>;
}
