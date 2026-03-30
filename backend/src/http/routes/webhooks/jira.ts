import { Router } from 'express';

/**
 * Jira Cloud webhook entrypoint.
 * Example: import { webhookAuth } from '../../middleware/webhookAuth.js';
 *          jiraWebhooksRouter.post('/jira', webhookAuth, (req, res) => { ... });
 */
export const jiraWebhooksRouter = Router();
