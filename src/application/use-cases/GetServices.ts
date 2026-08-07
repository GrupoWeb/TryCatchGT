import { GetServicesUseCase } from '../ports/input/GetServicesUseCase.js';
import { ServiceRepository } from '../ports/output/ServiceRepository.js';
import { Service } from '../../domain/entities/Service.js';

export class GetServices implements GetServicesUseCase {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  public async execute(): Promise<Service[]> {
    return await this.serviceRepo.findAll();
  }
}
