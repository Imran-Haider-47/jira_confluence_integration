/**
 * Creates tables (if TYPEORM_SYNC=true) and inserts sample rows for local development.
 * Run: npm run db:seed
 * Requires USE_POSTGRES=true and DATABASE_URL in .env
 */
import 'reflect-metadata';
import 'dotenv/config';
import { ConfluencePage } from '../src/models/ConfluencePage.entity.js';
import { JiraIssueRow } from '../src/models/JiraIssueRow.entity.js';
import { Project } from '../src/models/Project.entity.js';
import { loadEnv } from '../src/config/env.js';
import { closeDatabase, initDatabase } from '../src/persistence/data-source.js';

async function main() {
  const env = loadEnv();
  if (!env.USE_POSTGRES || !env.DATABASE_URL) {
    process.stderr.write('Set USE_POSTGRES=true and DATABASE_URL in .env before seeding.\n');
    process.exit(1);
  }

  const ds = await initDatabase(env.DATABASE_URL);

  const projectRepo = ds.getRepository(Project);
  const issueRepo = ds.getRepository(JiraIssueRow);
  const pageRepo = ds.getRepository(ConfluencePage);

  let project = await projectRepo.findOne({ where: { key: 'DEMO' } });
  if (!project) {
    project = projectRepo.create({
      key: 'DEMO',
      name: 'Demo Project (sample data)',
    });
    await projectRepo.save(project);
    process.stdout.write('Inserted project DEMO\n');
  } else {
    process.stdout.write('Project DEMO already exists\n');
  }

  let issue = await issueRepo.findOne({ where: { issueKey: 'DEMO-1' } });
  if (!issue) {
    issue = issueRepo.create({
      issueKey: 'DEMO-1',
      title: 'Add login button UI',
      status: 'In Progress',
      projectKey: 'DEMO',
    });
    await issueRepo.save(issue);
    process.stdout.write('Inserted jira_issues DEMO-1\n');
  } else {
    process.stdout.write('Issue DEMO-1 already exists\n');
  }

  const pageTitle = 'Feature DEMO-1 Documentation';
  let page = await pageRepo.findOne({ where: { title: pageTitle } });
  if (!page) {
    page = pageRepo.create({
      title: pageTitle,
      spaceKey: 'Integration_Project',
      bodyHtml: '<p>Documentation for <strong>DEMO-1</strong>: add login button UI.</p>',
      relatedIssueKey: 'DEMO-1',
    });
    await pageRepo.save(page);
    process.stdout.write('Inserted confluence page\n');
  } else {
    process.stdout.write('Confluence sample page already exists\n');
  }

  await closeDatabase();
  process.stdout.write('Seed finished.\n');
}

main().catch(async (err) => {
  process.stderr.write(err instanceof Error ? err.message : String(err));
  process.stderr.write('\n');
  try {
    await closeDatabase();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
