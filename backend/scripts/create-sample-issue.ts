/**
 * One-off: create a single Jira issue using credentials from .env (not read by the assistant).
 * Run from backend: npm run jira:create-issue
 */
import 'dotenv/config';
import {
  createJiraClientFromEnv,
  JiraApiError,
} from '../src/integrations/jira/jiraClient.js';

const summary = 'hello world!';
const projectKey = process.env.JIRA_PROJECT_KEY ?? 'KAN';
const typeCandidates = [
  process.env.JIRA_ISSUE_TYPE,
  'Task',
  'Story',
  'Bug',
].filter((t): t is string => Boolean(t));
const uniqueTypes = [...new Set(typeCandidates)];

async function main() {
  const client = createJiraClientFromEnv();
  let lastErr: unknown;
  for (const issueTypeName of uniqueTypes) {
    try {
      const created = await client.createIssue({
        projectKey,
        summary,
        issueTypeName,
      });
      process.stdout.write(
        JSON.stringify(
          { ok: true, key: created.key, id: created.id, issueTypeName, projectKey },
          null,
          2,
        ) + '\n',
      );
      return;
    } catch (e) {
      lastErr = e;
      if (e instanceof JiraApiError && e.statusCode === 400) {
        continue;
      }
      throw e;
    }
  }
  throw lastErr ?? new Error('Could not create issue');
}

main().catch((err) => {
  process.stderr.write(err instanceof Error ? err.message : String(err));
  process.stderr.write('\n');
  process.exit(1);
});
