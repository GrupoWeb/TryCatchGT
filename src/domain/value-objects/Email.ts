import { InvalidEmailError } from '../exceptions/DomainError.js';

export class Email {
  private readonly value: string;

  constructor(email: string) {
    const trimmed = email.trim();
    if (!Email.isValid(trimmed)) {
      throw new InvalidEmailError(email);
    }
    this.value = trimmed.toLowerCase();
  }

  public getValue(): string {
    return this.value;
  }

  public static isValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
