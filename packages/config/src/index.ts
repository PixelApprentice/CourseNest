export const APP_NAME = 'CourseNest';
export const APP_VERSION = '2.0.0';

export const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mkv', '.avi', '.mov'] as const;
export const SUPPORTED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'] as const;
export const SUPPORTED_DOCUMENT_EXTENSIONS = ['.pdf', '.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.xls'] as const;
export const SUPPORTED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp'] as const;
export const SUPPORTED_TEXT_EXTENSIONS = ['.md', '.markdown', '.txt', '.html', '.htm', '.csv'] as const;
export const SUPPORTED_CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.c', '.cpp', '.cs', '.go', '.rs', '.rb', '.php', '.swift', '.kt'] as const;
export const SUPPORTED_ARCHIVE_EXTENSIONS = ['.zip', '.tar', '.gz', '.tar.gz', '.7z', '.7zip', '.rar'] as const;

export const ALL_SUPPORTED_EXTENSIONS = [
  ...SUPPORTED_VIDEO_EXTENSIONS,
  ...SUPPORTED_AUDIO_EXTENSIONS,
  ...SUPPORTED_DOCUMENT_EXTENSIONS,
  ...SUPPORTED_IMAGE_EXTENSIONS,
  ...SUPPORTED_TEXT_EXTENSIONS,
  ...SUPPORTED_CODE_EXTENSIONS,
  ...SUPPORTED_ARCHIVE_EXTENSIONS,
] as const;

export const IMPORT_LIMITS = {
  maxFileSizeBytes: 2_147_483_648,        // 2 GB
  maxArchiveSizeBytes: 10_737_418_240,    // 10 GB
  maxFileCount: 10_000,
  maxCompressionRatio: 100,
  maxPathDepth: 20,
  maxFilenameLength: 255,
} as const;

export const DB_CONFIG = {
  filename: 'coursenest.db',
  journalMode: 'WAL',
  foreignKeys: true,
} as const;

export interface AppConfig {
  appName: string;
  version: string;
  dataDir: string;
  resourcesDir: string;
  tempDir: string;
  databasePath: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  aiProvider?: AIProviderConfig;
}

export interface AIProviderConfig {
  provider: string;
  apiEndpoint: string;
  model: string;
  maxTokens: number;
  timeoutMs: number;
  maxRetries: number;
}
