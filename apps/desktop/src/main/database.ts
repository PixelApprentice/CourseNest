import { app } from 'electron';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import {
  createSqliteConnection,
  initializeSqliteDatabase,
  type ISqliteConnection,
} from '@coursenest/sqlite-adapter';

let dbConnection: ISqliteConnection | null = null;

export interface DetailedProgressRecord {
  courseId: string;
  lessonId: string;
  blockId?: string;
  completed?: boolean;
  timeSpentSeconds?: number;
  videoPositionSeconds?: number;
  videoDurationSeconds?: number;
  readingPage?: number;
  readingTotalPages?: number;
  lastAccessedAt?: string;
  completedAt?: string;
}

export interface VolumeRegistryRecord {
  uuid: string;
  label: string;
  lastMountPath: string;
  lastSeenAt: string;
  registeredCourseIds: string[];
}

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
 * Persists detailed lesson/video/reading progress into local SQLite database.
 */
export function saveDetailedProgressDb(record: DetailedProgressRecord): boolean {
  try {
    if (!dbConnection) return false;

    const now = record.lastAccessedAt || new Date().toISOString();
    const completedInt = record.completed ? 1 : 0;
    const completedAt = record.completed ? (record.completedAt || now) : null;

    dbConnection.prepare(`
      INSERT INTO learning_progress_records (
        course_id, lesson_id, block_id, completed, time_spent_seconds,
        video_position_seconds, video_duration_seconds, reading_page,
        reading_total_pages, last_accessed_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(course_id, lesson_id) DO UPDATE SET
        block_id = COALESCE(excluded.block_id, learning_progress_records.block_id),
        completed = CASE WHEN excluded.completed = 1 THEN 1 ELSE learning_progress_records.completed END,
        time_spent_seconds = learning_progress_records.time_spent_seconds + excluded.time_spent_seconds,
        video_position_seconds = CASE 
          WHEN excluded.video_position_seconds > 0 THEN excluded.video_position_seconds 
          ELSE learning_progress_records.video_position_seconds 
        END,
        video_duration_seconds = CASE 
          WHEN excluded.video_duration_seconds > 0 THEN excluded.video_duration_seconds 
          ELSE learning_progress_records.video_duration_seconds 
        END,
        reading_page = CASE 
          WHEN excluded.reading_page > 0 THEN excluded.reading_page 
          ELSE learning_progress_records.reading_page 
        END,
        reading_total_pages = CASE 
          WHEN excluded.reading_total_pages > 0 THEN excluded.reading_total_pages 
          ELSE learning_progress_records.reading_total_pages 
        END,
        last_accessed_at = excluded.last_accessed_at,
        completed_at = COALESCE(excluded.completed_at, learning_progress_records.completed_at)
    `).run(
      record.courseId,
      record.lessonId,
      record.blockId || null,
      completedInt,
      record.timeSpentSeconds || 0,
      record.videoPositionSeconds || 0,
      record.videoDurationSeconds || 0,
      record.readingPage || 1,
      record.readingTotalPages || 1,
      now,
      completedAt,
    );

    return true;
  } catch (err: any) {
    console.warn('saveDetailedProgressDb warning:', err?.message);
    return false;
  }
}

/**
 * Retrieves detailed lesson progress from SQLite database.
 */
export function getDetailedProgressDb(courseId: string, lessonId?: string): DetailedProgressRecord | Record<string, DetailedProgressRecord> | null {
  try {
    if (!dbConnection) return null;

    if (lessonId) {
      const row = dbConnection.prepare(`
        SELECT * FROM learning_progress_records
        WHERE course_id = ? AND lesson_id = ?
      `).get(courseId, lessonId) as any;

      if (!row) return null;

      return {
        courseId: row.course_id,
        lessonId: row.lesson_id,
        blockId: row.block_id || undefined,
        completed: Boolean(row.completed),
        timeSpentSeconds: row.time_spent_seconds || 0,
        videoPositionSeconds: row.video_position_seconds || 0,
        videoDurationSeconds: row.video_duration_seconds || 0,
        readingPage: row.reading_page || 1,
        readingTotalPages: row.reading_total_pages || 1,
        lastAccessedAt: row.last_accessed_at,
        completedAt: row.completed_at || undefined,
      };
    } else {
      const rows = dbConnection.prepare(`
        SELECT * FROM learning_progress_records
        WHERE course_id = ?
      `).all(courseId) as any[];

      const map: Record<string, DetailedProgressRecord> = {};
      for (const row of rows) {
        map[row.lesson_id] = {
          courseId: row.course_id,
          lessonId: row.lesson_id,
          blockId: row.block_id || undefined,
          completed: Boolean(row.completed),
          timeSpentSeconds: row.time_spent_seconds || 0,
          videoPositionSeconds: row.video_position_seconds || 0,
          videoDurationSeconds: row.video_duration_seconds || 0,
          readingPage: row.reading_page || 1,
          readingTotalPages: row.reading_total_pages || 1,
          lastAccessedAt: row.last_accessed_at,
          completedAt: row.completed_at || undefined,
        };
      }
      return map;
    }
  } catch (err: any) {
    console.warn('getDetailedProgressDb warning:', err?.message);
    return null;
  }
}

/**
 * Upsert volume metadata into SQLite volume registry
 */
export function saveVolumeRegistryDb(vol: VolumeRegistryRecord): boolean {
  try {
    if (!dbConnection) return false;
    dbConnection.prepare(`
      INSERT INTO volume_registry (uuid, label, last_mount_path, last_seen_at, registered_course_ids)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(uuid) DO UPDATE SET
        label = excluded.label,
        last_mount_path = excluded.last_mount_path,
        last_seen_at = excluded.last_seen_at,
        registered_course_ids = excluded.registered_course_ids
    `).run(
      vol.uuid,
      vol.label,
      vol.lastMountPath,
      vol.lastSeenAt,
      JSON.stringify(vol.registeredCourseIds || []),
    );
    return true;
  } catch (err: any) {
    console.warn('saveVolumeRegistryDb warning:', err?.message);
    return false;
  }
}

/**
 * Fetch all registered volumes from SQLite
 */
export function getVolumeRegistryDb(): VolumeRegistryRecord[] {
  try {
    if (!dbConnection) return [];
    const rows = dbConnection.prepare(`SELECT * FROM volume_registry`).all() as any[];
    return rows.map((r) => ({
      uuid: r.uuid,
      label: r.label,
      lastMountPath: r.last_mount_path,
      lastSeenAt: r.last_seen_at,
      registeredCourseIds: JSON.parse(r.registered_course_ids || '[]'),
    }));
  } catch (err: any) {
    console.warn('getVolumeRegistryDb warning:', err?.message);
    return [];
  }
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

      // Setup detailed decoupled progress table
      dbConnection.exec(`
        CREATE TABLE IF NOT EXISTS learning_progress_records (
          course_id TEXT NOT NULL,
          lesson_id TEXT NOT NULL,
          block_id TEXT,
          completed INTEGER NOT NULL DEFAULT 0,
          time_spent_seconds INTEGER NOT NULL DEFAULT 0,
          video_position_seconds REAL DEFAULT 0,
          video_duration_seconds REAL DEFAULT 0,
          reading_page INTEGER DEFAULT 1,
          reading_total_pages INTEGER DEFAULT 1,
          last_accessed_at TEXT NOT NULL,
          completed_at TEXT,
          PRIMARY KEY (course_id, lesson_id)
        );
        CREATE INDEX IF NOT EXISTS ix_learning_progress_course ON learning_progress_records(course_id);

        CREATE TABLE IF NOT EXISTS volume_registry (
          uuid TEXT PRIMARY KEY,
          label TEXT,
          last_mount_path TEXT,
          last_seen_at TEXT,
          registered_course_ids TEXT DEFAULT '[]'
        );

        CREATE TABLE IF NOT EXISTS encrypted_course_passwords (
          course_id TEXT PRIMARY KEY,
          encrypted_password_base64 TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
    }

    return dbConnection;
  } catch (err: any) {
    console.warn('Database initialization non-fatal warning:', err?.message);
    return null;
  }
}

/**
 * Save an encrypted course password (ciphertext) into SQLite database.
 */
export function saveEncryptedCoursePassword(courseId: string, encryptedBase64: string): boolean {
  try {
    if (!dbConnection) return false;
    const now = new Date().toISOString();
    dbConnection.prepare(`
      INSERT INTO encrypted_course_passwords (course_id, encrypted_password_base64, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(course_id) DO UPDATE SET
        encrypted_password_base64 = excluded.encrypted_password_base64,
        updated_at = excluded.updated_at
    `).run(courseId, encryptedBase64, now);
    return true;
  } catch (err: any) {
    console.warn('saveEncryptedCoursePassword warning:', err?.message);
    return false;
  }
}

/**
 * Retrieve an encrypted course password (ciphertext) from SQLite database.
 */
export function getEncryptedCoursePassword(courseId: string): string | null {
  try {
    if (!dbConnection) return null;
    const row = dbConnection.prepare(`
      SELECT encrypted_password_base64 FROM encrypted_course_passwords WHERE course_id = ?
    `).get(courseId) as { encrypted_password_base64: string } | undefined;
    return row?.encrypted_password_base64 || null;
  } catch (err: any) {
    console.warn('getEncryptedCoursePassword warning:', err?.message);
    return null;
  }
}
