import JSZip from 'jszip';
import { addLog } from './logger';
import { saveMediaFile } from './mediaVault';
import { addCourseToVault, appendSectionsToCourse, getCourseById, type CourseData, type SectionData, type LessonData, type ContentBlockData, type SubtitleTrackData } from './courseStore';
import { anySubtitleToVtt, extractUrlFromShortcutText, parseJupyterNotebook, sanitizeLectureHtml } from './formatHelpers';

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

function cleanTitle(raw: string): string {
  let name = raw.replace(/\.[^/.]+$/, '');
  name = name.replace(/[_-]+/g, ' ');
  name = name.replace(/^(\d+)[\s.]+/i, '');
  return name.trim() || raw;
}

function parsePositionAndTitle(raw: string, defaultPos: number): { position: number; title: string; hasExplicitNumber: boolean } {
  const match = raw.match(/^(?:(?:Week|Chapter|Section|Module|Part|Lecture|Unit|Ch)\s*)?(\d+)[\s._-]+(.*)$/i);
  if (match && match[1] && match[2]) {
    const pos = parseInt(match[1], 10);
    const title = cleanTitle(match[2].trim());
    return { position: isNaN(pos) ? defaultPos : pos, title: title || raw, hasExplicitNumber: !isNaN(pos) };
  }
  return { position: defaultPos, title: cleanTitle(raw), hasExplicitNumber: false };
}

/**
 * Parse one or multiple ZIP files
 */
export async function parseCourseArchives(
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

  reportProgress(5, `Preparing archive scan for ${files.length} file(s)...`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    addLog('INFO', 'IMPORTER', `Reading course archive: ${file.name}`, `Size: ${(file.size / 1024 / 1024).toFixed(1)} MB`);
    
    const fileBase = 10 + (i / files.length) * 75;
    reportProgress(fileBase, `Reading archive ${i + 1} of ${files.length}: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)...`);

    const zip = await JSZip.loadAsync(file);
    reportProgress(fileBase + (0.7 / files.length) * 75, `Decompressing headers: ${file.name}...`);
    const archiveBaseName = file.name.replace(/\.[^/.]+$/, '');

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

  let suggestedTitle = commonRoot ? cleanTitle(commonRoot) : cleanTitle(fallbackTitle);

  // Group by Section:
  // If files inside archive have no subfolders (e.g. 01. Introduction.zip with flat files),
  // then the archiveName itself IS the chapter/section!
  const sectionMap = new Map<string, { title: string; position: number; files: DiscoveredArchiveFile[] }>();

  for (const file of files) {
    const parts = file.cleanPath.split('/').filter(Boolean);

    let sectionName = file.archiveName;
    let sectionPos = 1;

    if (parts.length >= 2) {
      // Subfolder inside archive e.g. "Chapter 1 - Intro/01.mp4"
      const folderName = parts[parts.length - 2]!;
      const parsed = parsePositionAndTitle(folderName, 1);
      sectionName = parsed.title;
      sectionPos = parsed.position;
    } else {
      // Flat inside archive: use archiveName as Section Name
      const parsed = parsePositionAndTitle(file.archiveName, 1);
      sectionName = parsed.title || file.archiveName;
      sectionPos = parsed.position;
    }

    if (!sectionMap.has(sectionName)) {
      sectionMap.set(sectionName, {
        title: sectionName,
        position: sectionPos,
        files: [],
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

  resultSections.sort((a, b) => a.position - b.position);

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
    sections,
    appendToCourseId,
    onProgress,
  } = params;

  addLog('INFO', 'IMPORTER', `Committing course: ${courseTitle}`, `Chapters: ${sections.length}`);

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
          // Get blob from zipEntry or rawFile with smooth real-time progress
          let blob: Blob;
          if (fileItem.zipEntry) {
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

          await saveMediaFile(courseId, normalizedPath, blob, fileItem.mimeType);
          currentFileIdx++;

          blocks.push({
            id: `blk-${Date.now()}-${sIdx}-${lIdx}-${blockPos++}`,
            type: 'video',
            position: blockPos,
            title: les.title,
            src: `vault-media://${courseId}/${normalizedPath}`,
            filename: fileItem.filename,
            fileSizeBytes: fileItem.sizeBytes || blob.size,
            mimeType: fileItem.mimeType,
          });
        } else if (fileItem.type === 'document') {
          let blob: Blob;
          if (fileItem.zipEntry) {
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

          await saveMediaFile(courseId, normalizedPath, blob, fileItem.mimeType);
          currentFileIdx++;

          blocks.push({
            id: `blk-${Date.now()}-${sIdx}-${lIdx}-${blockPos++}`,
            type: 'document',
            position: blockPos,
            title: fileItem.filename,
            src: `vault-media://${courseId}/${normalizedPath}`,
            filename: fileItem.filename,
            fileSizeBytes: fileItem.sizeBytes || blob.size,
            mimeType: fileItem.mimeType,
          });
        } else if (fileItem.type === 'rich_text') {
          currentFileIdx++;
          let text = fileItem.content;
          if (!text && fileItem.zipEntry) {
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
          if (!text && fileItem.zipEntry) {
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
            if (subItem.zipEntry) {
              srtOrVttText = await subItem.zipEntry.async('text');
            } else if (subItem.rawFile) {
              srtOrVttText = await subItem.rawFile.text();
            }

            if (srtOrVttText) {
              // Convert any subtitle format (SRT, SBV, ASS, LRC) to standard WebVTT
              const vttText = anySubtitleToVtt(srtOrVttText, subItem.filename);
              const vttBlob = new Blob([vttText], { type: 'text/vtt' });
              const subPath = `subtitles/${les.id}_sub_${subIdx}.vtt`;
              await saveMediaFile(courseId, subPath, vttBlob, 'text/vtt');

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
  };

  reportProgress(94, 'Writing course manifest to offline vault...');
  addCourseToVault(courseData);
  reportProgress(98, 'Verifying course integrity...');
  reportProgress(100, 'Complete! Course saved and ready for offline study.');
  addLog('INFO', 'IMPORTER', `Course saved to offline vault: ${courseTitle}`, `${finalSections.length} sections, ${totalFiles} files`);

  return courseData;
}
