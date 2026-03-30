import { DataSource } from 'typeorm';
import { ConfluencePage } from '../models/ConfluencePage.entity.js';
import { JiraIssueRow } from '../models/JiraIssueRow.entity.js';
import { Project } from '../models/Project.entity.js';
import { User } from '../models/User.entity.js';

function buildDataSource(url: string): DataSource {
  return new DataSource({
    type: 'postgres',
    url,
    entities: [User, Project, JiraIssueRow, ConfluencePage],
    migrations: [],
    // Set TYPEORM_SYNC=true in .env only on a throwaway local DB (auto-applies schema from entities).
    synchronize: process.env.TYPEORM_SYNC === 'true',
    logging: process.env.NODE_ENV === 'development',
  });
}

let instance: DataSource | null = null;

export function getAppDataSource(url: string): DataSource {
  if (!instance) {
    instance = buildDataSource(url);
  }
  return instance;
}

export async function initDatabase(url: string): Promise<DataSource> {
  const ds = getAppDataSource(url);
  if (!ds.isInitialized) {
    await ds.initialize();
  }
  return ds;
}

export async function closeDatabase(): Promise<void> {
  if (instance?.isInitialized) {
    await instance.destroy();
  }
  instance = null;
}
