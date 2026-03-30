# Confluence Cloud integration — concepts and how this codebase implements them

Confluence is Atlassian’s **wiki / documentation** product on the same Cloud tenant as Jira. Pages live in **spaces** (each has a short **space key** and a human-readable **name**). This document explains the REST model and how `backend/src/integrations/confluence/confluenceClient.ts` talks to it.

---

## API base path (different from Jira)

Jira REST uses:

`/rest/api/3/...`

Confluence REST v1 on Cloud uses:

`/wiki/rest/api/...`

Full examples:

- `GET https://YOUR_SITE.atlassian.net/wiki/rest/api/space?limit=100`
- `GET https://YOUR_SITE.atlassian.net/wiki/rest/api/content/{id}?expand=body.storage,version`

The client builds URLs as **`{ATLASSIAN_SITE_URL}/wiki/rest/api` + path**. If you pass the Jira board URL by mistake (`.../jira/software/...`), requests will fail — only the **site root** belongs in `ATLASSIAN_SITE_URL`.

---

## Authentication

Same as Jira: **Basic** auth with **email + API token** in `Authorization`. One token can authorize both products if the account has access to the space.

Implementation: `authHeader` in `confluenceClient.ts` (identical idea to Jira’s client). `createConfluenceClientFromEnv()` reads the same three env vars as Jira.

---

## Spaces: key vs name

- **Space name** — what users see in the UI (“Software Development”).
- **Space key** — short identifier in URLs (often something like `SD`) and in API calls.

APIs almost always need the **key**. This project resolves **name → key** by listing spaces (`GET /space`) and case-insensitive matching on `name` (`findSpaceKeyByName`). You can override resolution with **`CONFLUENCE_SPACE_KEY`** in `.env` if names are ambiguous or many spaces exist.

---

## Page identity and versions

A page has:

- **`id`** — stable numeric string Content id (used in URLs like `/pages/1114113/...`).
- **`title`** — display title (not guaranteed unique in all setups; Confluence may allow duplicates depending on configuration — be careful with automation).
- **`version.number`** — **optimistic concurrency**: every **update** must send the **next** version number. If two writers clash, Confluence rejects the update.

Flow for **updating** body content:

1. **GET** `/content/{id}?expand=body.storage,version` — read current **storage** XHTML and **version**.
2. **PUT** `/content/{id}` with JSON containing **`type`**, **`title`**, **`status`**, **`version`: `{ number: current + 1 }`**, and **`body.storage`** (`value` + `representation: "storage"`).

`updatePageStorageBody` in the client implements exactly that contract.

---

## Storage format (body)

Confluence stores page bodies in **storage** form: an **XHTML-like** XML string with optional **macros** (`ac:structured-macro`, etc.). For simple docs, plain tags such as `<h1>`, `<p>`, `<ul>`, `<pre><code>` work.

Angles brackets and quotes inside text should be **escaped** as entities where needed (e.g. `&quot;` inside JSON examples in HTML) so the XML remains valid.

**Atlas Doc Format** (ADF) is another representation; this codebase uses **storage** only for simplicity.

---

## Finding pages

Several strategies exist in the client:

1. **`GET /content?spaceKey=...&type=page&limit=...&expand=version`** — lists pages in a space (`listPagesInSpace`). Reliable for “enumerate then filter in code”.
2. **`GET /content/search?cql=...`** — **CQL** (Confluence Query Language) for precise filters (`findPageByTitle` fallback).
3. **Exact title + spaceKey** query params on `/content` — used in **`findPageByTitle`** first attempt before CQL.

Real data is messy: titles differ by case, spaces, or underscores. The sync script **`hello-world-confluence-and-jira-done.ts`** normalizes titles (lowercase, collapse spaces to underscores) and falls back to substring matches (`jira` + `integration`) before **creating** a page if nothing matches — creation avoids blocking automation when search indexing or permissions hide results.

---

## Creating pages

**POST** `/content` with JSON:

- `type`: `"page"`
- `title`
- `space`: `{ "key": "SPACEKEY" }`
- `body.storage`: `{ value, representation: "storage" }`

`createPage` returns the new **`id`**. Creating duplicates with the same title may or may not be allowed depending on site rules; prefer **update** when the page id is known (`CONFLUENCE_PAGE_TITLE` exact match helps).

---

## Error handling

`ConfluenceApiError` mirrors **`statusCode`** from the HTTP response. Typical cases:

- **401** — bad or expired token, wrong email.
- **403** — token valid but no permission to space or page.
- **404** — wrong `id` or deleted content.
- **400** — malformed body, invalid storage XML, or bad version (often “version conflict” if someone else edited the page).

Production code would log response bodies (without secrets) and optionally retry on **429**.

---

## Code layout

| Piece | Responsibility |
|--------|------------------|
| `cfFetch` | Prefix `/wiki/rest/api`, inject auth and JSON headers. |
| `listSpaces` / `findSpaceKeyByName` | Discover **spaceKey** from human name. |
| `listPagesInSpace` / `findPageByTitle` | Discover **page id** + **version** hint. |
| `getPage` | Full read with **body.storage** + **version** for updates. |
| `updatePageStorageBody` | Versioned **PUT** with new storage HTML. |
| `createPage` | **POST** new page in a space. |

There is **no** Express router for Confluence in this repo yet; automation runs through **`scripts/hello-world-confluence-and-jira-done.ts`**. The same client can be imported into **`services/`** and **`api/`** later for “doc sync from Jira webhook” workflows.

---

## Environment variables (beyond Atlassian core)

Documented in `backend/.env.example`:

- **`CONFLUENCE_SPACE_KEY`** — skip name lookup when you already know the key from the URL (`/spaces/SD/...`).
- **`CONFLUENCE_PAGE_TITLE`** — exact title string Confluence shows if automation should target one specific page.

---

## Relationship to Jira in this project

The **`sync:hello-doc-done`** script chains **Confluence** (write documentation for the Hello API) with **Jira** (`updateIssueStatus` → **Done**) so one command closes the loop: **ticket done + doc updated**. That pattern is a small version of “definition of done” automation used in larger platforms.

---

## File reference

| Path | Role |
|------|------|
| `backend/src/integrations/confluence/confluenceClient.ts` | All Confluence REST calls + `createConfluenceClientFromEnv` |
| `backend/scripts/hello-world-confluence-and-jira-done.ts` | End-to-end: space resolve → page find/create/update → Jira transition |
