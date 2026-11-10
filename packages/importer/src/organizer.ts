export interface ParsedHierarchy {
  suggestedSectionTitle: string;
  sectionPosition: number;
  suggestedLessonTitle: string;
  lessonPosition: number;
}

/**
 * Strips file extension from filename.
 */
export function stripExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx > 0 ? filename.slice(0, idx) : filename;
}

const SECTION_KEYWORDS = ['week', 'chapter', 'section', 'module', 'part', 'lecture', 'episode', 'session', 'unit', 'sec', 'ch', 'vol', 'volume'];

/**
 * Finds the longest common prefix across a list of file or archive names.
 * Strips extensions first and trims trailing separator characters (-, _, ., space)
 * and trailing section keywords (Part, Chapter, etc.) so the course title is clean.
 */
export function findLongestCommonPrefix(names: string[]): string {
  if (!names || names.length === 0) return '';
  const cleanNames = names.map((n) => stripExtension(n).trim()).filter(Boolean);
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

  // Trim trailing separators (- , _ , . , whitespace)
  prefix = prefix.replace(/[\s._-]+$/, '').trim();

  // If prefix ends with a section keyword (e.g. "Python Full Stack Course Part"), strip the keyword
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

/**
 * Cleans section title and extracts numeric ordering.
 * - Strips common prefix if provided
 * - Detects numbering patterns (part, lecture, module, chapter, episode, 01, 02) anywhere in string (Review Item 17)
 * - Returns clean human-readable title and numeric position
 */
export function cleanSectionTitleAndPosition(
  rawName: string,
  commonPrefix: string = '',
  defaultPosition: number = 1,
): { position: number; cleanTitle: string } {
  let name = stripExtension(rawName).trim();

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
  // Matches "Part 1", "Week 2", "Python Course Part 1", "Module 03 - Advanced", etc.
  const patternKeyword = /(?:^|[\s._:-]+)(Week|Chapter|Section|Module|Part|Lecture|Episode|Session|Unit|Sec|Ch|Vol|Volume)[\s._:-]*(\d+)(.*)$/i;
  const matchKeyword = name.match(patternKeyword);
  if (matchKeyword && matchKeyword[1] && matchKeyword[2]) {
    const pos = parseInt(matchKeyword[2], 10);
    const keyword = matchKeyword[1].charAt(0).toUpperCase() + matchKeyword[1].slice(1).toLowerCase();
    const rest = (matchKeyword[3] || '').replace(/^[\s._:-]+/, '').trim();
    const title = rest ? `${keyword} ${matchKeyword[2]} - ${rest}` : `${keyword} ${parseInt(matchKeyword[2], 10)}`;
    return {
      position: isNaN(pos) ? defaultPosition : pos,
      cleanTitle: title.trim(),
    };
  }

  // 3. Leading digit: "01 - Introduction" or "01. Introduction"
  const patternLeadingDigit = /^(\d+)[\s._-]+(.*)$/;
  const matchLeading = name.match(patternLeadingDigit);
  if (matchLeading && matchLeading[1] && matchLeading[2]) {
    const pos = parseInt(matchLeading[1], 10);
    const cleanTitle = matchLeading[2].replace(/[_-]+/g, ' ').trim();
    return {
      position: isNaN(pos) ? defaultPosition : pos,
      cleanTitle: cleanTitle || name,
    };
  }

  // 4. Trailing digit: "Introduction - 01" or "Basics_2"
  const patternTrailingDigit = /^(.*?)[\\s._-]+(\d+)$/;
  const matchTrailing = name.match(patternTrailingDigit);
  if (matchTrailing && matchTrailing[1] && matchTrailing[2]) {
    const pos = parseInt(matchTrailing[2], 10);
    const cleanTitle = matchTrailing[1].replace(/[_-]+/g, ' ').trim();
    return {
      position: isNaN(pos) ? defaultPosition : pos,
      cleanTitle: cleanTitle || name,
    };
  }

  // 5. Fallback: Clean separators
  const fallbackClean = name.replace(/[_-]+/g, ' ').trim();
  return {
    position: defaultPosition,
    cleanTitle: fallbackClean || `Section ${defaultPosition}`,
  };
}

/**
 * Deterministically parse numbered name with backward compatibility.
 */
export function parseNumberedName(rawName: string, defaultPosition: number): { position: number; cleanTitle: string } {
  return cleanSectionTitleAndPosition(rawName, '', defaultPosition);
}

/**
 * Deterministically parse section and lesson names and ordering from file paths.
 */
export function inferHierarchyFromPath(relativePath: string): ParsedHierarchy {
  const parts = relativePath.split('/').filter(Boolean);

  if (parts.length >= 2) {
    const folderName = parts[parts.length - 2]!;
    const fileName = parts[parts.length - 1]!;

    const section = cleanSectionTitleAndPosition(folderName, '', 1);
    const lesson = cleanSectionTitleAndPosition(stripExtension(fileName), '', 1);

    return {
      suggestedSectionTitle: section.cleanTitle,
      sectionPosition: section.position,
      suggestedLessonTitle: lesson.cleanTitle,
      lessonPosition: lesson.position,
    };
  }

  // Single file at root
  const fileName = parts[0] ?? 'Untitled';
  const lesson = cleanSectionTitleAndPosition(stripExtension(fileName), '', 1);

  return {
    suggestedSectionTitle: 'General',
    sectionPosition: 1,
    suggestedLessonTitle: lesson.cleanTitle,
    lessonPosition: lesson.position,
  };
}
