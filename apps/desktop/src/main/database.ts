import { app } from 'electron';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import Database from 'better-sqlite3';
import {
  createSqliteConnection,
  initializeSqliteDatabase,
  type ISqliteConnection,
} from '@coursenest/sqlite-adapter';

let dbConnection: ISqliteConnection | null = null;

/**
 * Returns the active SQLite connection instance.
 */
export function getDatabaseConnection(): ISqliteConnection {
  if (!dbConnection) {
    throw new Error('Database has not been initialized. Call initializeDatabase() first.');
  }
  return dbConnection;
}

/**
 * Initialize the local SQLite database, enable WAL mode, execute pragmas, and set up schema.
 * Uses better-sqlite3 with the standardized SQLite adapter.
 */
export async function initializeDatabase(): Promise<ISqliteConnection> {
  const dataDir = join(app.getPath('userData'), 'data');
  const resourcesDir = join(dataDir, 'resources');
  const tempDir = join(dataDir, 'temp');

  // Ensure data directories exist
  await mkdir(dataDir, { recursive: true });
  await mkdir(resourcesDir, { recursive: true });
  await mkdir(tempDir, { recursive: true });

  const dbPath = join(dataDir, 'coursenest.db');
  console.log(`Database path: ${dbPath}`);

  const rawDb = new Database(dbPath);
  dbConnection = createSqliteConnection(rawDb);
  initializeSqliteDatabase(dbConnection);

  return dbConnection;
}
