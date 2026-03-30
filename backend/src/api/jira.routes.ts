import { Router } from 'express';
import { HttpError } from '../http/middleware/errorHandler.js';
import * as jiraService from '../services/jiraService.js';
import { JiraApiError } from '../integrations/jira/jiraClient.js';

export const jiraApiRouter = Router();

function handleJiraErr(err: unknown, next: (e: unknown) => void): void {
  if (err instanceof JiraApiError) {
    next(new HttpError(err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 502, err.message));
    return;
  }
  if (err instanceof Error && err.message.includes('ATLASSIAN_')) {
    next(new HttpError(503, err.message));
    return;
  }
  next(err);
}

/** GET /api/jira/issues/:issueKey */
jiraApiRouter.get('/jira/issues/:issueKey', async (req, res, next) => {
  try {
    const issue = await jiraService.getIssue(req.params.issueKey);
    res.json(issue);
  } catch (e) {
    handleJiraErr(e, next);
  }
});

/** GET /api/jira/issues/:issueKey/transitions */
jiraApiRouter.get('/jira/issues/:issueKey/transitions', async (req, res, next) => {
  try {
    const transitions = await jiraService.listTransitions(req.params.issueKey);
    res.json({ transitions });
  } catch (e) {
    handleJiraErr(e, next);
  }
});

/** POST /api/jira/issues/:issueKey/status — body: { "statusName": "Done" } */
jiraApiRouter.post('/jira/issues/:issueKey/status', async (req, res, next) => {
  try {
    const statusName = (req.body as { statusName?: string })?.statusName;
    if (!statusName || typeof statusName !== 'string') {
      next(new HttpError(400, 'JSON body must include statusName (string)'));
      return;
    }
    const result = await jiraService.updateIssueStatus(req.params.issueKey, statusName);
    res.json({
      ok: true,
      issueKey: req.params.issueKey,
      appliedTransition: result.appliedTransition,
      previousStatus: result.previous.status,
    });
  } catch (e) {
    handleJiraErr(e, next);
  }
});
