import {
  createJiraClientFromEnv,
  JiraApiError,
  type JiraClient,
} from '../integrations/jira/jiraClient.js';
import type { JiraIssueSummary, JiraTransition } from '../integrations/jira/types.js';

function getClient(): JiraClient {
  return createJiraClientFromEnv();
}

export async function getIssue(issueKey: string): Promise<JiraIssueSummary> {
  return getClient().getIssue(issueKey);
}

export async function listTransitions(issueKey: string): Promise<JiraTransition[]> {
  return getClient().listTransitions(issueKey);
}

/**
 * Move issue to a workflow status by finding a transition whose target status name matches.
 * Matching is case-insensitive. Uses the first matching transition Jira offers.
 */
export async function updateIssueStatus(
  issueKey: string,
  targetStatusName: string,
): Promise<{ appliedTransition: JiraTransition; previous: JiraIssueSummary }> {
  const client = getClient();
  const previous = await client.getIssue(issueKey);
  const transitions = await client.listTransitions(issueKey);
  const wanted = targetStatusName.trim().toLowerCase();
  const match = transitions.find((t) => t.to.name.toLowerCase() === wanted);
  if (!match) {
    const available = transitions.map((t) => `${t.name} → ${t.to.name}`).join(', ') || '(none)';
    throw new JiraApiError(
      400,
      `No transition to status "${targetStatusName}". Available: ${available}`,
    );
  }
  await client.doTransition(issueKey, match.id);
  return { appliedTransition: match, previous };
}

export { JiraApiError };
