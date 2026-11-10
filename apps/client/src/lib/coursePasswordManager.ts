/**
 * CourseNest Unified Course Password Manager (Browser Client)
 *
 * Guarantees:
 * 1. Single source of truth for all course password lookups.
 * 2. Keyed strictly by COURSE (not archive file or part).
 * 3. Concurrent requests for the same course share ONE in-flight Promise so that
 *    even 75 simultaneous part reads trigger exactly ONE password prompt dialog.
 * 4. In-memory session caching by default; optional OS-level safeStorage encryption.
 * 5. Zero plaintext logging or browser localStorage storage.
 */

export interface PasswordPromptContext {
  courseId: string;
  partName?: string;
  attemptCount: number;
  errorMessage?: string;
}

export type PasswordPromptResult =
  | { password: string; rememberForCourse?: boolean }
  | string
  | null;

export interface SafeStorageProvider {
  getCoursePassword: (courseId: string) => Promise<string | null>;
  saveCoursePassword: (courseId: string, password: string) => Promise<void>;
}

export class CoursePasswordManager {
  private sessionPasswords = new Map<string, string>();
  private pendingRequests = new Map<string, Promise<string | null>>();
  private aliasMap = new Map<string, string>();
  private safeStorageProvider?: SafeStorageProvider;

  constructor(safeStorageProvider?: SafeStorageProvider) {
    this.safeStorageProvider = safeStorageProvider;
  }

  public setSafeStorageProvider(provider: SafeStorageProvider): void {
    this.safeStorageProvider = provider;
  }

  private resolveKey(courseId: string): string {
    return this.aliasMap.get(courseId) || courseId;
  }

  /**
   * Alias a temporary import session identifier to the final courseId
   * so passwords obtained during multi-part upload persist into the created course.
   */
  public aliasCourse(fromId: string, toId: string): void {
    this.aliasMap.set(toId, fromId);
    this.aliasMap.set(fromId, toId);
    const existing = this.sessionPasswords.get(fromId) || this.sessionPasswords.get(toId);
    if (existing) {
      this.sessionPasswords.set(fromId, existing);
      this.sessionPasswords.set(toId, existing);
    }
  }

  public getSessionPassword(courseId: string): string | null {
    const key = this.resolveKey(courseId);
    return this.sessionPasswords.get(key) || null;
  }

  public setSessionPassword(courseId: string, password: string): void {
    const key = this.resolveKey(courseId);
    const clean = password?.trim();
    if (clean) {
      this.sessionPasswords.set(key, clean);
      const alias = this.aliasMap.get(key);
      if (alias) {
        this.sessionPasswords.set(alias, clean);
      }
    }
  }

  public clearSessionPassword(courseId: string): void {
    const key = this.resolveKey(courseId);
    this.sessionPasswords.delete(key);
    this.pendingRequests.delete(key);
    const alias = this.aliasMap.get(key);
    if (alias) {
      this.sessionPasswords.delete(alias);
      this.pendingRequests.delete(alias);
    }
  }

  /**
   * Primary unified entry point for obtaining the course password.
   * If 75 calls arrive concurrently, they all attach to ONE pending promise.
   * Prompts the user exactly ONCE per course unless a specific part fails.
   */
  public async getCoursePassword(
    courseId: string,
    options?: {
      partName?: string;
      promptFn?: (context: PasswordPromptContext) => Promise<PasswordPromptResult>;
      forceReprompt?: boolean;
      errorMessage?: string;
    }
  ): Promise<string | null> {
    const key = this.resolveKey(courseId);

    // 1. If not forcing a re-prompt, check memory cache
    if (!options?.forceReprompt) {
      const cached = this.sessionPasswords.get(key);
      if (cached) return cached;

      // 2. Check safeStorage (OS-level encrypted)
      if (this.safeStorageProvider) {
        try {
          const stored = await this.safeStorageProvider.getCoursePassword(key);
          if (stored && typeof stored === 'string' && stored.trim()) {
            const clean = stored.trim();
            this.sessionPasswords.set(key, clean);
            return clean;
          }
        } catch {
          // Ignore safeStorage read errors
        }
      }
    }

    // 3. Concurrency deduplication: if there is already an in-flight prompt for this course, reuse that single Promise!
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // 4. If no promptFn provided, cannot interactively prompt
    if (!options?.promptFn) {
      return null;
    }

    // 5. Create the shared pending prompt promise
    const promptPromise = (async () => {
      try {
        const result = await options.promptFn!({
          courseId: key,
          partName: options?.partName,
          attemptCount: 1,
          errorMessage: options?.errorMessage,
        });

        if (!result) return null;

        const password = typeof result === 'object' ? result.password?.trim() : result?.trim();
        const remember = typeof result === 'object' ? !!result.rememberForCourse : false;

        if (!password) return null;

        // Cache in memory for this session
        this.sessionPasswords.set(key, password);
        const alias = this.aliasMap.get(key);
        if (alias) {
          this.sessionPasswords.set(alias, password);
        }

        // Optional OS-level safeStorage persistence
        if (remember && this.safeStorageProvider) {
          try {
            await this.safeStorageProvider.saveCoursePassword(key, password);
          } catch {
            // Ignore safeStorage write failures
          }
        }

        return password;
      } finally {
        this.pendingRequests.delete(key);
      }
    })();

    this.pendingRequests.set(key, promptPromise);
    return promptPromise;
  }
}

// Global shared singleton instance
export const coursePasswordManager = new CoursePasswordManager();
