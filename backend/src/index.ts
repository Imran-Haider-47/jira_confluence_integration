import 'reflect-metadata';
import 'dotenv/config';
import { loadEnv } from './config/env.js';
import { createApp } from './http/app.js';
import { initDatabase } from './persistence/data-source.js';

async function main() {
  const env = loadEnv();

  if (env.DATABASE_URL) {
    await initDatabase(env.DATABASE_URL);
    process.stdout.write('PostgreSQL connected (TypeORM)\n');
  } else {
    process.stdout.write('DATABASE_URL not set — skipping DB (add it when Postgres is ready)\n');
  }

  const app = createApp();
  app.listen(env.PORT, () => {
    process.stdout.write(`Listening on http://localhost:${env.PORT}\n`);
  });
}

main().catch((err) => {
  process.stderr.write(err instanceof Error ? err.stack ?? err.message : String(err));
  process.stderr.write('\n');
  process.exit(1);
});
