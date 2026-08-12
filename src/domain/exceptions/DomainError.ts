export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class InvalidEmailError extends DomainError {
  constructor(email: string) {
    super(`El correo electrónico '${email}' no es válido.`);
    this.name = 'InvalidEmailError';
  }
}

export class InvalidProjectRequestError extends DomainError {
  constructor(reason: string) {
    super(`Solicitud de proyecto inválida: ${reason}`);
    this.name = 'InvalidProjectRequestError';
  }
}

export class InvalidContactError extends DomainError {
  constructor(reason: string) {
    super(`Contacto inválido: ${reason}`);
    this.name = 'InvalidContactError';
  }
}

export class InvalidEmailTemplateError extends DomainError {
  constructor(reason: string) {
    super(`Plantilla inválida: ${reason}`);
    this.name = 'InvalidEmailTemplateError';
  }
}

export class InvalidCrmMessageError extends DomainError {
  constructor(reason: string) {
    super(`Mensaje inválido: ${reason}`);
    this.name = 'InvalidCrmMessageError';
  }
}

export class InvalidCadenceError extends DomainError {
  constructor(reason: string) {
    super(`Cadencia inválida: ${reason}`);
    this.name = 'InvalidCadenceError';
  }
}
