/**
 * IndexedDB Media Vault for CourseNest Client
 * Safely stores large binary course assets (videos, PDFs, slides, audio)
 * offline on the user's device without hitting localStorage 5MB quota limits.
 */

const DB_NAME = 'coursenest_media_vault_v1';
const DB_VERSION = 1;
const STORE_NAME = 'media_files';

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
 * Store a binary asset for a course
 */
export async function saveMediaFile(
  courseId: string,
  filePath: string,
  blob: Blob,
  mimeType: string = 'application/octet-stream',
): Promise<void> {
  const db = await getDb();
  const normalizedPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
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
 * Retrieve a binary asset from the media vault
 */
export async function getMediaFile(
  courseId: string,
  filePath: string,
): Promise<{ blob: Blob; mimeType: string } | null> {
  const db = await getDb();
  const normalizedPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
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

// In-memory cache for generated object URLs so we don't leak or duplicate
const objectUrlCache = new Map<string, string>();

/**
 * Get a playable/viewable object URL for a vault media asset
 */
export async function getMediaBlobUrl(courseId: string, filePath: string): Promise<string | null> {
  const normalizedPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const key = `${courseId}::${normalizedPath}`;

  if (objectUrlCache.has(key)) {
    return objectUrlCache.get(key)!;
  }

  const file = await getMediaFile(courseId, normalizedPath);
  if (!file) return null;

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
