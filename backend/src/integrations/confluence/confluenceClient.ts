/**
 * Confluence Cloud REST API (same site + auth as Jira Cloud).
 * API base: {siteUrl}/wiki/rest/api
 */
export type ConfluenceClientConfig = {
  siteUrl: string;
  email: string;
  apiToken: string;
};

export type ConfluenceSpaceRef = { key: string; name: string };

export type ConfluencePageSummary = { id: string; title: string; version: number };

function normalizeSiteUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function authHeader(email: string, apiToken: string): string {
  const token = Buffer.from(`${email}:${apiToken}`, 'utf8').toString('base64');
  return `Basic ${token}`;
}

async function cfFetch(
  siteRoot: string,
  auth: string,
  apiPath: string,
  init?: RequestInit,
): Promise<Response> {
  const path = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  const url = `${siteRoot}/wiki/rest/api${path}`;
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

export class ConfluenceApiError extends Error {
  constructor(
    public statusCode: number,
      message: string,
  ) {
    super(message);
    this.name = 'ConfluenceApiError';
  }
}

export type ConfluenceClient = {
  listSpaces: (limit?: number) => Promise<ConfluenceSpaceRef[]>;
  findSpaceKeyByName: (displayName: string) => Promise<string | null>;
  /** Pages in space (recent first), for fuzzy title matching if exact lookup fails. */
  listPagesInSpace: (spaceKey: string, limit?: number) => Promise<ConfluencePageSummary[]>;
  findPageByTitle: (spaceKey: string, title: string) => Promise<ConfluencePageSummary | null>;
  getPage: (pageId: string) => Promise<{
    id: string;
    title: string;
    version: number;
    storageValue: string;
  }>;
  updatePageStorageBody: (
    pageId: string,
    title: string,
    storageXhtml: string,
    nextVersionNumber: number,
  ) => Promise<void>;
  createPage: (spaceKey: string, title: string, storageXhtml: string) => Promise<{ id: string }>;
};

export function createConfluenceClient(config: ConfluenceClientConfig): ConfluenceClient {
  const siteRoot = normalizeSiteUrl(config.siteUrl);
  const auth = authHeader(config.email, config.apiToken);

  return {
    async listSpaces(limit = 100) {
      const res = await cfFetch(siteRoot, auth, `/space?limit=${limit}`);
      if (!res.ok) {
        throw new ConfluenceApiError(res.status, `listSpaces: ${await res.text()}`);
      }
      const json = (await res.json()) as { results?: { key: string; name: string }[] };
      return (json.results ?? []).map((r) => ({ key: r.key, name: r.name }));
    },

    async findSpaceKeyByName(displayName) {
      const wanted = displayName.trim().toLowerCase();
      const spaces = await this.listSpaces();
      const hit = spaces.find((s) => s.name.trim().toLowerCase() === wanted);
      return hit?.key ?? null;
    },

    async listPagesInSpace(spaceKey, limit = 100) {
      const q = new URLSearchParams({
        spaceKey,
        type: 'page',
        limit: String(limit),
        expand: 'version',
      });
      const res = await cfFetch(siteRoot, auth, `/content?${q.toString()}`);
      if (!res.ok) {
        throw new ConfluenceApiError(res.status, `listPagesInSpace: ${await res.text()}`);
      }
      const json = (await res.json()) as {
        results?: { id: string; title: string; version?: { number: number } }[];
      };
      const rows = json.results ?? [];
      const out: ConfluencePageSummary[] = [];
      for (const r of rows) {
        const ver = r.version?.number;
        if (ver === undefined) {
          const full = await this.getPage(r.id);
          out.push({ id: r.id, title: r.title, version: full.version });
        } else {
          out.push({ id: r.id, title: r.title, version: ver });
        }
      }
      return out;
    },

    async findPageByTitle(spaceKey, title) {
      // Prefer legacy query (exact title match in space) — more reliable than CQL for many tenants.
      const listParams = new URLSearchParams({
        spaceKey,
        title,
        type: 'page',
        limit: '10',
      });
      const listRes = await cfFetch(siteRoot, auth, `/content?${listParams.toString()}`);
      if (listRes.ok) {
        const listJson = (await listRes.json()) as {
          results?: { id: string; title: string; version?: { number: number } }[];
        };
        const exact = listJson.results?.find(
          (p) => p.title.trim().toLowerCase() === title.trim().toLowerCase(),
        );
        const pick = exact ?? listJson.results?.[0];
        if (pick) {
          const ver = pick.version?.number;
          if (ver === undefined) {
            const full = await this.getPage(pick.id);
            return { id: pick.id, title: pick.title, version: full.version };
          }
          return { id: pick.id, title: pick.title, version: ver };
        }
      }

      const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      const cql = `space = '${esc(spaceKey)}' AND title = '${esc(title)}'`;
      const q = new URLSearchParams({ cql, limit: '5' });
      const res = await cfFetch(siteRoot, auth, `/content/search?${q.toString()}`);
      if (!res.ok) {
        throw new ConfluenceApiError(res.status, `content/search: ${await res.text()}`);
      }
      const json = (await res.json()) as {
        results?: { id: string; title: string; version?: { number: number } }[];
      };
      const r = json.results?.[0];
      if (!r) return null;
      const ver = r.version?.number;
      if (ver === undefined) {
        const full = await this.getPage(r.id);
        return { id: r.id, title: r.title, version: full.version };
      }
      return { id: r.id, title: r.title, version: ver };
    },

    async getPage(pageId) {
      const res = await cfFetch(
        siteRoot,
        auth,
        `/content/${encodeURIComponent(pageId)}?expand=body.storage,version`,
      );
      if (!res.ok) {
        throw new ConfluenceApiError(res.status, `getPage: ${await res.text()}`);
      }
      const json = (await res.json()) as {
        id: string;
        title: string;
        body?: { storage?: { value?: string } };
        version?: { number: number };
      };
      return {
        id: json.id,
        title: json.title,
        version: json.version?.number ?? 1,
        storageValue: json.body?.storage?.value ?? '',
      };
    },

    async updatePageStorageBody(pageId, title, storageXhtml, nextVersionNumber) {
      const res = await cfFetch(
        siteRoot,
        auth,
        `/content/${encodeURIComponent(pageId)}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            id: pageId,
            type: 'page',
            title,
            status: 'current',
            body: {
              storage: {
                value: storageXhtml,
                representation: 'storage',
              },
            },
            version: {
              number: nextVersionNumber,
              message: 'Updated via jira_confluencer sync script',
            },
          }),
        },
      );
      if (!res.ok) {
        throw new ConfluenceApiError(res.status, `updatePage: ${await res.text()}`);
      }
    },

    async createPage(spaceKey, title, storageXhtml) {
      const res = await cfFetch(siteRoot, auth, `/content`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'page',
          title,
          space: { key: spaceKey },
          body: {
            storage: {
              value: storageXhtml,
              representation: 'storage',
            },
          },
        }),
      });
      if (!res.ok) {
        throw new ConfluenceApiError(res.status, `createPage: ${await res.text()}`);
      }
      const json = (await res.json()) as { id: string };
      return { id: String(json.id) };
    },
  };
}

export function createConfluenceClientFromEnv(): ConfluenceClient {
  const siteUrl = process.env.ATLASSIAN_SITE_URL;
  const email = process.env.ATLASSIAN_EMAIL;
  const apiToken = process.env.ATLASSIAN_API_TOKEN;
  if (!siteUrl?.trim() || !email?.trim() || !apiToken?.trim()) {
    throw new Error(
      'Set ATLASSIAN_SITE_URL, ATLASSIAN_EMAIL, ATLASSIAN_API_TOKEN in .env for Confluence',
    );
  }
  return createConfluenceClient({ siteUrl: siteUrl.trim(), email: email.trim(), apiToken: apiToken.trim() });
}
