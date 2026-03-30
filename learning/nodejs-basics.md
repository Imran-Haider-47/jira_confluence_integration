# Step 1 — Node.js basics, Express, and REST APIs

This file is part of our **iterative** build of the DevOps Automation & Project Intelligence Platform.  
We use **GitHub + Jira + Confluence** first; queues and AWS come in later steps.

---

## What is Node.js? (simple)

Node.js lets you run **JavaScript on the server** (on your machine or in the cloud), not only in the browser. It is built on Chrome’s V8 engine.

- You get **file access**, **network servers**, **environment variables**, and **calling databases** — things a browser is not allowed to do the same way.
- Your **backend** process starts once and keeps running, listening for HTTP requests (or other work).

### Real-world analogy

Think of a **restaurant kitchen**. The browser is the dining room (where customers sit). **Node.js** is the kitchen: it receives orders (requests), prepares food (runs your code), and sends plates back (responses). The kitchen runs continuously during service.

### How we use it in THIS project

The backend lives in **`backend/`**. The entry file **`backend/src/index.ts`** starts the program: it loads configuration, optionally connects to PostgreSQL (later steps rely on this more), builds the HTTP app, and **listens on a port** (default `3000`). Every future feature (Jira sync, GitHub webhooks, queues) will plug into this same Node process or related workers.

---

## What is Express? (simple)

**Express** is a small **web framework** for Node.js. It helps you:

- Create an **HTTP server**
- Register **routes** (e.g. “when someone GETs `/health`, run this function”)
- Use **middleware** (logging, JSON body parsing, security headers)

Without Express you could use Node’s built-in `http` module, but you would write more boilerplate. Express is the most common choice for learning and for APIs.

### Real-world analogy

Express is like **labeled lanes at the post office**: “Lane A = health checks”, “Lane B = webhooks”. Each lane has a clear rule for what happens when a request arrives.

### How we use it in THIS project

In **`backend/src/http/app.ts`**, we call `express()` to create the app, then attach middleware and routers:

- **`helmet`**, **`cors`**, **`express.json()`** — safety and parsing JSON bodies (needed later for webhooks).
- **`pino-http`** — logs each request (useful when debugging GitHub or Jira traffic).

The **health route** is mounted from **`backend/src/http/routes/health.ts`**.

---

## What is a REST API? (simple)

**REST** (Representational State Transfer) is a **style** of building HTTP APIs, not a single library.

- Clients (browser, GitHub, Jira, mobile apps) send **HTTP requests** with a **method** and a **path**.
- Common methods: **GET** (read), **POST** (create / trigger), **PUT/PATCH** (update), **DELETE** (remove).
- The server responds with a **status code** (200 success, 400 bad input, 500 server error) and often **JSON** data.

“REST API” in interviews usually means: **JSON over HTTP**, resources, clear URLs.

### Real-world analogy

REST is like **ordering by menu number**: “GET item #12” (read info) vs “POST order #12” (create something). The **URL path** and **method** together describe the action.

### How we use it in THIS project

Step 1 establishes our first **read** endpoint:

| Method | Path | Purpose |
|--------|------|--------|
| GET | `/health` | Is the server alive? Returns JSON like `{ "status": "ok" }`. |

Later steps will add **POST** endpoints (e.g. `/webhook/github`) and **GET** endpoints that read from the database. All of those follow the same REST idea: **HTTP + JSON**.

---

## Where to look in the repo (Step 1)

1. **`backend/src/index.ts`** — starts Node, loads env, optional DB, calls `createApp()`, `listen(PORT)`.
2. **`backend/src/http/app.ts`** — creates the Express app and wires routers.
3. **`backend/src/http/routes/health.ts`** — defines **GET `/health`**.

### Try it locally

```bash
cd backend
npm install
npm run dev
```

Then open or run:

```bash
curl http://localhost:3000/health
```

Swagger UI (try the same APIs in the browser): open http://localhost:3000/api-docs  
The OpenAPI description is maintained in `backend/src/http/openapi.ts` — add new paths there when you add routes.

Expected: `{"status":"ok"}` (maybe with pretty printing depending on your tool).

Note: you may see a log line about `DATABASE_URL` — that is normal. Step 1 works even if Postgres is not set up yet.

---

## TypeScript vs JavaScript (one minute)

This repo uses **TypeScript** (`.ts` files): JavaScript **plus static types** so the editor and compiler catch mistakes early. For learning, treat it as “JavaScript with annotations.” Express works the same way; we compile or run with `tsx` during development.

---

## Step 1 checklist

- [x] Node runs an HTTP server.
- [x] Express handles routing and middleware.
- [x] **GET `/health`** returns JSON (`status: ok`).

---

## STOP — Step 1 complete

Do **not** move to Step 2 (controllers/services refactor) until you confirm you are ready.

Next step (when you say go): **Step 2 — Project structure (routes, controllers, services)** and the file **`learning/project-structure.md`**.
