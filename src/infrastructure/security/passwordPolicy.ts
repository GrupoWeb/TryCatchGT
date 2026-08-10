/**
 * Política de contraseñas centralizada (M4): mínimo 12 caracteres y rechazo de las
 * más obvias (incluido el propio nombre de usuario). Devuelve un mensaje de error
 * en español si no cumple, o `null` si es válida.
 */
export const PASSWORD_MIN_LENGTH = 12;

const COMMON_PASSWORDS = new Set([
  'password', 'passw0rd', 'contraseña', 'contrasena', 'admin', 'administrador',
  'admin12345', 'administrator', '123456789012', 'qwertyuiop', 'qwerty123456',
  'iloveyou123', 'trycatchgt', 'trycatch123', 'cambiaestaclave', 'letmein12345',
]);

export function validatePassword(password: string, username?: string): string | null {
  const p = String(password ?? '');
  if (p.length < PASSWORD_MIN_LENGTH) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  const lower = p.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) {
    return 'Esa contraseña es demasiado común. Elige una más difícil de adivinar.';
  }
  if (username && lower === String(username).trim().toLowerCase()) {
    return 'La contraseña no puede ser igual al nombre de usuario.';
  }
  return null;
}
