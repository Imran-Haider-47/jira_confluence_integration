import type { NextFunction, Request, Response } from 'express';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  const status = err instanceof HttpError ? err.status : 500;
  res.status(status).json({ error: message });
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
