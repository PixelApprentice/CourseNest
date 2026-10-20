export interface ParsedHierarchy {
  suggestedSectionTitle: string;
  sectionPosition: number;
  suggestedLessonTitle: string;
  lessonPosition: number;
}

/**
 * Deterministically parse section and lesson names and ordering from file paths.
 * Examples:
 *   "01 - Basics/02 - Variables.mp4" -> Section: "Basics" (pos 1), Lesson: "Variables" (pos 2)
 *   "Week 1/Lecture 1 - Overview.pdf" -> Section: "Week 1" (pos 1), Lesson: "Overview" (pos 1)
 */
export function inferHierarchyFromPath(relativePath: string): ParsedHierarchy {
  const parts = relativePath.split('/').filter(Boolean);

  if (parts.length >= 2) {
    const folderName = parts[parts.length - 2]!;
    const fileName = parts[parts.length - 1]!;

    const section = parseNumberedName(folderName, 1);
    const lesson = parseNumberedName(stripExtension(fileName), 1);

    return {
      suggestedSectionTitle: section.cleanTitle,
      sectionPosition: section.position,
      suggestedLessonTitle: lesson.cleanTitle,
      lessonPosition: lesson.position,
    };
  }

  // Single file at root
  const fileName = parts[0] ?? 'Untitled';
  const lesson = parseNumberedName(stripExtension(fileName), 1);

  return {
    suggestedSectionTitle: 'General',
    sectionPosition: 1,
    suggestedLessonTitle: lesson.cleanTitle,
    lessonPosition: lesson.position,
  };
}

export function stripExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx > 0 ? filename.slice(0, idx) : filename;
}

export function parseNumberedName(rawName: string, defaultPosition: number): { position: number; cleanTitle: string } {
  // Matches "01 - Title", "01. Title", "01_Title", "1. Title", "Week 1 - Title"
  const match = rawName.match(/^(?:(?:Week|Chapter|Section|Module|Part|Lecture)\s*)?(\d+)[\s._-]+(.*)$/i);

  if (match && match[1] && match[2]) {
    const position = parseInt(match[1], 10);
    const cleanTitle = match[2].trim() || rawName;
    return { position: isNaN(position) ? defaultPosition : position, cleanTitle };
  }

  return { position: defaultPosition, cleanTitle: rawName };
}
