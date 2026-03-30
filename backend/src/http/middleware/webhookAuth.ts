import type { NextFunction, Request, Response } from 'express';

/**
 * Verify Jira webhook authenticity (shared secret, signature, etc.).
 * Implement here when you wire Jira: compare query/header token to JIRA_WEBHOOK_SECRET.
 */
export function webhookAuth(_req: Request, _res: Response, next: NextFunction): void {
  next();
}
