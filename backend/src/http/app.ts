import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import pino from 'pino';
import swaggerUi from 'swagger-ui-express';
import { helloApiRouter } from '../api/hello.js';
import { jiraApiRouter } from '../api/jira.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { openApiSpec } from './openapi.js';
import { healthRouter } from './routes/health.js';
import { jiraWebhooksRouter } from './routes/webhooks/jira.js';
import { rulesRouter } from './routes/rules.js';

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

export function createApp() {
  const app = express();

  // Swagger UI uses inline scripts; disable CSP in development. In production, avoid public /api-docs or configure CSP.
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    }),
  );
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ logger }));

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

  app.use(healthRouter);
  app.use('/webhooks', jiraWebhooksRouter);
  // JSON REST APIs: add routers from src/api/ under the /api prefix
  app.use('/api', helloApiRouter);
  app.use('/api', jiraApiRouter);
  app.use('/api/rules', rulesRouter);

  app.use(errorHandler);

  return app;
}
