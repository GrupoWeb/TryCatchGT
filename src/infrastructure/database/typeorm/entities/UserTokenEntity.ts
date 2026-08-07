import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export type TokenPurpose = 'email_verify' | 'password_reset';

/**
 * Tokens de un solo uso para verificación de correo y recuperación de contraseña.
 * Se guarda solo el hash (sha256) del token, nunca el valor en claro.
 */
@Entity({ name: 'user_tokens' })
export class UserTokenEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @Column({ type: 'enum', enum: ['email_verify', 'password_reset'] })
  purpose!: TokenPurpose;

  @Index()
  @Column({ name: 'token_hash', type: 'varchar', length: 64 })
  tokenHash!: string;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt!: Date;

  @Column({ name: 'used_at', type: 'datetime', nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
