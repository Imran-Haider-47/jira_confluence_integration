import { Router } from 'express';

/**
 * Example REST handler. Mount this router at "/api" so this route is GET /api/hello.
 * Add more files in src/api/ (e.g. rules.ts) and combine them here or in app.ts.
 */
export const helloApiRouter = Router();

helloApiRouter.get('/hello', (_req, res) => {
  res.status(200).json({ message: 'hello world' });
});
