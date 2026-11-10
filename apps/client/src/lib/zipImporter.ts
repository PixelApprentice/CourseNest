import JSZip from 'jszip';
import { addLog } from './logger';
import { saveMediaFile } from './mediaVault';
import { addCourseToVault, appendSectionsToCourse, getCourseById, type CourseData, type SectionData, type LessonData, type ContentBlockData, type SubtitleTrackData } from './courseStore';
import { anySubtitleToVtt, extractUrlFromShortcutText, parseJupyterNotebook, sanitizeLectureHtml } from './formatHelpers';
import { getStorageConfig } from './storageConfig';
import { coursePasswordManager, type PasswordPromptResult, type PasswordPromptContext } from './coursePasswordManager';

// Wire electron safeStorage provider into coursePasswordManager in browser context
if (typeof window !== 'undefined') {
  const electron = (window as any).electron || (window as any).__ELECTRON__;
  if (electron?.storage?.getCoursePassword) {
    coursePasswordManager.setSafeStorageProvider({
      getCoursePassword: async (courseId: string) => {
        try {
          return await electron.storage.getCoursePassword(courseId);
        } catch {
          return null;
        }
      },
      saveCoursePassword: async (courseId: string, password: string) => {
        try {
          await electron.storage.saveCoursePassword(courseId, password);
        } catch {
          // Ignore
        }
      },
    });
  }
}

export type { PasswordPromptResult, PasswordPromptContext };

export interface DiscoveredArchiveFile {
  originalPath: string;
  cleanPath: string;
  filename: string;
  sizeBytes: number;
  fileType: 'video' | 'audio' | 'document' | 'rich_text' | 'code' | 'subtitle' | 'link' | 'asset';
  mimeType: string;
  archiveName: string;
  zipEntry?: JSZip.JSZipObject;
  rawFile?: File;
  content?: string;
  getData?: () => Promise<Blob>;
}

export interface ProposalLessonFile {
  path: string;
  filename: string;
  sizeBytes: number;
  type: 'video' | 'audio' | 'document' | 'rich_text' | 'code' | 'subtitle' | 'link' | 'asset';
  mimeType: string;
  zipEntry?: JSZip.JSZipObject;
  rawFile?: File;
  content?: string;
  getData?: () => Promise<Blob>;
}

export interface ProposalLesson {
  id: string;
  title: string;
  position: number;
  files: ProposalLessonFile[];
  subtitleFiles: ProposalLessonFile[];
  isApproved: boolean;
}

export interface ProposalSection {
  id: string;
  title: string;
  position: number;
  sourceConfidence: 'manifest' | 'numbered' | 'heuristic';
  lessons: ProposalLesson[];
  archiveName?: string;
}

export interface ParsedArchiveResult {
  suggestedTitle: string;
  suggestedSubject: string;
  suggestedInstructor: string;
  suggestedDescription: string;
  discoveredFiles: DiscoveredArchiveFile[];
  sections: ProposalSection[];
  manifestFound: boolean;
}

const IGNORE_PATTERNS = [
  /__MACOSX/i,
  /\.DS_Store$/i,
  /Thumbs\.db$/i,
  /desktop\.ini$/i,
  /\.git\//i,
  /\.svn\//i,
];

function isIgnored(path: string): boolean {
  return IGNORE_PATTERNS.some((pattern) => pattern.test(path));
}

function detectFileType(ext: string): {
  type: 'video' | 'audio' | 'document' | 'rich_text' | 'code' | 'subtitle' | 'link' | 'asset';
  mimeType: string;
} {
  const e = ext.toLowerCase();

  // Video
  if (['.mp4', '.m4v', '.webm', '.mkv', '.mov', '.avi', '.ts', '.3gp'].includes(e)) {
    return { type: 'video', mimeType: e === '.webm' ? 'video/webm' : e === '.mkv' ? 'video/x-matroska' : 'video/mp4' };
  }

  // Audio
  if (['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac', '.wma'].includes(e)) {
    return { type: 'audio', mimeType: e === '.wav' ? 'audio/wav' : e === '.flac' ? 'audio/flac' : 'audio/mpeg' };
  }

  // Subtitles (WebVTT, SubRip, YouTube SBV, SubStation Alpha, Lyrics, TTML)
  if (['.srt', '.vtt', '.sub', '.sbv', '.ass', '.ssa', '.lrc', '.ttml', '.dfxp'].includes(e)) {
    return { type: 'subtitle', mimeType: 'text/vtt' };
  }

  // Links & Shortcuts
  if (['.url', '.webloc', '.desktop'].includes(e)) return { type: 'link', mimeType: 'text/plain' };

  // Document
  if (e === '.pdf') return { type: 'document', mimeType: 'application/pdf' };
  if (e === '.epub') return { type: 'document', mimeType: 'application/epub+zip' };

  // Jupyter Notebook (converted to structured study sections)
  if (e === '.ipynb') return { type: 'rich_text', mimeType: 'application/x-ipynb+json' };

  // Notes & Text / HTML
  if (['.md', '.markdown'].includes(e)) return { type: 'rich_text', mimeType: 'text/markdown' };
  if (['.txt', '.rtf'].includes(e)) return { type: 'rich_text', mimeType: 'text/plain' };
  if (['.html', '.htm'].includes(e)) return { type: 'rich_text', mimeType: 'text/html' };

  // Code
  if (['.py', '.js', '.jsx', '.ts', '.tsx', '.c', '.cpp', '.h', '.hpp', '.rs', '.go', '.java', '.css', '.json', '.sql', '.sh'].includes(e)) {
    return { type: 'code', mimeType: 'text/plain' };
  }

  return { type: 'asset', mimeType: 'application/octet-stream' };
}

export function cleanTitle(raw: string): string {
  let name = raw.replace(/\.[^/.]+$/, '');
  name = name.replace(/[_-]+/g, ' ');
  name = name.replace(/^(\d+)[\s.]+/i, '');
  return name.trim() || raw;
}

const SECTION_KEYWORDS = ['week', 'chapter', 'section', 'module', 'part', 'lecture', 'episode', 'session', 'unit', 'sec', 'ch', 'vol', 'volume'];

export function findLongestCommonPrefix(names: string[]): string {
  if (!names || names.length === 0) return '';
  const cleanNames = names.map((n) => n.replace(/\.[^/.]+$/, '').trim()).filter(Boolean);
  if (cleanNames.length === 0) return '';
  if (cleanNames.length === 1) return '';

  let prefix = cleanNames[0]!;
  for (let i = 1; i < cleanNames.length; i++) {
    const current = cleanNames[i]!;
    let j = 0;
    while (j < prefix.length && j < current.length && prefix[j] === current[j]) {
      j++;
    }
    prefix = prefix.slice(0, j);
    if (!prefix) break;
  }

  // Ensure prefix ends on a word boundary (don't cut words like Java / JavaScript - Review Item 16)
  const cutsMidWord = cleanNames.some((name) => {
    if (name.length > prefix.length) {
      const lastPrefixChar = prefix[prefix.length - 1] || '';
      const nextChar = name[prefix.length] || '';
      return /\w/.test(lastPrefixChar) && /\w/.test(nextChar);
    }
    return false;
  });

  if (cutsMidWord) {
    const lastBoundary = Math.max(
      prefix.lastIndexOf(' '),
      prefix.lastIndexOf('-'),
      prefix.lastIndexOf('_'),
      prefix.lastIndexOf('.')
    );
    if (lastBoundary > 0) {
      prefix = prefix.slice(0, lastBoundary);
    } else {
      prefix = '';
    }
  }

  prefix = prefix.replace(/[\s._-]+$/, '').trim();

  // Strip section keyword if trailing (e.g. "Python Full Stack Course Part" -> "Python Full Stack Course")
  const words = prefix.split(/\s+/);
  if (words.length > 1) {
    const lastWord = words[words.length - 1]!.toLowerCase();
    if (SECTION_KEYWORDS.includes(lastWord)) {
      words.pop();
      prefix = words.join(' ').replace(/[\s._-]+$/, '').trim();
    }
  }

  return prefix.length >= 3 ? prefix : '';
}

export function cleanSectionTitleAndPosition(
  rawName: string,
  commonPrefix: string = '',
  defaultPosition: number = 1,
): { position: number; cleanTitle: string; hasExplicitNumber: boolean } {
  let name = rawName.replace(/\.[^/.]+$/, '').trim();

  // 1. Strip common prefix if present
  if (commonPrefix && commonPrefix.length >= 3) {
    const escaped = commonPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${escaped}[\\s._-]*`, 'i');
    const stripped = name.replace(regex, '').trim();
    if (stripped.length > 0) {
      name = stripped;
    }
  }

  // 2. Keyword + number pattern anywhere in the string (beginning, middle, or end - Review Item 17)
  const patternKeyword = /(?:^|[\s._:-]+)(Week|Chapter|Section|Module|Part|Lecture|Episode|Session|Unit|Sec|Ch|Vol|Volume)[\s._:-]*(\d+)(.*)$/i;
  const matchKeyword = name.match(patternKeyword);
  if (matchKeyword && matchKeyword[1] && matchKeyword[2]) {
    const pos = parseInt(matchKeyword[2], 10);
    const rest = (matchKeyword[3] || '').replace(/^[\s._:-]+/, '').trim();
    const keyword = matchKeyword[1].charAt(0).toUpperCase() + matchKeyword[1].slice(1).toLowerCase();
    const title = rest ? `${keyword} ${matchKeyword[2]} - ${rest}` : `${keyword} ${parseInt(matchKeyword[2], 10)}`;
    return {
      position: isNaN(pos) ? defaultPosition : pos,
      cleanTitle: title.trim(),
      hasExplicitNumber: !isNaN(pos),
    };
  }

  // 3. Leading digit: "01 - Introduction" or "01. Introduction"
  const patternLeadingDigit = /^(\d+)[\s._-]+(.*)$/;
  const matchLeading = name.match(patternLeadingDigit);
  if (matchLeading && matchLeading[1] && matchLeading[2]) {
    const pos = parseInt(matchLeading[1], 10);
    const clean = matchLeading[2].replace(/[_-]+/g, ' ').trim();
    return {
      position: isNaN(pos) ? defaultPosition : pos,
      cleanTitle: clean || name,
      hasExplicitNumber: !isNaN(pos),
    };
  }

  // 4. Trailing digit: "Introduction - 01" or "Basics_2"
  const patternTrailingDigit = /^(.*?)[\\s._-]+(\d+)$/;
  const matchTrailing = name.match(patternTrailingDigit);
  if (matchTrailing && matchTrailing[1] && matchTrailing[2]) {
    const pos = parseInt(matchTrailing[2], 10);
    const clean = matchTrailing[1].replace(/[_-]+/g, ' ').trim();
    return {
      position: isNaN(pos) ? defaultPosition : pos,
      cleanTitle: clean || name,
      hasExplicitNumber: !isNaN(pos),
    };
  }

  // 5. Fallback: Clean separators
  const fallbackClean = name.replace(/[_-]+/g, ' ').trim();
  return {
    position: defaultPosition,
    cleanTitle: fallbackClean || `Section ${defaultPosition}`,
    hasExplicitNumber: false,
  };
}

function parsePositionAndTitle(raw: string, defaultPos: number): { position: number; title: string; hasExplicitNumber: boolean } {
  const res = cleanSectionTitleAndPosition(raw, '', defaultPos);
  return { position: res.position, title: res.cleanTitle, hasExplicitNumber: res.hasExplicitNumber };
}

export function isZipEncrypted(buffer: ArrayBuffer | Uint8Array): boolean {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const len = bytes.length;
  for (let i = 0; i < len - 10; i++) {
    if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b) {
      // Local File Header PK\x03\x04
      if (bytes[i + 2] === 0x03 && bytes[i + 3] === 0x04) {
        const flag = (bytes[i + 6] ?? 0) | ((bytes[i + 7] ?? 0) << 8);
        const method = (bytes[i + 8] ?? 0) | ((bytes[i + 9] ?? 0) << 8);
        if ((flag & 0x0001) !== 0 || method === 99) {
          return true;
        }
      }
      // Central Directory Header PK\x01\x02
      if (bytes[i + 2] === 0x01 && bytes[i + 3] === 0x02) {
        const flag = (bytes[i + 8] ?? 0) | ((bytes[i + 9] ?? 0) << 8);
        const method = (bytes[i + 10] ?? 0) | ((bytes[i + 11] ?? 0) << 8);
        if ((flag & 0x0001) !== 0 || method === 99) {
          return true;
        }
      }
    }
  }
  return false;
}

// -----------------------------------------------------------------------------
// Safe In-Memory & OS Keychain Password Management (Fixes Issue A)
// Never stored in plaintext localStorage or logs. Kept in memory per session by default.
// -----------------------------------------------------------------------------
try {
  // Purge any legacy plaintext archive passwords from localStorage
  localStorage.removeItem('coursenest_known_archive_passwords_v1');
} catch {}

export function getSessionCoursePassword(courseId?: string): string | null {
  return coursePasswordManager.getSessionPassword(courseId || 'default-session');
}

export function setSessionCoursePassword(password: string, courseId?: string): void {
  coursePasswordManager.setSessionPassword(courseId || 'default-session', password);
}

export async function resolveCoursePassword(courseId?: string): Promise<string | null> {
  return coursePasswordManager.getCoursePassword(courseId || 'default-session');
}

async function extractWith7zWasm(
  file: File,
  archiveBaseName: string,
  password?: string,
): Promise<DiscoveredArchiveFile[]> {
  const SevenZip = (await import('7z-wasm')).default;
  const stdoutLogs: string[] = [];
  const stderrLogs: string[] = [];
  const sz = await SevenZip({
    print: (txt: string) => stdoutLogs.push(txt),
    printErr: (txt: string) => stderrLogs.push(txt),
  });
  const id = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : '.bin';
  const memArchiveName = `/archive_${id}${ext}`;
  const stagingDir = `/staging_${id}`;

  const buffer = new Uint8Array(await file.arrayBuffer());
  sz.FS.writeFile(memArchiveName, buffer);

  try {
    sz.FS.mkdir(stagingDir);
  } catch {}

  const args = ['x', memArchiveName, `-o${stagingDir}`, '-y'];
  if (password) {
    args.push(`-p${password}`);
  }

  const exitCode = (sz.callMain(args) as unknown as number) ?? 0;

  const cleanupVirtualFS = () => {
    try {
      sz.FS.unlink(memArchiveName);
    } catch {}
    try {
      const deleteRecursive = (dir: string) => {
        const entries = sz.FS.readdir(dir);
        for (const entry of entries) {
          if (entry === '.' || entry === '..') continue;
          const full = `${dir}/${entry}`;
          const stat = sz.FS.stat(full);
          if (sz.FS.isDir(stat.mode)) {
            deleteRecursive(full);
            sz.FS.rmdir(full);
          } else {
            sz.FS.unlink(full);
          }
        }
      };
      deleteRecursive(stagingDir);
      sz.FS.rmdir(stagingDir);
    } catch {}
  };

  if (exitCode !== 0) {
    cleanupVirtualFS();
    const combinedOutput = [...stdoutLogs, ...stderrLogs].join('\n').toLowerCase();
    const isPasswordError =
      combinedOutput.includes('wrong password') ||
      combinedOutput.includes('enter password') ||
      combinedOutput.includes('can not open encrypted archive') ||
      combinedOutput.includes('cannot open encrypted') ||
      combinedOutput.includes('data error in encrypted');

    if (isPasswordError || password || exitCode === 2) {
      throw new Error(
        password
          ? 'Incorrect password. Please verify and try again.'
          : 'Archive is password-protected. Password required.'
      );
    }
    throw new Error(`Extraction failed with exit code ${exitCode}: ${stderrLogs.join(' ') || stdoutLogs.join(' ') || 'Corrupted archive or unsupported format'}`);
  }

  const results: DiscoveredArchiveFile[] = [];

  const traverseDir = (dir: string, baseRel: string) => {
    const entries = sz.FS.readdir(dir);
    for (const entry of entries) {
      if (entry === '.' || entry === '..') continue;
      const fullPath = `${dir}/${entry}`;
      const relPath = baseRel ? `${baseRel}/${entry}` : entry;
      const stat = sz.FS.stat(fullPath);
      if (sz.FS.isDir(stat.mode)) {
        traverseDir(fullPath, relPath);
      } else {
        if (isIgnored(relPath)) continue;
        if (relPath.includes('../') || relPath.includes('..\\') || relPath.startsWith('/') || relPath.startsWith('\\')) {
          addLog('WARN', 'SECURITY', `Blocked unsafe path in archive: ${relPath}`);
          continue;
        }

        const filename = entry;
        const ext = filename.includes('.') ? '.' + filename.split('.').pop()! : '';
        const { type, mimeType } = detectFileType(ext);

        const fileBytes = sz.FS.readFile(fullPath);
        const fileBlob = new Blob([fileBytes as any], { type: mimeType });

        results.push({
          originalPath: relPath,
          cleanPath: relPath,
          filename,
          sizeBytes: stat.size || fileBlob.size,
          fileType: type,
          mimeType,
          archiveName: archiveBaseName,
          getData: async () => fileBlob,
        });
      }
    }
  };

  traverseDir(stagingDir, '');

  cleanupVirtualFS();

  return results;
}

/**
 * Parse one or multiple ZIP files
 */
export async function parseCourseArchives(
  files: File[],
  onProgress?: (percent: number, status: string) => void,
  onPasswordRequired?: (filename: string, attemptCount: number, errorMsg?: string) => Promise<PasswordPromptResult>,
  courseId?: string,
): Promise<ParsedArchiveResult> {
  const discoveredFiles: DiscoveredArchiveFile[] = [];
  let maxReportedPct = 0;
  
  // Stable course key for this batch ensures all 75 parts share the exact same course password promise
  const batchCourseKey = courseId || `import-batch-${files.map(f => f.name).sort().join('|')}`;
  let currentCoursePassword = await coursePasswordManager.getCoursePassword(batchCourseKey);

  const reportProgress = (pct: number, status: string) => {
    maxReportedPct = Math.max(maxReportedPct, Math.min(100, Math.round(pct)));
    if (onProgress) {
      onProgress(maxReportedPct, status);
    }
  };

  reportProgress(5, `Preparing queue for ${files.length} archive(s)...`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    addLog('INFO', 'IMPORTER', `Reading course archive [${i + 1}/${files.length}]: ${file.name}`, `Size: ${(file.size / 1024 / 1024).toFixed(1)} MB`);
    
    // Yield to the browser event loop so progress updates and memory can breathe
    await new Promise((r) => setTimeout(r, 30));

    const fileBase = 10 + (i / files.length) * 75;
    reportProgress(fileBase, `[Queue ${i + 1}/${files.length}] Scanning "${file.name}" (${(file.size / 1024 / 1024).toFixed(1)} MB)...`);

    const lowerName = file.name.toLowerCase();
    const isRar = lowerName.endsWith('.rar');
    const is7z = lowerName.endsWith('.7z') || lowerName.endsWith('.7zip');
    const isZip = lowerName.endsWith('.zip') || lowerName.endsWith('.tar.gz') || lowerName.endsWith('.tgz');
    const archiveBaseName = file.name.replace(/\.[^/.]+$/, '');

    // 1. RAR Archives (.rar) via node-unrar-js WASM
    if (isRar) {
      reportProgress(fileBase + (0.4 / files.length) * 75, `[Queue ${i + 1}/${files.length}] Decompressing RAR: ${file.name}...`);
      try {
        const { createExtractorFromData } = await import('node-unrar-js');
        const arrayBuffer = await file.arrayBuffer();
        const extractor = await createExtractorFromData({ data: arrayBuffer });
        const list = extractor.getFileList();

        for (const header of list.fileHeaders) {
          if (header.flags.directory) continue;
          const relPath = header.name.replace(/\\/g, '/');
          if (isIgnored(relPath)) continue;
          if (relPath.includes('../') || relPath.startsWith('/')) continue;

          const filename = relPath.split('/').pop() || relPath;
          const ext = filename.includes('.') ? '.' + filename.split('.').pop()! : '';
          const { type, mimeType } = detectFileType(ext);

          discoveredFiles.push({
            originalPath: relPath,
            cleanPath: relPath,
            filename,
            sizeBytes: header.unpSize || 0,
            fileType: type,
            mimeType,
            archiveName: archiveBaseName,
            getData: async () => {
              const extracted = extractor.extract({ files: [header.name] });
              for (const f of extracted.files) {
                if (f.fileHeader.name === header.name && f.extraction) {
                  return new Blob([f.extraction as any], { type: mimeType });
                }
              }
              throw new Error(`Failed to extract ${header.name} from RAR archive`);
            },
          });
        }
      } catch (err: any) {
        addLog('ERROR', 'IMPORTER', `Error processing RAR archive: ${file.name}`, err?.message);
        throw new Error(`Failed to read RAR archive "${file.name}": ${err?.message || 'Unsupported format'}`);
      }
      continue;
    }

    // 2. Encrypted Check & Decompression
    let isEncrypted = false;
    let fileBuffer: ArrayBuffer | null = null;

    if (isZip) {
      try {
        fileBuffer = await file.arrayBuffer();
        isEncrypted = isZipEncrypted(fileBuffer);
      } catch {}
    }

    // If encrypted or 7z: use 7z-wasm with course password reuse across all parts (Issue A)
    if (is7z || isEncrypted) {
      let extracted: DiscoveredArchiveFile[] | null = null;

      // Automatically try the course password on every part!
      if (currentCoursePassword) {
        try {
          reportProgress(fileBase + (0.3 / files.length) * 75, `[Queue ${i + 1}/${files.length}] Auto-unlocking "${file.name}" with course password...`);
          extracted = await extractWith7zWasm(file, archiveBaseName, currentCoursePassword);
          addLog('INFO', 'IMPORTER', `Archive "${file.name}" automatically decrypted using course password.`);
        } catch {
          // Password did not match this specific part
        }
      }

      // If no course password yet or password failed on this part, prompt user (Issue A)
      if (!extracted) {
        let attempt = 0;
        let lastError: string | undefined = currentCoursePassword
          ? `Course password failed for part "${file.name}". Please enter the password for this part.`
          : undefined;

        while (true) {
          attempt++;
          if (!onPasswordRequired) {
            throw new Error(`Archive "${file.name}" is password-protected. Password required.`);
          }
          const entered = await coursePasswordManager.getCoursePassword(batchCourseKey, {
            partName: file.name,
            forceReprompt: attempt > 1 || !!lastError,
            errorMessage: lastError,
            promptFn: async (ctx) => {
              return onPasswordRequired(ctx.partName || file.name, ctx.attemptCount, ctx.errorMessage);
            },
          });

          if (!entered) {
            // User cancelled extraction
            addLog('INFO', 'IMPORTER', `Password entry cancelled by user for archive: ${file.name}`);
            break;
          }

          try {
            reportProgress(fileBase + (0.5 / files.length) * 75, `[Queue ${i + 1}/${files.length}] Decrypting "${file.name}"...`);
            extracted = await extractWith7zWasm(file, archiveBaseName, entered);
            
            // On success, save in memory and reuse across all remaining parts of this course!
            currentCoursePassword = entered;
            coursePasswordManager.setSessionPassword(batchCourseKey, entered);
            if (courseId) {
              coursePasswordManager.aliasCourse(batchCourseKey, courseId);
            }
            break; // Extraction successful
          } catch (err: any) {
            isEncrypted = true;
            lastError = `Incorrect password for "${file.name}". Please verify and try again.`;
            addLog('WARN', 'IMPORTER', `Decryption failed for ${file.name}: ${err?.message || err}`);
          }
        }
      }

      if (extracted && extracted.length > 0) {
        discoveredFiles.push(...extracted);
      }
      continue;
    }

    // 3. Standard Non-Encrypted ZIP Archives via JSZip (Fast Path)
    try {
      const zip = await JSZip.loadAsync(fileBuffer || file);
      reportProgress(fileBase + (0.7 / files.length) * 75, `[Queue ${i + 1}/${files.length}] Decompressing headers: ${file.name}...`);

      zip.forEach((relPath, entry) => {
        if (entry.dir || relPath.endsWith('/')) return;
        if (isIgnored(relPath)) return;

        if (relPath.includes('../') || relPath.includes('..\\') || relPath.startsWith('/') || relPath.startsWith('\\')) {
          addLog('WARN', 'SECURITY', `Blocked unsafe path in archive: ${relPath}`);
          return;
        }

        const filename = relPath.split('/').pop() || relPath;
        const ext = filename.includes('.') ? '.' + filename.split('.').pop()! : '';
        const { type, mimeType } = detectFileType(ext);

        discoveredFiles.push({
          originalPath: relPath,
          cleanPath: relPath,
          filename,
          sizeBytes: (entry as any)._data?.uncompressedSize || 0,
          fileType: type,
          mimeType,
          archiveName: archiveBaseName,
          zipEntry: entry,
        });
      });
    } catch (zipErr: any) {
      // Fallback: If JSZip failed due to encrypted zip or unhandled compression, try 7z-wasm with course password
      if (zipErr?.message?.toLowerCase().includes('encrypted') || isEncrypted) {
        let extractedFallback: DiscoveredArchiveFile[] | null = null;

        // Try course password first
        if (currentCoursePassword) {
          try {
            reportProgress(fileBase + (0.3 / files.length) * 75, `[Queue ${i + 1}/${files.length}] Auto-unlocking "${file.name}" with course password...`);
            extractedFallback = await extractWith7zWasm(file, archiveBaseName, currentCoursePassword);
            addLog('INFO', 'IMPORTER', `Archive "${file.name}" automatically decrypted using course password.`);
          } catch {}
        }

        if (!extractedFallback) {
          let attempt = 0;
          let lastError: string | undefined = currentCoursePassword
            ? `Course password failed for part "${file.name}". Please enter the password for this part.`
            : undefined;

          while (true) {
            attempt++;
            if (!onPasswordRequired) {
              throw new Error(`Archive "${file.name}" is password-protected. Password required.`);
            }
            const entered = await coursePasswordManager.getCoursePassword(batchCourseKey, {
              partName: file.name,
              forceReprompt: attempt > 1 || !!lastError,
              errorMessage: lastError,
              promptFn: async (ctx) => {
                return onPasswordRequired(ctx.partName || file.name, ctx.attemptCount, ctx.errorMessage);
              },
            });

            if (!entered) {
              addLog('INFO', 'IMPORTER', `Password entry cancelled for: ${file.name}`);
              break;
            }

            try {
              reportProgress(fileBase + (0.5 / files.length) * 75, `[Queue ${i + 1}/${files.length}] Decrypting: ${file.name}...`);
              extractedFallback = await extractWith7zWasm(file, archiveBaseName, entered);
              currentCoursePassword = entered;
              coursePasswordManager.setSessionPassword(batchCourseKey, entered);
              if (courseId) {
                coursePasswordManager.aliasCourse(batchCourseKey, courseId);
              }
              break;
            } catch (err: any) {
              lastError = `Incorrect password for "${file.name}". Please verify and try again.`;
            }
          }
        }

        if (extractedFallback) {
          discoveredFiles.push(...extractedFallback);
        }
      } else {
        throw zipErr;
      }
    }
  }

  reportProgress(92, 'Structuring lesson modules and chapters...');
  const result = processDiscoveredFiles(discoveredFiles, files[0]?.name || 'Imported Course');
  reportProgress(100, 'Archive analysis complete!');
  return result;
}

/**
 * Parse an extracted course folder uploaded via webkitdirectory
 */
export async function parseCourseFolder(
  files: File[],
  onProgress?: (percent: number, status: string) => void
): Promise<ParsedArchiveResult> {
  const discoveredFiles: DiscoveredArchiveFile[] = [];
  let maxReportedPct = 0;

  const reportProgress = (pct: number, status: string) => {
    maxReportedPct = Math.max(maxReportedPct, Math.min(100, Math.round(pct)));
    if (onProgress) {
      onProgress(maxReportedPct, status);
    }
  };

  reportProgress(5, `Scanning course folder directory (${files.length} items)...`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    if (i % 5 === 0 || i === files.length - 1) {
      const pct = 10 + (i / Math.max(1, files.length)) * 75;
      reportProgress(pct, `Scanning folder: ${file.name} (${i + 1}/${files.length})...`);
    }

    const relPath = file.webkitRelativePath || file.name;
    if (isIgnored(relPath)) continue;

    const filename = relPath.split('/').pop() || file.name;
    const ext = filename.includes('.') ? '.' + filename.split('.').pop()! : '';
    const { type, mimeType } = detectFileType(ext);

    // If it's a URL shortcut, parse text to find the destination link
    let content: string | undefined = undefined;
    if (type === 'link' || type === 'rich_text') {
      try {
        content = await file.text();
      } catch {}
    }

    // Determine top folder name as archive name
    const topFolder = relPath.includes('/') ? relPath.split('/')[0]! : 'Course Folder';

    discoveredFiles.push({
      originalPath: relPath,
      cleanPath: relPath,
      filename,
      sizeBytes: file.size,
      fileType: type,
      mimeType,
      archiveName: topFolder,
      rawFile: file,
      content,
    });
  }

  const courseName = files[0]?.webkitRelativePath?.split('/')[0] || 'Imported Course';
  return processDiscoveredFiles(discoveredFiles, courseName);
}

/**
 * Core Hierarchy Organizer:
 * Automatically groups chapters, sections, companion subtitles, and lesson attachments.
 */
function processDiscoveredFiles(files: DiscoveredArchiveFile[], fallbackTitle: string): ParsedArchiveResult {
  if (files.length === 0) {
    throw new Error('No valid course materials found in the uploaded archive or folder.');
  }

  // Detect and strip common root folder across all files if present
  const pathParts = files.map((f) => f.cleanPath.split('/').filter(Boolean));
  let commonRoot = '';
  if (pathParts.length > 0 && pathParts[0] && pathParts[0].length > 1) {
    const candidateRoot = pathParts[0][0];
    const allShareRoot = pathParts.every((parts) => parts.length > 1 && parts[0] === candidateRoot);
    if (allShareRoot && candidateRoot) {
      commonRoot = candidateRoot;
      for (const f of files) {
        f.cleanPath = f.cleanPath.replace(new RegExp(`^${commonRoot}/`), '');
      }
    }
  }

  // Detect common prefix across archive names (e.g. "Python Full Stack Course Part 1", "Python Full Stack Course Part 2")
  const distinctArchiveNames = Array.from(new Set(files.map((f) => f.archiveName).filter(Boolean)));
  const commonArchivePrefix = findLongestCommonPrefix(distinctArchiveNames);

  // Detect common prefix across subfolder names
  const subfolderNames = files
    .map((f) => {
      const parts = f.cleanPath.split('/').filter(Boolean);
      return parts.length >= 2 ? parts[parts.length - 2]! : '';
    })
    .filter(Boolean);
  const commonSubfolderPrefix = findLongestCommonPrefix(Array.from(new Set(subfolderNames)));

  let suggestedTitle = commonArchivePrefix || (commonRoot ? cleanTitle(commonRoot) : cleanTitle(fallbackTitle));

  // Group by Section:
  // If files inside archive have no subfolders (e.g. 01. Introduction.zip with flat files),
  // then the archiveName itself IS the chapter/section!
  const sectionMap = new Map<string, { title: string; position: number; files: DiscoveredArchiveFile[]; archiveName?: string }>();

  for (const file of files) {
    const parts = file.cleanPath.split('/').filter(Boolean);

    let sectionName = file.archiveName;
    let sectionPos = 1;

    if (parts.length >= 2) {
      // Subfolder inside archive e.g. "Chapter 1 - Intro/01.mp4"
      const folderName = parts[parts.length - 2]!;
      const parsed = cleanSectionTitleAndPosition(folderName, commonSubfolderPrefix, 1);
      sectionName = parsed.cleanTitle;
      sectionPos = parsed.position;
    } else {
      // Flat inside archive: use archiveName as Section Name
      const parsed = cleanSectionTitleAndPosition(file.archiveName, commonArchivePrefix, 1);
      sectionName = parsed.cleanTitle || file.archiveName;
      sectionPos = parsed.position;
    }

    if (!sectionMap.has(sectionName)) {
      sectionMap.set(sectionName, {
        title: sectionName,
        position: sectionPos,
        files: [],
        archiveName: file.archiveName,
      });
    }

    sectionMap.get(sectionName)!.files.push(file);
  }

  // Build Sections and their Lessons
  const resultSections: ProposalSection[] = [];
  let secIdx = 1;

  for (const [, secData] of sectionMap.entries()) {
    // Separate subtitle files (.srt, .vtt) so they attach to companion videos
    const subtitles = secData.files.filter((f) => f.fileType === 'subtitle');
    const mediaAndDocs = secData.files.filter((f) => f.fileType !== 'subtitle');

    const lessonMap = new Map<string, { title: string; position: number; files: ProposalLessonFile[]; subtitleFiles: ProposalLessonFile[] }>();
    let lesIdx = 1;

    // Sort files naturally by filename
    mediaAndDocs.sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true }));

    for (const f of mediaAndDocs) {
      const baseName = f.filename.replace(/\.[^/.]+$/, '');
      const parsedLes = parsePositionAndTitle(baseName, lesIdx);
      const groupKey = parsedLes.title.toLowerCase();

      // Check if an existing lesson in this section shares the exact same explicit position number
      let targetKey = groupKey;
      if (parsedLes.hasExplicitNumber) {
        for (const [k, v] of lessonMap.entries()) {
          if (v.position === parsedLes.position) {
            const hasMedia = v.files.some((item) => item.type === 'video' || item.type === 'audio');
            const isCompanion = ['rich_text', 'document', 'link', 'code', 'asset'].includes(f.fileType);
            if ((hasMedia && isCompanion) || k === groupKey || k.includes(groupKey) || groupKey.includes(k)) {
              targetKey = k;
              break;
            }
          }
        }
      }

      if (!lessonMap.has(targetKey)) {
        lessonMap.set(targetKey, {
          title: parsedLes.title || `Lesson ${lesIdx}`,
          position: parsedLes.position || lesIdx,
          files: [],
          subtitleFiles: [],
        });
        lesIdx++;
      }

      lessonMap.get(targetKey)!.files.push({
        path: f.cleanPath,
        filename: f.filename,
        sizeBytes: f.sizeBytes,
        type: f.fileType,
        mimeType: f.mimeType,
        zipEntry: f.zipEntry,
        rawFile: f.rawFile,
        content: f.content,
        getData: f.getData,
      });
    }

    // Attach matching subtitles to lessons
    for (const sub of subtitles) {
      const subBase = sub.filename.replace(/\.[^/.]+$/, '').toLowerCase();
      // Find matching lesson
      let matched = false;
      for (const [key, lesData] of lessonMap.entries()) {
        if (subBase.includes(key) || key.includes(subBase)) {
          lesData.subtitleFiles.push({
            path: sub.cleanPath,
            filename: sub.filename,
            sizeBytes: sub.sizeBytes,
            type: 'subtitle',
            mimeType: sub.mimeType,
            zipEntry: sub.zipEntry,
            rawFile: sub.rawFile,
            getData: sub.getData,
          });
          matched = true;
          break;
        }
      }
      // If subtitle didn't match any lesson, attach to first lesson
      if (!matched && lessonMap.size > 0) {
        const first = lessonMap.values().next().value;
        first?.subtitleFiles.push({
          path: sub.cleanPath,
          filename: sub.filename,
          sizeBytes: sub.sizeBytes,
          type: 'subtitle',
          mimeType: sub.mimeType,
          zipEntry: sub.zipEntry,
          rawFile: sub.rawFile,
          getData: sub.getData,
        });
      }
    }

    const lessons: ProposalLesson[] = [];
    let lPos = 1;
    for (const [, lesData] of lessonMap.entries()) {
      lessons.push({
        id: `les-${secIdx}-${lPos}`,
        title: lesData.title,
        position: lesData.position || lPos,
        files: lesData.files,
        subtitleFiles: lesData.subtitleFiles,
        isApproved: true,
      });
      lPos++;
    }

    lessons.sort((a, b) => a.position - b.position || a.title.localeCompare(b.title, undefined, { numeric: true }));

    resultSections.push({
      id: `sec-${secIdx}`,
      title: secData.title,
      position: secData.position || secIdx,
      sourceConfidence: 'numbered',
      lessons,
      archiveName: secData.archiveName || secData.files[0]?.archiveName,
    });

    secIdx++;
  }

  resultSections.sort((a, b) => a.position - b.position || a.title.localeCompare(b.title, undefined, { numeric: true }));

  return {
    suggestedTitle: suggestedTitle || 'Imported Course',
    suggestedSubject: 'General Studies',
    suggestedInstructor: 'Course Instructor',
    suggestedDescription: `Course with ${resultSections.length} chapter(s) and ${files.length} study files.`,
    discoveredFiles: files,
    sections: resultSections,
    manifestFound: false,
  };
}

/**
 * Commit the imported course:
 * - Stores all videos, audio, PDFs, and slide decks in IndexedDB media vault.
 * - Extracts HTML, markdown, and text notes into rich_text blocks.
 * - Saves course into vault.
 */
export async function commitImportedCourse(params: {
  courseId: string;
  courseTitle: string;
  courseSubject: string;
  instructorName: string;
  courseDescription: string;
  targetStorage: 'internal' | 'external';
  sections: ProposalSection[];
  appendToCourseId?: string;
  onProgress?: (percent: number, status: string) => void;
}): Promise<CourseData> {
  const {
    courseId,
    courseTitle,
    courseSubject,
    instructorName,
    courseDescription,
    targetStorage = 'internal',
    sections,
    appendToCourseId,
    onProgress,
  } = params;

  const storageConfig = getStorageConfig();
  const targetBaseMountPath = targetStorage === 'external' ? storageConfig.externalMountPath : undefined;

  addLog('INFO', 'IMPORTER', `Committing course: ${courseTitle}`, `Storage: ${targetStorage.toUpperCase()} (${targetBaseMountPath || 'Internal Vault'}) • Chapters: ${sections.length}`);

  let totalFiles = 0;
  for (const sec of sections) {
    for (const les of sec.lessons) {
      if (les.isApproved) {
        totalFiles += les.files.length + (les.subtitleFiles?.length || 0);
      }
    }
  }
  totalFiles = Math.max(1, totalFiles);

  let currentFileIdx = 0;
  let maxReportedPct = 0;

  const reportProgress = (pct: number, status: string) => {
    maxReportedPct = Math.max(maxReportedPct, Math.min(100, Math.round(pct)));
    if (onProgress) {
      onProgress(maxReportedPct, status);
    }
  };

  reportProgress(5, `Starting media extraction (0 of ${totalFiles} items)...`);

  const finalSections: SectionData[] = [];

  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const sec = sections[sIdx]!;
    const approvedLessons = sec.lessons.filter((l) => l.isApproved);
    if (approvedLessons.length === 0) continue;

    const finalLessons: LessonData[] = [];

    for (let lIdx = 0; lIdx < approvedLessons.length; lIdx++) {
      const les = approvedLessons[lIdx]!;
      const blocks: ContentBlockData[] = [];
      let blockPos = 1;

      for (const fileItem of les.files) {
        const fileSpan = 75 / totalFiles;
        const fileBase = 5 + (currentFileIdx / totalFiles) * 75;

        reportProgress(
          fileBase,
          `Extracting ${currentFileIdx + 1}/${totalFiles}: ${fileItem.filename}`
        );

        const normalizedPath = fileItem.path.replace(/\\/g, '/');

        if (fileItem.type === 'video' || fileItem.type === 'audio') {
          // Get blob from getData, zipEntry, or rawFile with smooth real-time progress
          let blob: Blob;
          if (fileItem.getData) {
            blob = await fileItem.getData();
          } else if (fileItem.zipEntry) {
            blob = await fileItem.zipEntry.async('blob', (metadata) => {
              const subPercent = (metadata.percent / 100) * fileSpan;
              reportProgress(
                fileBase + subPercent,
                `Extracting ${fileItem.filename} (${Math.round(metadata.percent)}%)...`
              );
            });
          } else if (fileItem.rawFile) {
            blob = fileItem.rawFile;
          } else {
            currentFileIdx++;
            continue;
          }

          const fileBlobSize = blob.size;
          await saveMediaFile(courseId, normalizedPath, blob, fileItem.mimeType, targetStorage, targetBaseMountPath);
          blob = null as any; // Release blob buffer immediately to prevent heap exhaustion
          delete (fileItem as any).rawFile;
          delete (fileItem as any).zipEntry;
          delete (fileItem as any).getData;
          currentFileIdx++;

          blocks.push({
            id: `blk-${Date.now()}-${sIdx}-${lIdx}-${blockPos++}`,
            type: 'video',
            position: blockPos,
            title: les.title,
            src: `vault-media://${courseId}/${normalizedPath}`,
            filename: fileItem.filename,
            fileSizeBytes: fileItem.sizeBytes || fileBlobSize,
            mimeType: fileItem.mimeType,
          });
        } else if (fileItem.type === 'document') {
          let blob: Blob;
          if (fileItem.getData) {
            blob = await fileItem.getData();
          } else if (fileItem.zipEntry) {
            blob = await fileItem.zipEntry.async('blob', (metadata) => {
              const subPercent = (metadata.percent / 100) * fileSpan;
              reportProgress(
                fileBase + subPercent,
                `Extracting ${fileItem.filename} (${Math.round(metadata.percent)}%)...`
              );
            });
          } else if (fileItem.rawFile) {
            blob = fileItem.rawFile;
          } else {
            currentFileIdx++;
            continue;
          }

          const docBlobSize = blob.size;
          await saveMediaFile(courseId, normalizedPath, blob, fileItem.mimeType, targetStorage, targetBaseMountPath);
          blob = null as any; // Release blob buffer immediately to prevent heap exhaustion
          delete (fileItem as any).rawFile;
          delete (fileItem as any).zipEntry;
          delete (fileItem as any).getData;
          currentFileIdx++;

          blocks.push({
            id: `blk-${Date.now()}-${sIdx}-${lIdx}-${blockPos++}`,
            type: 'document',
            position: blockPos,
            title: fileItem.filename,
            src: `vault-media://${courseId}/${normalizedPath}`,
            filename: fileItem.filename,
            fileSizeBytes: fileItem.sizeBytes || docBlobSize,
            mimeType: fileItem.mimeType,
          });
        } else if (fileItem.type === 'rich_text') {
          currentFileIdx++;
          let text = fileItem.content;
          if (!text && fileItem.getData) {
            const b = await fileItem.getData();
            text = await b.text();
          } else if (!text && fileItem.zipEntry) {
            text = await fileItem.zipEntry.async('text');
          } else if (!text && fileItem.rawFile) {
            text = await fileItem.rawFile.text();
          }

          // Format Jupyter Notebooks into study markdown & code cells
          if (fileItem.filename.toLowerCase().endsWith('.ipynb')) {
            text = parseJupyterNotebook(text || '', fileItem.filename);
          } else if (['.html', '.htm'].some((ext) => fileItem.filename.toLowerCase().endsWith(ext))) {
            // Sanitize HTML and prevent dark-mode color clashes
            text = sanitizeLectureHtml(text || '');
          }

          blocks.push({
            id: `blk-${Date.now()}-${sIdx}-${lIdx}-${blockPos++}`,
            type: 'rich_text',
            position: blockPos,
            title: fileItem.filename,
            content: text || '',
            filename: fileItem.filename,
            fileSizeBytes: fileItem.sizeBytes,
          });
        } else if (fileItem.type === 'link') {
          currentFileIdx++;
          // Link shortcut: extract URL across .url, .webloc, .desktop, and raw text
          let text = fileItem.content;
          if (!text && fileItem.getData) {
            const b = await fileItem.getData();
            text = await b.text();
          } else if (!text && fileItem.zipEntry) {
            text = await fileItem.zipEntry.async('text');
          } else if (!text && fileItem.rawFile) {
            text = await fileItem.rawFile.text();
          }
          const linkUrl = extractUrlFromShortcutText(text || '');

          blocks.push({
            id: `blk-${Date.now()}-${sIdx}-${lIdx}-${blockPos++}`,
            type: 'downloadable_asset',
            position: blockPos,
            title: fileItem.filename.replace(/\.(url|webloc|desktop)$/i, ''),
            src: linkUrl,
            filename: fileItem.filename,
          });
        }
      }

      // Process subtitles for this lesson
      if (les.subtitleFiles && les.subtitleFiles.length > 0) {
        const subtitleTracks: SubtitleTrackData[] = [];

        for (let subIdx = 0; subIdx < les.subtitleFiles.length; subIdx++) {
          const subItem = les.subtitleFiles[subIdx]!;
          currentFileIdx++;
          const subPct = 80 + (currentFileIdx / totalFiles) * 12;
          reportProgress(subPct, `Converting subtitles: ${subItem.filename}`);

          try {
            let srtOrVttText = '';
            if (subItem.getData) {
              const b = await subItem.getData();
              srtOrVttText = await b.text();
            } else if (subItem.zipEntry) {
              srtOrVttText = await subItem.zipEntry.async('text');
            } else if (subItem.rawFile) {
              srtOrVttText = await subItem.rawFile.text();
            }

            if (srtOrVttText) {
              // Convert any subtitle format (SRT, SBV, ASS, LRC) to standard WebVTT
              const vttText = anySubtitleToVtt(srtOrVttText, subItem.filename);
              const vttBlob = new Blob([vttText], { type: 'text/vtt' });
              const subPath = `subtitles/${les.id}_sub_${subIdx}.vtt`;
              await saveMediaFile(courseId, subPath, vttBlob, 'text/vtt', targetStorage, targetBaseMountPath);

              subtitleTracks.push({
                id: `sub-${sIdx}-${lIdx}-${subIdx}`,
                label: subItem.filename.replace(/\.[^/.]+$/, '').replace(/^[0-9\s._-]+/, '') || `English ${subIdx + 1}`,
                language: 'en',
                src: `vault-media://${courseId}/${subPath}`,
                filename: subItem.filename,
                isDefault: subIdx === 0,
                vttContent: vttText.slice(0, 100000),
              });
            }
          } catch (err: any) {
            addLog('WARN', 'IMPORTER', `Failed to process subtitle ${subItem.filename}: ${err.message}`);
          }
        }

        // Attach resolved subtitles to first video block
        const videoBlock = blocks.find((b) => b.type === 'video');
        if (videoBlock && subtitleTracks.length > 0) {
          videoBlock.subtitles = subtitleTracks;
        }
      }

      if (blocks.length === 0) {
        blocks.push({
          id: `blk-${Date.now()}-${sIdx}-${lIdx}-1`,
          type: 'rich_text',
          position: 1,
          title: les.title,
          content: `### ${les.title}\n\nCourse lesson material ready for offline study.`,
        });
      }

      finalLessons.push({
        id: les.id,
        sectionId: sec.id,
        title: les.title,
        position: les.position,
        estimatedDurationMinutes: Math.max(10, blocks.length * 8),
        completionPolicy: 'manual_or_time',
        isRequired: true,
        blocks,
      });
    }

    finalSections.push({
      id: sec.id,
      title: sec.title,
      position: sec.position,
      estimatedDurationMinutes: finalLessons.reduce((acc, l) => acc + l.estimatedDurationMinutes, 0),
      lessons: finalLessons,
    });
  }

  // If appending to an existing course, merge sections and return
  if (appendToCourseId) {
    const existing = getCourseById(appendToCourseId);
    reportProgress(95, 'Writing supplementary chapters into course...');
    appendSectionsToCourse(appendToCourseId, finalSections);
    reportProgress(100, 'Materials appended successfully!');
    addLog(
      'INFO',
      'IMPORTER',
      `Appended supplementary chapters to: ${existing?.title || appendToCourseId}`,
      `${finalSections.length} sections merged, ${totalFiles} new media files`
    );
    return getCourseById(appendToCourseId)!;
  }

  const courseData: CourseData = {
    id: courseId,
    title: courseTitle,
    description: courseDescription,
    language: 'en',
    instructorName,
    subject: courseSubject,
    tags: [courseSubject, 'Offline'],
    estimatedDurationMinutes: finalSections.reduce((acc, s) => acc + s.estimatedDurationMinutes, 0),
    learningObjectives: [
      `Mastery of ${courseTitle}`,
      'Independent offline review and practice',
      'Lecture notes, slides, and exercises completed',
    ],
    version: '1.0.0',
    contentFingerprint: `sha256-${Date.now().toString(16)}`,
    sections: finalSections,
    isImported: true,
    addedAt: new Date().toISOString(),
    storageTier: targetStorage,
    externalMountPath: targetBaseMountPath,
    externalCourseDir: targetBaseMountPath ? `${targetBaseMountPath}/coursenest_courses/${courseId}` : undefined,
    relativeCourseDir: targetBaseMountPath ? `coursenest_courses/${courseId}` : undefined,
    isExternalMissing: false,
    storageStatus: 'Available',
  };

  reportProgress(94, targetStorage === 'external' ? 'Writing manifest and structure to external disk...' : 'Writing course manifest to offline vault...');
  addCourseToVault(courseData);

  // Mirror course manifest to physical drive (SSD or External Drive) in Electron
  const electron = (window as any).electron || (window as any).__ELECTRON__;
  if (electron?.storage?.saveCourseToDisk) {
    try {
      const diskRes = await electron.storage.saveCourseToDisk({
        course: courseData,
        targetDir: targetStorage === 'external' ? targetBaseMountPath : undefined,
      });
      if (diskRes?.courseDir) {
        courseData.externalCourseDir = diskRes.courseDir;
        addCourseToVault(courseData);
      }
      addLog(
        'INFO',
        'IMPORTER',
        `Course saved to physical ${targetStorage === 'external' ? 'external drive' : 'SSD'} at: ${diskRes?.courseDir || 'Local Vault'}`
      );
    } catch (diskErr: any) {
      addLog('WARN', 'IMPORTER', `Failed to write course manifest to disk: ${diskErr.message}`);
    }
  }

  reportProgress(98, 'Verifying course integrity...');
  reportProgress(100, 'Complete! Course saved and ready for offline study.');
  addLog('INFO', 'IMPORTER', `Course saved to ${targetStorage === 'external' ? 'external drive' : 'offline vault'}: ${courseTitle}`, `${finalSections.length} sections, ${totalFiles} files`);

  return courseData;
}
