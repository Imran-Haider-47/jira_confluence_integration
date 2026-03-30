# Jira Cloud integration — concepts and how this codebase implements them

Jira Cloud is one source of truth for **work items** (issues), their **workflow status**, and who is allowed to change what. This document explains the REST API model and traces the code path from HTTP routes down to Atlassian’s servers.

---

## Jira REST API v3 — base URL and resources

For a Cloud site `https://YOUR_SITE.atlassian.net`, Jira REST v3 lives under:

`https://YOUR_SITE.atlassian.net/rest/api/3/...`

Important resources used in this project:

- **GET** `/rest/api/3/issue/{issueIdOrKey}?fields=...` — read an issue; `fields` limits payload size.
- **POST** `/rest/api/3/issue` — create an issue (`project`, `summary`, `issuetype`, etc.).
- **GET** `/rest/api/3/issue/{issueIdOrKey}/transitions` — list **legal** workflow moves from the issue’s **current** status.
- **POST** `/rest/api/3/issue/{issueIdOrKey}/transitions` — apply one transition by **id** (body: `{ "transition": { "id": "..." } }`).

Everything is **JSON** over **HTTPS**. The same patterns apply to other endpoints (comments, links, search) if you extend the app later.

---

## Authentication

Jira Cloud expects **HTTP Basic** auth for simple integrations:

- Username: **Atlassian account email**
- Password: **API token** (created under Atlassian account security), **not** the web login password

The header is built as:

`Authorization: Basic base64(email + ":" + api_token)`

The implementation is in `backend/src/integrations/jira/jiraClient.ts` (`authHeader`). The same credentials work for **Jira** and **Confluence** on the same Cloud site.

Environment variables (see `backend/.env.example`):

- `ATLASSIAN_SITE_URL` — site root, e.g. `https://your-site.atlassian.net` (trailing slashes are stripped).
- `ATLASSIAN_EMAIL`
- `ATLASSIAN_API_TOKEN`

`createJiraClientFromEnv()` throws if any of these are missing; Express routes map that to **503** so the failure is explicit.

---

## Why workflows use transitions, not “set status to Done”

A Jira **workflow** is a **directed graph**: from status A you may only go to B or C if a **transition** exists. Different roles may see different transitions. There is no stable public API like “PATCH status = Done” that bypasses that graph.

Correct pattern:

1. **GET** transitions for the issue.
2. Choose the transition whose **destination** matches the business intent (e.g. status name “Done”).
3. **POST** that transition’s **id**.

If you skip step 1 and guess transition ids, you get fragile code that breaks when an admin changes the workflow.

This project’s `updateIssueStatus` in `backend/src/services/jiraService.ts` loads transitions, finds the first transition whose **target status name** matches (case-insensitive), then calls `doTransition`. If nothing matches, it returns a **400**-style error with a human-readable list of available transitions — that is essential for debugging when status labels differ slightly (“In Progress” vs “IN PROGRESS”).

---

## Code architecture (layers)

### 1. Integration layer — `jiraClient.ts`

- **`jiraFetch`**: single place for URL construction, `Authorization`, `Accept: application/json`, and `Content-Type: application/json` on writes.
- **`createJiraClient(config)`**: returns an object with **`getIssue`**, **`createIssue`**, **`listTransitions`**, **`doTransition`**.
- **`mapIssue`**: narrows the large Jira JSON document to **`JiraIssueSummary`** (`types.ts`) so the rest of the app does not depend on every Jira field.
- **`JiraApiError`**: carries **HTTP status** from Jira so routes can distinguish 404 (not found) from 401 (auth) from 400 (bad request).

Using **fetch** (built into Node 18+) avoids an extra HTTP dependency; retries and rate-limit handling can be added here later.

### 2. Service layer — `jiraService.ts`

Orchestration only: **`getClient()`** via `createJiraClientFromEnv()`, then delegates. **`updateIssueStatus`** implements the transition-selection policy described above. Keeping this separate from Express makes it testable and reusable from **scripts** (see below).

### 3. HTTP layer — `jira.routes.ts`

- Registers **`/api/jira/...`** routes on the shared Express app (`app.ts` mounts `jiraApiRouter` under `/api`).
- **`handleJiraErr`**: maps **`JiraApiError`** to **`HttpError`** with the same status when it is 4xx/5xx; maps missing Atlassian env to **503**.

### 4. Scripts (CLI, not browser)

- **`backend/scripts/create-sample-issue.ts`** — creates an issue with a fixed summary; tries several issue types if Jira rejects one.
- **`backend/scripts/jira-board-update.ts`** — creates a second issue and moves a configurable key (default `KAN-1`) to **In Progress**.
- **`backend/scripts/hello-world-confluence-and-jira-done.ts`** — updates or creates Confluence content and moves a Jira issue to **Done** via **`updateIssueStatus`**.

Scripts load `dotenv/config` and call the same service/client code as the HTTP API.

---

## Public HTTP surface (mirrored in Swagger)

| Method | Path | Behaviour |
|--------|------|-----------|
| GET | `/api/jira/issues/:issueKey` | Returns **`JiraIssueSummary`** (key, summary, status, project, issue type). |
| GET | `/api/jira/issues/:issueKey/transitions` | Returns `{ transitions: [...] }` from Jira. |
| POST | `/api/jira/issues/:issueKey/status` | Body **`{ "statusName": "Done" }`**; runs **`updateIssueStatus`**. |

OpenAPI definitions live in `backend/src/http/openapi.ts` for **`/api-docs`**.

---

## Operational concerns (production-minded)

- **Permissions**: the API token’s user must browse the project and execute the transitions you need.
- **Rate limiting**: Cloud may return **429**; a production client would backoff/retry on `jiraFetch`.
- **Audit and safety**: **`POST .../status`** changes live data. Scripts should target non-production projects when possible.
- **Issue keys**: `PROJECT-NUMBER` (e.g. `KAN-1`) is stable; numeric **id** is also valid in some endpoints but keys are easier for humans.

---

## How this fits the wider product direction

The long-term idea is to **correlate** signals (Git commits referencing `KAN-123`, CI results, deploy events) with **Jira status** and **Confluence documentation**. Jira integration here is the **read/write** bridge to the ticketing system; webhooks and queues would feed the same service layer later.

---

## File reference

| Path | Role |
|------|------|
| `backend/src/integrations/jira/jiraClient.ts` | HTTP calls + auth + error type |
| `backend/src/integrations/jira/types.ts` | `JiraIssueSummary`, `JiraTransition` |
| `backend/src/services/jiraService.ts` | `getIssue`, `listTransitions`, `updateIssueStatus` |
| `backend/src/api/jira.routes.ts` | Express binding + error mapping |
| `backend/scripts/*.ts` | One-off automation using the same stack |
