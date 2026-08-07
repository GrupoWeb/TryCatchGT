export interface UserProps {
  id?: number;
  username: string;
  passwordHash: string;
  role?: 'admin' | 'editor';
  email?: string | null;
  avatar?: string | null;
  mfaEnabled?: boolean;
  mfaSecret?: string | null;
  createdAt?: Date;
}

export class User {
  public readonly id?: number;
  public readonly username: string;
  public readonly passwordHash: string;
  public readonly role: 'admin' | 'editor';
  public readonly email: string | null;
  public readonly avatar: string | null;
  public readonly mfaEnabled: boolean;
  public readonly mfaSecret: string | null;
  public readonly createdAt: Date;

  constructor(props: UserProps) {
    this.id = props.id;
    this.username = props.username.trim().toLowerCase();
    this.passwordHash = props.passwordHash;
    this.role = props.role || 'admin';
    this.email = props.email?.trim() || null;
    this.avatar = props.avatar?.trim() || null;
    this.mfaEnabled = props.mfaEnabled ?? false;
    this.mfaSecret = props.mfaSecret || null;
    this.createdAt = props.createdAt || new Date();
  }
}
