import { describe, it, expect } from 'vitest';
import { validatePassword, PASSWORD_MIN_LENGTH } from '../../src/infrastructure/security/passwordPolicy.js';

describe('validatePassword (M4)', () => {
  it('rechaza contraseñas por debajo del mínimo', () => {
    expect(validatePassword('corta')).toMatch(new RegExp(`${PASSWORD_MIN_LENGTH}`));
    expect(validatePassword('12345678901')).not.toBeNull(); // 11 chars
  });

  it('rechaza contraseñas obvias aunque sean largas', () => {
    expect(validatePassword('admin12345')).not.toBeNull();
    expect(validatePassword('administrador')).not.toBeNull();
  });

  it('rechaza que sea igual al nombre de usuario', () => {
    expect(validatePassword('juanjolon123', 'juanjolon123')).not.toBeNull();
  });

  it('acepta una contraseña fuerte', () => {
    expect(validatePassword('C0rrecta-Horse-Battery')).toBeNull();
  });
});
