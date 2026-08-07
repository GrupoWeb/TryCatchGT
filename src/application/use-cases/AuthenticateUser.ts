import { AuthenticateUserUseCase, AuthenticateUserDTO } from '../ports/input/AuthenticateUserUseCase.js';
import { UserRepository } from '../ports/output/UserRepository.js';
import { PasswordHasher } from '../ports/output/PasswordHasher.js';
import { User } from '../../domain/entities/User.js';

// Hash "señuelo" para gastar tiempo aunque el usuario no exista y así mitigar
// ataques de temporización que revelen qué usuarios están registrados.
const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8DvHkhC7bqM7hFqZ7iZ1uZ8kQ0m0Ky';

export class AuthenticateUser implements AuthenticateUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  public async execute(dto: AuthenticateUserDTO): Promise<User | null> {
    const username = (dto.username || '').trim().toLowerCase();
    const password = dto.password || '';

    const user = await this.users.findByUsername(username);
    if (!user) {
      await this.hasher.compare(password, DUMMY_HASH);
      return null;
    }

    const ok = await this.hasher.compare(password, user.passwordHash);
    return ok ? user : null;
  }
}
