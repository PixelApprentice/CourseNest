/**
 * IndexedDB Media Vault for CourseNest Client
 * Safely stores large binary course assets (videos, PDFs, slides, audio)
 * offline on the user's device without hitting localStorage 5MB quota limits.
 */

const DB_NAME = 'coursenest_media_vault_v1';
const DB_VERSION = 2;
const STORE_NAME = 'media_files';
const META_STORE_NAME = 'meta_courses';
const PROGRESS_STORE_NAME = 'meta_progress';

export interface StoredMediaFile {
  key: string; // `${courseId}::${filePath}`
  courseId: string;
  filePath: string;
  mimeType: string;
  blob: Blob;
  sizeBytes: number;
  createdAt: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported in this environment.'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('courseId', 'courseId', { unique: false });
      }
      if (!db.objectStoreNames.contains(META_STORE_NAME)) {
        db.createObjectStore(META_STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PROGRESS_STORE_NAME)) {
        db.createObjectStore(PROGRESS_STORE_NAME, { keyPath: 'courseId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

/**
 * Store a binary asset for a course (writes to physical SSD / external drive in Electron;
 * falls back to sandboxed IndexedDB only in pure web browser environments without native filesystem access).
 */
export async function saveMediaFile(
  courseId: string,
  filePath: string,
  blob: Blob,
  mimeType: string = 'application/octet-stream',
  targetStorage: 'internal' | 'external' = 'internal',
  externalMountPath?: string,
): Promise<void> {
  const normalizedPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const electron = (window as any).electron || (window as any).__ELECTRON__;

  // 1. In Electron desktop runtime: write directly to physical drive (SSD or External USB/HDD)!
  // This avoids storing multi-gigabyte (2GB - 10GB+) media files in browser IndexedDB.
  if (electron?.storage?.writeMediaFile) {
    try {
      const buffer = await blob.arrayBuffer();
      const res = await electron.storage.writeMediaFile({
        courseId,
        filePath: normalizedPath,
        buffer,
        targetDir: targetStorage === 'external' ? externalMountPath : undefined,
        storageTier: targetStorage,
      });

      if (res?.success) {
        // Physical file successfully stored on SSD or external disk!
        // Do NOT duplicate large video/audio/doc binaries in IndexedDB.
        return;
      }
      console.warn('Physical disk write returned false, falling back to IndexedDB');
    } catch (diskErr) {
      console.warn('Physical disk write failed, falling back to sandboxed IndexedDB:', diskErr);
    }
  }

  // 2. Sandboxed Web Browser Fallback (e.g. pure web browser without desktop bridge)
  const db = await getDb();
  const key = `${courseId}::${normalizedPath}`;

  const entry: StoredMediaFile = {
    key,
    courseId,
    filePath: normalizedPath,
    mimeType,
    blob,
    sizeBytes: blob.size,
    createdAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(entry);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieve a binary asset from physical external disk or IndexedDB media vault
 */
export async function getMediaFile(
  courseId: string,
  filePath: string,
  externalMountPath?: string,
): Promise<{ blob: Blob; mimeType: string } | null> {
  const normalizedPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');

  // 1. Try reading directly from external physical disk if running in Electron
  const electron = (window as any).electron || (window as any).__ELECTRON__;
  if (electron?.storage?.readMediaFile) {
    try {
      const res = await electron.storage.readMediaFile({
        courseId,
        filePath: normalizedPath,
        targetDir: externalMountPath,
      });
      if (res?.exists && res.buffer) {
        // Infer MIME type from file extension
        let mime = 'application/octet-stream';
        const lower = normalizedPath.toLowerCase();
        if (lower.endsWith('.mp4')) mime = 'video/mp4';
        else if (lower.endsWith('.webm')) mime = 'video/webm';
        else if (lower.endsWith('.mkv')) mime = 'video/x-matroska';
        else if (lower.endsWith('.mp3')) mime = 'audio/mpeg';
        else if (lower.endsWith('.pdf')) mime = 'application/pdf';
        else if (lower.endsWith('.vtt')) mime = 'text/vtt';
        else if (lower.endsWith('.srt')) mime = 'text/plain';

        return {
          blob: new Blob([res.buffer], { type: mime }),
          mimeType: mime,
        };
      }
    } catch {}
  }

  // 2. Query sandboxed IndexedDB
  const db = await getDb();
  const key = `${courseId}::${normalizedPath}`;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);

    req.onsuccess = () => {
      const result: StoredMediaFile | undefined = req.result;
      if (!result) {
        resolve(null);
      } else {
        resolve({ blob: result.blob, mimeType: result.mimeType });
      }
    };
    req.onerror = () => reject(req.error);
  });
}

// Bounded in-memory LRU cache for active object URLs.
// Enforces a strict limit (3 URLs) so large video/media blobs do not exhaust RAM
// on Linux systems with 16GB memory and 0 swap space.
const MAX_CACHED_BLOB_URLS = 3;
const objectUrlCache = new Map<string, string>();

/**
 * Revoke an existing cached object URL to immediately free RAM
 */
export function revokeMediaBlobUrl(courseId: string, filePath: string): void {
  const normalizedPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const key = `${courseId}::${normalizedPath}`;
  const existing = objectUrlCache.get(key);
  if (existing) {
    try {
      URL.revokeObjectURL(existing);
    } catch {}
    objectUrlCache.delete(key);
  }
}

/**
 * Revoke all active object URLs in memory
 */
export function revokeAllMediaBlobUrls(): void {
  for (const url of objectUrlCache.values()) {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }
  objectUrlCache.clear();
}

/**
 * Get a playable/viewable object URL for a vault media asset with strict LRU bounds
 */
export async function getMediaBlobUrl(
  courseId: string,
  filePath: string,
  externalMountPath?: string,
): Promise<string | null> {
  const normalizedPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const key = `${courseId}::${normalizedPath}`;

  if (objectUrlCache.has(key)) {
    const existing = objectUrlCache.get(key)!;
    // Re-insert to mark as most-recently-used in Map iteration order
    objectUrlCache.delete(key);
    objectUrlCache.set(key, existing);
    return existing;
  }

  const file = await getMediaFile(courseId, normalizedPath, externalMountPath);
  if (!file) return null;

  // Evict least recently used URL if cache limit is exceeded
  if (objectUrlCache.size >= MAX_CACHED_BLOB_URLS) {
    const oldestKey = objectUrlCache.keys().next().value;
    if (oldestKey) {
      const oldestUrl = objectUrlCache.get(oldestKey);
      if (oldestUrl) {
        try {
          URL.revokeObjectURL(oldestUrl);
        } catch {}
      }
      objectUrlCache.delete(oldestKey);
    }
  }

  const url = URL.createObjectURL(file.blob);
  objectUrlCache.set(key, url);
  return url;
}

/**
 * Delete all media files associated with a course
 */
export async function deleteMediaForCourse(courseId: string): Promise<void> {
  const db = await getDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('courseId');
    const req = index.openCursor(IDBKeyRange.only(courseId));

    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        // Revoke cached URL if present
        const item: StoredMediaFile = cursor.value;
        if (objectUrlCache.has(item.key)) {
          URL.revokeObjectURL(objectUrlCache.get(item.key)!);
          objectUrlCache.delete(item.key);
        }
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Clear all media files from the entire vault
 */
export async function clearAllMedia(): Promise<void> {
  // Revoke all cached URLs
  for (const url of objectUrlCache.values()) {
    URL.revokeObjectURL(url);
  }
  objectUrlCache.clear();

  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Compute total storage bytes used by media files
 */
export async function getMediaVaultUsage(): Promise<{ totalBytes: number; fileCount: number }> {
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();
      let totalBytes = 0;
      let fileCount = 0;

      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const item: StoredMediaFile = cursor.value;
          totalBytes += item.sizeBytes || 0;
          fileCount++;
          cursor.continue();
        } else {
          resolve({ totalBytes, fileCount });
        }
      };

      req.onerror = () => resolve({ totalBytes: 0, fileCount: 0 });
    });
  } catch {
    return { totalBytes: 0, fileCount: 0 };
  }
}

/**
 * Persist course metadata into the unlimited IndexedDB metadata vault
 */
export async function saveCourseMetadata(course: any): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE_NAME, 'readwrite');
    const store = tx.objectStore(META_STORE_NAME);
    const req = store.put(course);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieve all course metadata stored in IndexedDB
 */
export async function getAllCoursesMetadata(): Promise<any[]> {
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(META_STORE_NAME, 'readonly');
      const store = tx.objectStore(META_STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Delete a course metadata record and associated progress from IndexedDB
 */
export async function deleteCourseMetadata(courseId: string): Promise<void> {
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction([META_STORE_NAME, PROGRESS_STORE_NAME], 'readwrite');
      tx.objectStore(META_STORE_NAME).delete(courseId);
      tx.objectStore(PROGRESS_STORE_NAME).delete(courseId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}

/**
 * Save course progress record into IndexedDB
 */
export async function saveCourseProgressRecord(courseId: string, progress: any): Promise<void> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PROGRESS_STORE_NAME, 'readwrite');
      const store = tx.objectStore(PROGRESS_STORE_NAME);
      const req = store.put({ courseId, ...progress, updatedAt: new Date().toISOString() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {}
}

/**
 * Retrieve course progress record from IndexedDB
 */
export async function getCourseProgressRecord(courseId: string): Promise<any | null> {
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(PROGRESS_STORE_NAME, 'readonly');
      const store = tx.objectStore(PROGRESS_STORE_NAME);
      const req = store.get(courseId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}
