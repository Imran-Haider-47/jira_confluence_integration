# Jira Cloud integration

How this project talks to **Jira Cloud**, and how that fits the DevOps intelligence idea.

---

## What is the Jira REST API? (simple)

Jira Cloud exposes **HTTP endpoints** on your site, such as:

`https://YOUR-SUBDOMAIN.atlassian.net/rest/api/3/...`

Your backend sends **GET** or **POST** requests with **JSON** bodies and reads JSON responses. That is the same REST style as your own `/api/...` routes.

### Real-world analogy

Jira is the **official record book** for work items. The REST API is the **librarian’s window**: you ask “what is ticket DEMO-1?” (GET issue) or “please move DEMO-1 to Done” (POST transition). You must prove **who you are** (authentication) before the librarian changes the book.

### How we use it in this project

- `GET /api/jira/issues/:issueKey` — our backend calls Jira’s **get issue** and returns a small summary (key, summary, status, project, type).
- `GET /api/jira/issues/:issueKey/transitions` — lists **allowed** workflow steps from the current status (Jira decides what valid).
- `POST /api/jira/issues/:issueKey/status` — body `{ "statusName": "Done" }`. We pick the transition whose **target status** matches that name and call Jira’s **transition** endpoint.

Later, **GitHub webhooks** and **CI** can feed the same “feature status” logic; Jira is one source of truth for “what the ticket says.”

---

## Authentication (API token)

Jira Cloud does **not** use your password in API calls. You create an **API token** in Atlassian account settings and use:

- **HTTP Basic auth**: `email` + **API token** (not password), Base64-encoded in the `Authorization` header.

Our code builds that header in `backend/src/integrations/jira/jiraClient.ts`.

### Env vars (`.env`)

- `ATLASSIAN_SITE_URL` — e.g. `https://your-site.atlassian.net` (no trailing slash needed; we normalize).
- `ATLASSIAN_EMAIL` — the Atlassian account that owns the token.
- `ATLASSIAN_API_TOKEN` — the token string.

If any are missing, Jira routes return **503** with a clear message.

### Permissions

The account must **see** the project and **transition** issues according to your workflow. If you get 403/404, check Jira project permissions.

---

## Files to read in the repo

| File | Role |
|------|------|
| `backend/src/integrations/jira/jiraClient.ts` | Low-level `fetch` to Jira REST v3 |
| `backend/src/integrations/jira/types.ts` | TypeScript shapes we expose |
| `backend/src/services/jiraService.ts` | `getIssue`, `listTransitions`, `updateIssueStatus` |
| `backend/src/api/jira.routes.ts` | Express routes → service |

Try calls from **http://localhost:3000/api-docs** after filling `.env`.

---

## Why transitions instead of “set status = Done”?

Jira workflows are **state machines**: you may only move along **allowed** edges. So the API uses **transition IDs**, not “set field Status”. Our `updateIssueStatus` asks Jira which transitions exist, finds one whose **destination status name** matches your `statusName`, then applies that transition.

---

## Safety note

`POST .../status` changes real Jira data. Use a **test project** or scratch issues (e.g. DEMO-1) while learning.
