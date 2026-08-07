import { User } from '../../../domain/entities/User.js';

export interface AuthenticateUserDTO {
  username: string;
  password: string;
}

export interface AuthenticateUserUseCase {
  execute(dto: AuthenticateUserDTO): Promise<User | null>;
}
