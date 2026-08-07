import bcrypt from 'bcryptjs';
import { PasswordHasher } from '../../application/ports/output/PasswordHasher.js';

export class BcryptPasswordHasher implements PasswordHasher {
  private readonly rounds = 10;

  public async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.rounds);
  }

  public async compare(plain: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plain, hash);
    } catch {
      return false;
    }
  }
}
