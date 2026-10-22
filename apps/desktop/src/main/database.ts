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
 * Resiliently supports better-sqlite3 or graceful fallback.
 */
export async function initializeDatabase(): Promise<ISqliteConnection | null> {
  try {
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
    } catch (errBetter: any) {
      console.warn('better-sqlite3 driver unavailable, attempting fallback:', errBetter?.message);
      try {
        // Fallback to runtime native node:sqlite if available in Node environment
        const nodeSqlite = await import('node:sqlite');
        if (nodeSqlite && (nodeSqlite as any).DatabaseSync) {
          rawDb = new (nodeSqlite as any).DatabaseSync(dbPath);
        }
      } catch {
        console.warn('Native SQLite driver not required; CourseNest client uses sandboxed IndexedDB.');
      }
    }

    if (rawDb) {
      dbConnection = createSqliteConnection(rawDb);
      initializeSqliteDatabase(dbConnection);
    }

    return dbConnection;
  } catch (err: any) {
    console.warn('Database initialization non-fatal warning:', err?.message);
    return null;
  }
}
