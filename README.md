# Jira Confluencer Synchronizer

Keeps Confluence pages in sync with Jira by handling Jira webhooks and updating Confluence via REST APIs.

- Architecture: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- Backend setup and libraries: [backend/DEPENDENCIES.md](./backend/DEPENDENCIES.md)
- Learning notes: [learning/nodejs-basics.md](./learning/nodejs-basics.md) · [learning/jira-integration.md](./learning/jira-integration.md) · [learning/confluence-integration.md](./learning/confluence-integration.md)

Quick start (backend):

    cd backend
    npm install
    cp .env.example .env
    # Edit .env. With USE_POSTGRES=true, seed sample data once:
    npm run db:seed
    npm run dev

Then open GET http://localhost:3000/health

API docs (Swagger UI): http://localhost:3000/api-docs
