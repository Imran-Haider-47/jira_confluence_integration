import type { JiraIssueSummary, JiraTransition } from './types.js';

export type JiraClientConfig = {
  siteUrl: string;
  email: string;
  apiToken: string;
};

export type JiraClient = {
  getIssue: (issueKey: string) => Promise<JiraIssueSummary>;
  createIssue: (input: {
    projectKey: string;
    summary: string;
    issueTypeName: string;
  }) => Promise<{ key: string; id: string }>;
  listTransitions: (issueKey: string) => Promise<JiraTransition[]>;
  doTransition: (issueKey: string, transitionId: string) => Promise<void>;
};

function normalizeSiteUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function authHeader(email: string, apiToken: string): string {
  const token = Buffer.from(`${email}:${apiToken}`, 'utf8').toString('base64');
  return `Basic ${token}`;
}

async function jiraFetch(
  baseUrl: string,
  auth: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  return fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: auth,
      ...init?.headers,
    },
  });
}

function mapIssue(json: Record<string, unknown>): JiraIssueSummary {
  const fields = json.fields as Record<string, unknown>;
  const status = fields.status as { name?: string; id?: string };
  const issuetype = fields.issuetype as { name?: string };
  const project = fields.project as { key?: string; name?: string };
  return {
    key: String(json.key),
    id: String(json.id),
    summary: String(fields.summary ?? ''),
    status: { name: String(status?.name ?? ''), id: String(status?.id ?? '') },
    issueType: { name: String(issuetype?.name ?? '') },
    project: {
      key: String(project?.key ?? ''),
      name: String(project?.name ?? ''),
    },
  };
}

export function createJiraClient(config: JiraClientConfig): JiraClient {
  const baseUrl = normalizeSiteUrl(config.siteUrl);
  const auth = authHeader(config.email, config.apiToken);
  const fieldsParam = 'fields=summary,status,issuetype,project';

  return {
    async getIssue(issueKey: string) {
      const key = encodeURIComponent(issueKey);
      const res = await jiraFetch(
        baseUrl,
        auth,
        `/rest/api/3/issue/${key}?${fieldsParam}`,
      );
      if (!res.ok) {
        const text = await res.text();
        throw new JiraApiError(res.status, `getIssue failed: ${text}`);
      }
      const json = (await res.json()) as Record<string, unknown>;
      return mapIssue(json);
    },

    async createIssue(input) {
      const res = await jiraFetch(baseUrl, auth, `/rest/api/3/issue`, {
        method: 'POST',
        body: JSON.stringify({
          fields: {
            project: { key: input.projectKey },
            summary: input.summary,
            issuetype: { name: input.issueTypeName },
          },
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new JiraApiError(res.status, `createIssue failed: ${text}`);
      }
      const json = (await res.json()) as { key?: string; id?: string };
      return { key: String(json.key), id: String(json.id) };
    },

    async listTransitions(issueKey: string) {
      const key = encodeURIComponent(issueKey);
      const res = await jiraFetch(
        baseUrl,
        auth,
        `/rest/api/3/issue/${key}/transitions`,
      );
      if (!res.ok) {
        const text = await res.text();
        throw new JiraApiError(res.status, `listTransitions failed: ${text}`);
      }
      const json = (await res.json()) as { transitions?: unknown[] };
      const raw = json.transitions ?? [];
      return raw.map((t) => {
        const tr = t as Record<string, unknown>;
        const to = tr.to as Record<string, unknown>;
        return {
          id: String(tr.id),
          name: String(tr.name ?? ''),
          to: { name: String(to?.name ?? ''), id: String(to?.id ?? '') },
        };
      });
    },

    async doTransition(issueKey: string, transitionId: string) {
      const key = encodeURIComponent(issueKey);
      const res = await jiraFetch(baseUrl, auth, `/rest/api/3/issue/${key}/transitions`, {
        method: 'POST',
        body: JSON.stringify({
          transition: { id: transitionId },
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new JiraApiError(res.status, `doTransition failed: ${text}`);
      }
    },
  };
}

export class JiraApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'JiraApiError';
  }
}

/** Call after dotenv loads; used by HTTP routes */
export function createJiraClientFromEnv(): JiraClient {
  const siteUrl = process.env.ATLASSIAN_SITE_URL;
  const email = process.env.ATLASSIAN_EMAIL;
  const apiToken = process.env.ATLASSIAN_API_TOKEN;
  if (!siteUrl?.trim() || !email?.trim() || !apiToken?.trim()) {
    throw new Error(
      'Set ATLASSIAN_SITE_URL, ATLASSIAN_EMAIL, and ATLASSIAN_API_TOKEN in .env (Jira Cloud)',
    );
  }
  return createJiraClient({ siteUrl: siteUrl.trim(), email: email.trim(), apiToken: apiToken.trim() });
}
