import { User } from '../../../domain/entities/User.js';

export interface UserProfileUpdate {
  email?: string | null;
  avatar?: string | null;
  role?: 'admin' | 'editor';
}

export interface UserRepository {
  findByUsername(username: string): Promise<User | null>;
  findById(id: number): Promise<User | null>;
  findAll(): Promise<User[]>;
  create(user: User): Promise<User>;
  updatePassword(id: number, passwordHash: string): Promise<boolean>;
  updateProfile(id: number, fields: UserProfileUpdate): Promise<boolean>;
  setMfa(id: number, secret: string | null, enabled: boolean): Promise<boolean>;
  // Sube session_version para invalidar todas las sesiones; devuelve la versión nueva.
  bumpSessionVersion(id: number): Promise<number | null>;
  countAdmins(): Promise<number>;
  count(): Promise<number>;
}
