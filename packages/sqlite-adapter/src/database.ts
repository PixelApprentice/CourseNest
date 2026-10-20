import { SQLITE_PRAGMAS, SQLITE_SCHEMA } from './schema.js';

export interface ISqliteStatement {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
  get(...params: unknown[]): any;
  all(...params: unknown[]): any[];
}

export interface ISqliteConnection {
  prepare(sql: string): ISqliteStatement;
  exec(sql: string): void;
  transaction<T extends (...args: any[]) => any>(fn: T): T;
  close?(): void;
}

function normalizeParam(param: unknown): unknown {
  if (param === undefined) return null;
  if (param instanceof Date) return param.toISOString();
  if (typeof param === 'boolean') return param ? 1 : 0;
  return param;
}

function normalizeParams(params: unknown[]): unknown[] {
  return params.map(normalizeParam);
}

/**
 * Wraps either better-sqlite3 or node:sqlite DatabaseSync instance
 * into a standardized ISqliteConnection interface.
 */
export function createSqliteConnection(rawDb: any): ISqliteConnection {
  if (typeof rawDb.transaction === 'function') {
    return {
      prepare(sql: string) {
        const stmt = rawDb.prepare(sql);
        return {
          run(...params: unknown[]) {
            return stmt.run(...normalizeParams(params));
          },
          get(...params: unknown[]) {
            return stmt.get(...normalizeParams(params));
          },
          all(...params: unknown[]) {
            return stmt.all(...normalizeParams(params));
          }
        };
      },
      exec(sql: string) {
        rawDb.exec(sql);
      },
      transaction<T extends (...args: any[]) => any>(fn: T): T {
        return rawDb.transaction(fn);
      },
      close() {
        if (typeof rawDb.close === 'function') {
          rawDb.close();
        }
      }
    };
  }

  // Fallback for node:sqlite DatabaseSync or custom drivers without .transaction()
  return {
    prepare(sql: string) {
      const stmt = rawDb.prepare(sql);
      return {
        run(...params: unknown[]) {
          return stmt.run(...normalizeParams(params));
        },
        get(...params: unknown[]) {
          return stmt.get(...normalizeParams(params));
        },
        all(...params: unknown[]) {
          return stmt.all(...normalizeParams(params));
        }
      };
    },
    exec(sql: string) {
      rawDb.exec(sql);
    },
    transaction<T extends (...args: any[]) => any>(fn: T): T {
      return ((...args: any[]) => {
        rawDb.exec('BEGIN IMMEDIATE TRANSACTION;');
        try {
          const result = fn(...args);
          rawDb.exec('COMMIT;');
          return result;
        } catch (err) {
          rawDb.exec('ROLLBACK;');
          throw err;
        }
      }) as T;
    },
    close() {
      if (typeof rawDb.close === 'function') {
        rawDb.close();
      }
    }
  };
}

/**
 * Initialize database schemas, pragmas, and foreign keys.
 */
export function initializeSqliteDatabase(db: ISqliteConnection): void {
  // Execute pragmas and initial schema DDL
  db.exec(SQLITE_PRAGMAS);
  db.exec(SQLITE_SCHEMA);
}

