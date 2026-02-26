/**
 * Custom error classes
 */

export class AppError extends Error {
  public statusCode: number;
  public code: string;

  constructor(
    message: string,
    codeOrStatusCode?: string | number,
    statusCodeOrCode?: number | string
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);

    // Handle different parameter combinations
    if (typeof codeOrStatusCode === 'string') {
      // (message, code, statusCode) format
      this.code = codeOrStatusCode;
      this.statusCode = typeof statusCodeOrCode === 'number' ? statusCodeOrCode : 500;
    } else if (typeof codeOrStatusCode === 'number') {
      // (message, statusCode, code) format
      this.statusCode = codeOrStatusCode;
      this.code = typeof statusCodeOrCode === 'string' ? statusCodeOrCode : 'INTERNAL_ERROR';
    } else {
      // Default values
      this.statusCode = 500;
      this.code = 'INTERNAL_ERROR';
    }
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, 'INTERNAL_SERVER_ERROR');
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}
