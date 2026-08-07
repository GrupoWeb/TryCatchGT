import { EnsureAdminUserUseCase } from '../ports/input/EnsureAdminUserUseCase.js';
import { UserRepository } from '../ports/output/UserRepository.js';
import { PasswordHasher } from '../ports/output/PasswordHasher.js';
import { User } from '../../domain/entities/User.js';

/**
 * Siembra el primer usuario administrador a partir de las credenciales del .env
 * si la tabla de usuarios está vacía. Idempotente: no hace nada si ya hay usuarios.
 */
export class EnsureAdminUser implements EnsureAdminUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly credentials: { user: string; password: string },
  ) {}

  public async execute(): Promise<void> {
    const existing = await this.users.count();
    if (existing > 0) return;

    if (!this.credentials.user || !this.credentials.password) return;

    const passwordHash = await this.hasher.hash(this.credentials.password);
    const created = await this.users.create(
      new User({ username: this.credentials.user, passwordHash, role: 'admin' }),
    );
    console.log(`👤 Usuario admin inicial creado: "${created.username}"`);
  }
}
