import { UserRepository, UserProfileUpdate } from '../../../application/ports/output/UserRepository.js';
import { User } from '../../../domain/entities/User.js';
import { pool } from './connection.js';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

/**
 * Repositorio de usuarios respaldado por MySQL con degradación a memoria.
 * Nota: en modo memoria los usuarios no persisten entre reinicios; para el
 * panel admin se recomienda tener MySQL disponible.
 */
export class MySQLUserRepository implements UserRepository {
  private readonly memoryStore: User[] = [];
  private memorySequence = 1;

  public async findByUsername(username: string): Promise<User | null> {
    const normalized = username.trim().toLowerCase();
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM users WHERE username = ? LIMIT 1',
        [normalized],
      );
      return rows.length > 0 ? this.mapRow(rows[0]) : null;
    } catch {
      return this.memoryStore.find((u) => u.username === normalized) ?? null;
    }
  }

  public async create(user: User): Promise<User> {
    try {
      const [result] = await pool.execute<ResultSetHeader>(
        'INSERT INTO users (username, password_hash, role, email, avatar) VALUES (?, ?, ?, ?, ?)',
        [user.username, user.passwordHash, user.role, user.email, user.avatar],
      );
      return new User({ ...user, id: result.insertId });
    } catch (error) {
      console.warn('⚠️  No se pudo escribir el usuario en MySQL, usando memoria:', (error as Error).message);
      const stored = new User({ ...user, id: this.memorySequence++ });
      this.memoryStore.push(stored);
      return stored;
    }
  }

  public async findById(id: number): Promise<User | null> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
      return rows.length > 0 ? this.mapRow(rows[0]) : null;
    } catch {
      return this.memoryStore.find((u) => u.id === id) ?? null;
    }
  }

  public async findAll(): Promise<User[]> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM users ORDER BY id ASC');
      return rows.map((row) => this.mapRow(row));
    } catch {
      return [...this.memoryStore];
    }
  }

  public async updatePassword(id: number, passwordHash: string): Promise<boolean> {
    try {
      const [result] = await pool.execute<ResultSetHeader>(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [passwordHash, id],
      );
      return result.affectedRows > 0;
    } catch {
      const idx = this.memoryStore.findIndex((u) => u.id === id);
      if (idx === -1) return false;
      const u = this.memoryStore[idx];
      this.memoryStore[idx] = new User({ ...u, passwordHash });
      return true;
    }
  }

  public async updateProfile(id: number, fields: UserProfileUpdate): Promise<boolean> {
    const sets: string[] = [];
    const params: (string | null)[] = [];
    if (fields.email !== undefined) { sets.push('email = ?'); params.push(fields.email || null); }
    if (fields.avatar !== undefined) { sets.push('avatar = ?'); params.push(fields.avatar || null); }
    if (fields.role !== undefined) { sets.push('role = ?'); params.push(fields.role); }
    if (!sets.length) return true;
    try {
      const [result] = await pool.execute<ResultSetHeader>(
        `UPDATE users SET ${sets.join(', ')} WHERE id = ?`,
        [...params, id],
      );
      return result.affectedRows > 0;
    } catch {
      const idx = this.memoryStore.findIndex((u) => u.id === id);
      if (idx === -1) return false;
      const u = this.memoryStore[idx];
      this.memoryStore[idx] = new User({
        ...u,
        email: fields.email !== undefined ? fields.email : u.email,
        avatar: fields.avatar !== undefined ? fields.avatar : u.avatar,
        role: fields.role !== undefined ? fields.role : u.role,
      });
      return true;
    }
  }

  public async setMfa(id: number, secret: string | null, enabled: boolean): Promise<boolean> {
    try {
      const [result] = await pool.execute<ResultSetHeader>(
        'UPDATE users SET mfa_secret = ?, mfa_enabled = ? WHERE id = ?',
        [secret, enabled, id],
      );
      return result.affectedRows > 0;
    } catch {
      const idx = this.memoryStore.findIndex((u) => u.id === id);
      if (idx === -1) return false;
      this.memoryStore[idx] = new User({ ...this.memoryStore[idx], mfaSecret: secret, mfaEnabled: enabled });
      return true;
    }
  }

  public async setBackupCodes(id: number, hashes: string[] | null): Promise<boolean> {
    const json = hashes && hashes.length ? JSON.stringify(hashes) : null;
    try {
      const [result] = await pool.execute<ResultSetHeader>(
        'UPDATE users SET mfa_backup_codes = ? WHERE id = ?',
        [json, id],
      );
      return result.affectedRows > 0;
    } catch {
      const idx = this.memoryStore.findIndex((u) => u.id === id);
      if (idx === -1) return false;
      this.memoryStore[idx] = new User({ ...this.memoryStore[idx], mfaBackupCodes: hashes });
      return true;
    }
  }

  public async bumpSessionVersion(id: number): Promise<number | null> {
    try {
      await pool.execute<ResultSetHeader>(
        'UPDATE users SET session_version = session_version + 1 WHERE id = ?',
        [id],
      );
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT session_version FROM users WHERE id = ? LIMIT 1',
        [id],
      );
      return rows.length > 0 ? Number(rows[0].session_version) : null;
    } catch {
      const idx = this.memoryStore.findIndex((u) => u.id === id);
      if (idx === -1) return null;
      const next = (this.memoryStore[idx].sessionVersion ?? 0) + 1;
      this.memoryStore[idx] = new User({ ...this.memoryStore[idx], sessionVersion: next });
      return next;
    }
  }

  public async countAdmins(): Promise<number> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM users WHERE role = 'admin'");
      return Number(rows[0]?.total ?? 0);
    } catch {
      return this.memoryStore.filter((u) => u.role === 'admin').length;
    }
  }

  public async count(): Promise<number> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM users');
      return Number(rows[0]?.total ?? 0);
    } catch {
      return this.memoryStore.length;
    }
  }

  private mapRow(row: RowDataPacket): User {
    return new User({
      id: row.id,
      username: row.username,
      passwordHash: row.password_hash,
      role: row.role,
      email: row.email ?? null,
      avatar: row.avatar ?? null,
      mfaEnabled: Boolean(row.mfa_enabled),
      mfaSecret: row.mfa_secret ?? null,
      mfaBackupCodes: parseBackupCodes(row.mfa_backup_codes),
      sessionVersion: Number(row.session_version ?? 0),
      createdAt: row.created_at,
    });
  }
}

// La columna JSON puede llegar ya parseada (array) o como string según el driver.
function parseBackupCodes(value: unknown): string[] | null {
  if (!value) return null;
  if (Array.isArray(value)) return value as string[];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
