/**
 * 1) Create one issue in the default/backlog column (usually "To Do" / "Todo" on the board).
 * 2) Move the "hello world" issue to In Progress.
 *
 * Run: npm run jira:board-update
 * Env: same Atlassian vars as other scripts. Optional:
 *   JIRA_PROJECT_KEY=KAN
 *   JIRA_HELLO_ISSUE_KEY=KAN-1   (the hello world issue)
 */
import 'dotenv/config';
import {
  createJiraClientFromEnv,
  JiraApiError,
} from '../src/integrations/jira/jiraClient.js';
import { updateIssueStatus } from '../src/services/jiraService.js';

const projectKey = process.env.JIRA_PROJECT_KEY ?? 'KAN';
const helloIssueKey = process.env.JIRA_HELLO_ISSUE_KEY ?? 'KAN-1';
const typeCandidates = [
  process.env.JIRA_ISSUE_TYPE,
  'Task',
  'Story',
  'Bug',
].filter((t): t is string => Boolean(t));
const uniqueTypes = [...new Set(typeCandidates)];

async function main() {
  const client = createJiraClientFromEnv();

  let created: { key: string } | null = null;
  const summary = 'My second feature is simple';
  for (const issueTypeName of uniqueTypes) {
    try {
      created = await client.createIssue({
        projectKey,
        summary,
        issueTypeName,
      });
      break;
    } catch (e) {
      if (e instanceof JiraApiError && e.statusCode === 400) continue;
      throw e;
    }
  }
  if (!created) {
    throw new Error('Could not create second issue (check issue type / project permissions)');
  }
  process.stdout.write(`Created ${created.key}: ${summary}\n`);

  const moved = await updateIssueStatus(helloIssueKey, 'In Progress');
  process.stdout.write(
    `Moved ${helloIssueKey} → In Progress (transition: ${moved.appliedTransition.name})\n`,
  );
}

main().catch((err) => {
  process.stderr.write(err instanceof Error ? err.message : String(err));
  process.stderr.write('\n');
  process.exit(1);
});
