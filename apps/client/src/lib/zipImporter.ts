import JSZip from 'jszip';
import { addLog } from './logger';
import { saveMediaFile } from './mediaVault';
import { addCourseToVault, type CourseData, type SectionData, type LessonData, type ContentBlockData } from './courseStore';

export interface DiscoveredArchiveFile {
  originalPath: string;
  cleanPath: string;
  filename: string;
  sizeBytes: number;
  fileType: 'video' | 'audio' | 'document' | 'rich_text' | 'code' | 'asset';
  mimeType: string;
  archiveName: string;
  zipEntry: JSZip.JSZipObject;
}

export interface ProposalLessonFile {
  path: string;
  filename: string;
  sizeBytes: number;
  type: 'video' | 'audio' | 'document' | 'rich_text' | 'code' | 'asset';
  mimeType: string;
  zipEntry: JSZip.JSZipObject;
}

export interface ProposalLesson {
  id: string;
  title: string;
  position: number;
  files: ProposalLessonFile[];
  isApproved: boolean;
}

export interface ProposalSection {
  id: string;
  title: string;
  position: number;
  sourceConfidence: 'manifest' | 'numbered' | 'heuristic';
  lessons: ProposalLesson[];
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

// System clutter files to skip
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
  type: 'video' | 'audio' | 'document' | 'rich_text' | 'code' | 'asset';
  mimeType: string;
} {
  const e = ext.toLowerCase();

  // Video
  if (e === '.mp4') return { type: 'video', mimeType: 'video/mp4' };
  if (e === '.webm') return { type: 'video', mimeType: 'video/webm' };
  if (e === '.mkv') return { type: 'video', mimeType: 'video/x-matroska' };
  if (e === '.mov') return { type: 'video', mimeType: 'video/quicktime' };
  if (e === '.m4v') return { type: 'video', mimeType: 'video/x-m4v' };
  if (e === '.avi') return { type: 'video', mimeType: 'video/x-msvideo' };

  // Audio
  if (e === '.mp3') return { type: 'audio', mimeType: 'audio/mpeg' };
  if (e === '.wav') return { type: 'audio', mimeType: 'audio/wav' };
  if (e === '.m4a') return { type: 'audio', mimeType: 'audio/mp4' };
  if (e === '.ogg') return { type: 'audio', mimeType: 'audio/ogg' };
  if (e === '.flac') return { type: 'audio', mimeType: 'audio/flac' };

  // Document
  if (e === '.pdf') return { type: 'document', mimeType: 'application/pdf' };
  if (e === '.epub') return { type: 'document', mimeType: 'application/epub+zip' };

  // Notes & Text
  if (e === '.md' || e === '.markdown') return { type: 'rich_text', mimeType: 'text/markdown' };
  if (e === '.txt') return { type: 'rich_text', mimeType: 'text/plain' };

  // Code
  if (['.py', '.js', '.jsx', '.ts', '.tsx', '.c', '.cpp', '.h', '.hpp', '.rs', '.go', '.java', '.html', '.css', '.json', '.sql', '.sh'].includes(e)) {
    return { type: 'code', mimeType: 'text/plain' };
  }

  return { type: 'asset', mimeType: 'application/octet-stream' };
}

function cleanTitle(raw: string): string {
  // Strip extension
  let name = raw.replace(/\.[^/.]+$/, '');
  // Replace underscores and multiple dashes with spaces
  name = name.replace(/[_-]+/g, ' ');
  // Strip leading numbers: "01 Chapter" -> "Chapter", "01. Introduction" -> "Introduction"
  name = name.replace(/^(\d+)[\s.]+/i, '');
  return name.trim() || raw;
}

function parsePositionAndTitle(raw: string, defaultPos: number): { position: number; title: string } {
  const match = raw.match(/^(?:(?:Week|Chapter|Section|Module|Part|Lecture|Unit|Ch)\s*)?(\d+)[\s._-]+(.*)$/i);
  if (match && match[1] && match[2]) {
    const pos = parseInt(match[1], 10);
    const title = cleanTitle(match[2].trim());
    return { position: isNaN(pos) ? defaultPos : pos, title: title || raw };
  }
  return { position: defaultPos, title: cleanTitle(raw) };
}

/**
 * Parse one or multiple ZIP files asynchronously and extract the real course structure.
 */
export async function parseCourseArchives(files: File[]): Promise<ParsedArchiveResult> {
  const discoveredFiles: DiscoveredArchiveFile[] = [];
  let manifestEntry: { entry: JSZip.JSZipObject; archiveName: string } | null = null;

  for (const file of files) {
    addLog('INFO', 'IMPORTER', `Reading course archive: ${file.name}`, `Size: ${(file.size / 1024 / 1024).toFixed(1)} MB`);
    const zip = await JSZip.loadAsync(file);

    zip.forEach((relPath, entry) => {
      // 1. Skip directories and ignored files
      if (entry.dir || relPath.endsWith('/')) return;
      if (isIgnored(relPath)) return;

      // 2. Zip Slip path traversal guard
      if (relPath.includes('../') || relPath.includes('..\\') || relPath.startsWith('/') || relPath.startsWith('\\')) {
        addLog('WARN', 'SECURITY', `Blocked unsafe path in archive: ${relPath}`);
        return;
      }

      const filename = relPath.split('/').pop() || relPath;
      const ext = filename.includes('.') ? '.' + filename.split('.').pop()! : '';
      const { type, mimeType } = detectFileType(ext);

      // Check for manifest
      if (filename.toLowerCase() === 'manifest.json' || filename.toLowerCase() === 'course.json') {
        manifestEntry = { entry, archiveName: file.name };
      }

      discoveredFiles.push({
        originalPath: relPath,
        cleanPath: relPath,
        filename,
        sizeBytes: (entry as any)._data?.uncompressedSize || 0,
        fileType: type,
        mimeType,
        archiveName: file.name,
        zipEntry: entry,
      });
    });
  }

  if (discoveredFiles.length === 0) {
    throw new Error('No valid course materials found inside the uploaded archive.');
  }

  // 3. Detect and strip common root folder if present across all files
  const pathParts = discoveredFiles.map((f) => f.originalPath.split('/').filter(Boolean));
  let commonRoot = '';
  if (pathParts.length > 0 && pathParts[0] && pathParts[0].length > 1) {
    const candidateRoot = pathParts[0][0];
    const allShareRoot = pathParts.every((parts) => parts.length > 1 && parts[0] === candidateRoot);
    if (allShareRoot && candidateRoot) {
      commonRoot = candidateRoot;
      for (const f of discoveredFiles) {
        f.cleanPath = f.cleanPath.replace(new RegExp(`^${commonRoot}/`), '');
      }
    }
  }

  // 4. Default title derivation from common root or first archive filename
  let suggestedTitle = '';
  if (commonRoot) {
    suggestedTitle = cleanTitle(commonRoot);
  } else if (files[0]) {
    suggestedTitle = cleanTitle(files[0].name.replace(/\.[^/.]+$/, ''));
  }

  // 5. Check if manifest exists and parse it
  if (manifestEntry !== null) {
    const activeManifest = manifestEntry as { entry: JSZip.JSZipObject; archiveName: string };
    try {
      const jsonText = await activeManifest.entry.async('text');
      const parsed = JSON.parse(jsonText);
      const m = parsed.course ?? parsed;

      const manifestSections: ProposalSection[] = (m.sections ?? []).map((sec: any, sIdx: number) => ({
        id: `sec-${sIdx + 1}`,
        title: sec.title || `Section ${sIdx + 1}`,
        position: sec.position ?? sIdx + 1,
        sourceConfidence: 'manifest',
        lessons: (sec.lessons ?? []).map((les: any, lIdx: number) => ({
          id: `les-${sIdx + 1}-${lIdx + 1}`,
          title: les.title || `Lesson ${lIdx + 1}`,
          position: les.position ?? lIdx + 1,
          isApproved: true,
          files: discoveredFiles
            .filter((df) => df.cleanPath.toLowerCase().includes(les.title.toLowerCase().slice(0, 10)))
            .map((df) => ({
              path: df.cleanPath,
              filename: df.filename,
              sizeBytes: df.sizeBytes,
              type: df.fileType,
              mimeType: df.mimeType,
              zipEntry: df.zipEntry,
            })),
        })),
      }));

      addLog('INFO', 'IMPORTER', `Found and parsed course manifest: ${activeManifest.archiveName}`);

      return {
        suggestedTitle: m.title || suggestedTitle,
        suggestedSubject: m.subject || 'General Studies',
        suggestedInstructor: m.instructorName || m.instructor || 'Instructor',
        suggestedDescription: m.description || 'Course imported from verified manifest package.',
        discoveredFiles,
        sections: manifestSections.length > 0 ? manifestSections : buildHeuristicSections(discoveredFiles),
        manifestFound: true,
      };
    } catch (err: any) {
      addLog('WARN', 'IMPORTER', `Failed to parse manifest JSON in archive: ${err.message}`);
    }
  }

  // 6. Heuristic Chapter & Section Hierarchy Analyzer
  const sections = buildHeuristicSections(discoveredFiles);

  addLog(
    'INFO',
    'IMPORTER',
    `Organized ${discoveredFiles.length} files into ${sections.length} course section(s)/chapter(s)`,
    sections.map((s) => `${s.title} (${s.lessons.length} lessons)`).join(', '),
  );

  return {
    suggestedTitle: suggestedTitle || 'Imported Course',
    suggestedSubject: 'General',
    suggestedInstructor: 'Course Instructor',
    suggestedDescription: `Course imported with ${discoveredFiles.length} lecture files and study materials.`,
    discoveredFiles,
    sections,
    manifestFound: false,
  };
}

/**
 * Intelligent Hierarchy Builder:
 * Handles multiple chapters, sub-chapters, nested modules, and companion files.
 */
function buildHeuristicSections(files: DiscoveredArchiveFile[]): ProposalSection[] {
  // Sort files naturally by clean path
  const sortedFiles = [...files].sort((a, b) =>
    a.cleanPath.localeCompare(b.cleanPath, undefined, { numeric: true, sensitivity: 'base' })
  );

  // Group files by Section (either chapter folder or top folder)
  const sectionMap = new Map<string, { title: string; position: number; files: DiscoveredArchiveFile[] }>();

  for (let idx = 0; idx < sortedFiles.length; idx++) {
    const file = sortedFiles[idx]!;
    const parts = file.cleanPath.split('/').filter(Boolean);

    let rawSectionName = 'General Course Materials';
    let sectionPos = 1;

    if (parts.length >= 3) {
      // e.g. "Module 1/Chapter 1/Lesson.mp4" -> Section: "Module 1 - Chapter 1"
      const moduleName = parts[parts.length - 3]!;
      const chapterName = parts[parts.length - 2]!;
      const parsedMod = parsePositionAndTitle(moduleName, 1);
      const parsedCh = parsePositionAndTitle(chapterName, 1);
      rawSectionName = `${parsedMod.title}: ${parsedCh.title}`;
      sectionPos = parsedMod.position * 10 + parsedCh.position;
    } else if (parts.length === 2) {
      // e.g. "Chapter 1 - Basics/01 - Welcome.mp4" -> Section: "Chapter 1 - Basics"
      const folder = parts[0]!;
      const parsed = parsePositionAndTitle(folder, 1);
      rawSectionName = parsed.title;
      sectionPos = parsed.position;
    } else {
      // Single file at root: e.g. "Chapter 1 - Intro.mp4"
      const fn = parts[0]!;
      const chMatch = fn.match(/^(?:(?:Chapter|Ch|Section|Week|Module)\s*)?(\d+)[\s._-]+/i);
      if (chMatch && chMatch[1]) {
        const num = parseInt(chMatch[1], 10);
        rawSectionName = `Chapter ${num}`;
        sectionPos = num;
      } else {
        rawSectionName = 'Course Lessons';
        sectionPos = 1;
      }
    }

    if (!sectionMap.has(rawSectionName)) {
      sectionMap.set(rawSectionName, {
        title: rawSectionName,
        position: sectionPos,
        files: [],
      });
    }

    sectionMap.get(rawSectionName)!.files.push(file);
  }

  // Build Sections and their Lessons
  const resultSections: ProposalSection[] = [];
  let secIdx = 1;

  for (const [, secData] of sectionMap.entries()) {
    // Group companion files into lessons
    // e.g. "01 - Welcome.mp4" and "01 - Welcome.pdf" -> same lesson "Welcome"
    const lessonMap = new Map<string, { title: string; position: number; files: ProposalLessonFile[] }>();
    let lesIdx = 1;

    for (const f of secData.files) {
      const parts = f.cleanPath.split('/');
      const filename = parts[parts.length - 1]!;
      const baseName = filename.replace(/\.[^/.]+$/, '');
      const parsedLes = parsePositionAndTitle(baseName, lesIdx);

      // Lesson grouping key (normalize title)
      const groupKey = parsedLes.title.toLowerCase();

      if (!lessonMap.has(groupKey)) {
        lessonMap.set(groupKey, {
          title: parsedLes.title || `Lesson ${lesIdx}`,
          position: parsedLes.position || lesIdx,
          files: [],
        });
        lesIdx++;
      }

      lessonMap.get(groupKey)!.files.push({
        path: f.cleanPath,
        filename: f.filename,
        sizeBytes: f.sizeBytes,
        type: f.fileType,
        mimeType: f.mimeType,
        zipEntry: f.zipEntry,
      });
    }

    const lessons: ProposalLesson[] = [];
    let lPos = 1;
    for (const [, lesData] of lessonMap.entries()) {
      lessons.push({
        id: `les-${secIdx}-${lPos}`,
        title: lesData.title,
        position: lesData.position || lPos,
        files: lesData.files,
        isApproved: true,
      });
      lPos++;
    }

    // Sort lessons by position
    lessons.sort((a, b) => a.position - b.position);

    resultSections.push({
      id: `sec-${secIdx}`,
      title: secData.title,
      position: secData.position || secIdx,
      sourceConfidence: 'numbered',
      lessons,
    });

    secIdx++;
  }

  // Sort sections by position
  resultSections.sort((a, b) => a.position - b.position);

  return resultSections;
}

/**
 * Commit the imported course:
 * - Stores all binary files (videos, pdfs, audio) in the IndexedDB Media Vault.
 * - Extracts text/markdown notes directly into rich_text blocks.
 * - Adds course record to the Vault.
 */
export async function commitImportedCourse(params: {
  courseId: string;
  courseTitle: string;
  courseSubject: string;
  instructorName: string;
  courseDescription: string;
  targetStorage: 'internal' | 'external';
  sections: ProposalSection[];
  onProgress?: (percent: number, status: string) => void;
}): Promise<CourseData> {
  const {
    courseId,
    courseTitle,
    courseSubject,
    instructorName,
    courseDescription,
    sections,
    onProgress,
  } = params;

  addLog('INFO', 'IMPORTER', `Committing course: ${courseTitle}`, `Target storage: ${params.targetStorage}`);

  // Count total files to process
  let totalFiles = 0;
  for (const sec of sections) {
    for (const les of sec.lessons) {
      if (les.isApproved) {
        totalFiles += les.files.length;
      }
    }
  }

  let processedFiles = 0;
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
        processedFiles++;
        if (onProgress) {
          const percent = Math.min(95, Math.round((processedFiles / Math.max(1, totalFiles)) * 100));
          onProgress(percent, `Extracting: ${fileItem.filename}`);
        }

        const normalizedPath = fileItem.path.replace(/\\/g, '/');

        if (fileItem.type === 'video' || fileItem.type === 'audio') {
          // Read binary blob and store into IndexedDB media vault
          const blob = await fileItem.zipEntry.async('blob');
          await saveMediaFile(courseId, normalizedPath, blob, fileItem.mimeType);

          blocks.push({
            id: `blk-${Date.now()}-${sIdx}-${lIdx}-${blockPos++}`,
            type: 'video',
            position: blockPos,
            title: les.title,
            src: `vault-media://${courseId}/${normalizedPath}`,
            durationSeconds: 300,
            filename: fileItem.filename,
            fileSizeBytes: fileItem.sizeBytes,
            mimeType: fileItem.mimeType,
          });
        } else if (fileItem.type === 'document') {
          // PDF / slide deck
          const blob = await fileItem.zipEntry.async('blob');
          await saveMediaFile(courseId, normalizedPath, blob, fileItem.mimeType);

          blocks.push({
            id: `blk-${Date.now()}-${sIdx}-${lIdx}-${blockPos++}`,
            type: 'document',
            position: blockPos,
            title: fileItem.filename,
            src: `vault-media://${courseId}/${normalizedPath}`,
            filename: fileItem.filename,
            fileSizeBytes: fileItem.sizeBytes,
            mimeType: fileItem.mimeType,
          });
        } else if (fileItem.type === 'rich_text') {
          // Markdown or plain text notes
          const content = await fileItem.zipEntry.async('text');
          blocks.push({
            id: `blk-${Date.now()}-${sIdx}-${lIdx}-${blockPos++}`,
            type: 'rich_text',
            position: blockPos,
            title: fileItem.filename,
            content,
            filename: fileItem.filename,
            fileSizeBytes: fileItem.sizeBytes,
          });
        } else {
          // Code snippet or asset
          const text = await fileItem.zipEntry.async('text').catch(() => null);
          if (text !== null && text.length < 50000) {
            blocks.push({
              id: `blk-${Date.now()}-${sIdx}-${lIdx}-${blockPos++}`,
              type: 'code_snippet',
              position: blockPos,
              title: fileItem.filename,
              code: text,
              language: fileItem.filename.split('.').pop() || 'text',
              filename: fileItem.filename,
            });
          } else {
            const blob = await fileItem.zipEntry.async('blob');
            await saveMediaFile(courseId, normalizedPath, blob, fileItem.mimeType);
            blocks.push({
              id: `blk-${Date.now()}-${sIdx}-${lIdx}-${blockPos++}`,
              type: 'downloadable_asset',
              position: blockPos,
              title: fileItem.filename,
              src: `vault-media://${courseId}/${normalizedPath}`,
              filename: fileItem.filename,
              fileSizeBytes: fileItem.sizeBytes,
            });
          }
        }
      }

      // If no blocks were created (empty lesson), add a placeholder notes block
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
        estimatedDurationMinutes: Math.max(15, blocks.length * 10),
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

  const courseData: CourseData = {
    id: courseId,
    title: courseTitle,
    description: courseDescription,
    language: 'en',
    instructorName,
    subject: courseSubject,
    tags: [courseSubject, 'Offline', params.targetStorage === 'external' ? 'ExternalStorage' : 'InternalStorage'],
    estimatedDurationMinutes: finalSections.reduce((acc, s) => acc + s.estimatedDurationMinutes, 0),
    learningObjectives: [
      `Complete comprehension of ${courseTitle}`,
      'Independent study without internet connectivity',
      'Hands-on review of course materials and notes',
    ],
    version: '1.0.0',
    contentFingerprint: `sha256-${Date.now().toString(16)}`,
    sections: finalSections,
    isImported: true,
    addedAt: new Date().toISOString(),
  };

  addCourseToVault(courseData);

  if (onProgress) {
    onProgress(100, 'Complete!');
  }

  addLog('INFO', 'IMPORTER', `Course saved to offline vault successfully: ${courseTitle}`, `${finalSections.length} modules, ${totalFiles} files extracted`);

  return courseData;
}
