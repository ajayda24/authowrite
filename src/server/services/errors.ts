/**
 * Domain errors thrown by services. Server actions and route handlers turn
 * them into user-facing messages / HTTP statuses.
 */
export class DomainError extends Error {
  readonly status: number = 400;
}

export class NotFoundError extends DomainError {
  override readonly status = 404;
  constructor(what = "That page") {
    super(`${what} could not be found.`);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends DomainError {
  override readonly status = 403;
  constructor(message = "You don't have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthenticatedError extends DomainError {
  override readonly status = 401;
  constructor(message = "Please sign in to continue.") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

export class ValidationError extends DomainError {
  override readonly status = 422;
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class ConflictError extends DomainError {
  override readonly status = 409;
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

/** The user performing an action. `null` means an anonymous visitor. */
export type Actor = { id: string } | null;

export function requireActor(actor: Actor): { id: string } {
  if (!actor) throw new UnauthenticatedError();
  return actor;
}
