# Backend libraries — what each one does

Install everything with:

    cd backend
    npm install

Below matches `package.json`. Use this file to learn what each dependency is for and what to say in an interview.

---

Runtime dependencies (`dependencies`)

express  
Lightweight HTTP server for Node.js. You define routes (GET, POST, …), middleware (auth, logging), and handlers. Very common in industry and easy to demo in interviews (“Express route → service → database / external API”).

zod  
Schema library: you describe the shape of data (environment variables, JSON bodies, query params) and get type-safe parsing plus clear error messages. Used here so invalid config fails at startup and bad webhook payloads return 400 with detail. Interview line: “runtime validation at boundaries.” 

pg (node-postgres)  
PostgreSQL driver. Required by TypeORM for the `postgres` driver; you normally go through TypeORM’s `DataSource`, not `pg` directly.

typeorm  
ORM for PostgreSQL: entities (decorators), repositories, migrations, connection pooling. Maps TypeScript classes like `User` to tables and keeps queries typed. Interview line: “entities define the schema; repositories encapsulate data access.”

reflect-metadata  
Small runtime library TypeORM needs so decorator metadata (column types, relations) works with `emitDecoratorMetadata` in `tsconfig.json`. Must load `import 'reflect-metadata'` before any entity import at process entry (`src/index.ts`).

dotenv  
Loads variables from a `.env` file into `process.env` when you run locally. Production often uses real env vars instead; dotenv is for developer machines only (call it once at process start).

pino  
Fast, structured JSON logger. Logs are machine-readable (timestamps, levels) and work well with log aggregators. Interview line: “structured logging instead of console.log in production code.”

pino-http  
Middleware that logs each HTTP request (method, path, status, duration) using pino. Helps debug webhooks and API traffic.

helmet  
Sets sensible HTTP security headers (e.g. hides X-Powered-By, helps with XSS/CSP basics). Small win for any public-facing API.

cors  
Controls which browser origins may call your API. Needed when a separate React admin UI talks to this backend from another port or domain. For Jira→server webhooks, Jira is server-side and does not use CORS; you still keep cors for your future frontend.

swagger-ui-express  
Serves the Swagger UI static app at a route (here `/api-docs`). It reads an OpenAPI JSON object (`src/http/openapi.ts`) so you can try GET endpoints from the browser. Interview line: “we document the contract with OpenAPI and keep it in sync with the implementation.”

---

Development-only (`devDependencies`)

typescript  
Adds static types and compiles `.ts` to `.js`. Catches mistakes before runtime and makes refactors safer.

@types/node  
TypeScript definitions for Node built-ins (`process`, `http`, etc.).

@types/express  
TypeScript definitions for Express (Request, Response, Router, etc.).

@types/pg  
TypeScript definitions for the `pg` package (Pool, Client, query result types).

tsx  
Runs TypeScript directly in development (`tsx watch src/index.ts`) without a separate `tsc` step every time. Production build still uses `tsc` + `node dist/...` if you want.

---

Built into Node.js (no install)

crypto  
Create HMAC signatures, compare webhook secrets safely (timing-safe compare when you implement Jira webhook verification).

---

What is not in this list (on purpose for the first version)

- JWT library (e.g. `jsonwebtoken` or `jose`): add when you implement sign/verify.
- Password hashing (`bcrypt` or `argon2`): add before persisting real users.
- Jest / Vitest: add when you write tests.
- axios / node-fetch: optional; Node 18+ has global `fetch` for calling Jira and Confluence REST APIs.
