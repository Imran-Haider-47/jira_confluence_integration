/**
 * Orchestrates: normalized webhook event → match rules → Jira/Confluence clients → persistence.
 * Call from your Jira webhook route once payloads and rules exist.
 */
export async function processJiraWebhookEvent(_payload: unknown): Promise<void> {
  // Implement
}
