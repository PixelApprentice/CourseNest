import { app } from 'electron';
import { join } from 'path';
import { mkdir } from 'fs/promises';
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
 * Resiliently supports either better-sqlite3 or native node:sqlite.
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

  let rawDb: any;
  try {
    // Attempt fast synchronous better-sqlite3 driver if available in Electron runtime
    const BetterSqlite3 = (await import('better-sqlite3')).default;
    rawDb = new BetterSqlite3(dbPath);
  } catch {
    // Fallback to runtime native node:sqlite (Node 22+ & modern Electron)
    const { DatabaseSync } = await import('node:sqlite');
    rawDb = new DatabaseSync(dbPath);
  }

  dbConnection = createSqliteConnection(rawDb);
  initializeSqliteDatabase(dbConnection);

  return dbConnection;
}
