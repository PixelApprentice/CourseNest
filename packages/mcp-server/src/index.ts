#!/usr/bin/env node
/**
 * CourseNest Model Context Protocol (MCP) Server
 * Connects Claude, Gemini CLI, Cursor, or any MCP client directly to CourseNest's offline vault.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

// Pre-bundled fallback courses catalog (initialized empty in clean local-first vault state)
const CATALOG_COURSES: any[] = [];

// Persistent file storage paths
const HOME = process.env['HOME'] || process.env['USERPROFILE'] || '.';
const NOTES_FILE = path.resolve(HOME, '.coursenest-notes.json');
const FLASHCARDS_FILE = path.resolve(HOME, '.coursenest-flashcards.json');
const PROGRESS_FILE = path.resolve(HOME, '.coursenest-progress.json');

function getVaultSearchPaths(): string[] {
  const paths = [
    process.env['COURSENEST_VAULT_FILE'],
    process.env['COURSENEST_VAULT_PATH'] ? path.join(process.env['COURSENEST_VAULT_PATH'], 'coursenest_vault_courses.json') : undefined,
    path.join(HOME, '.config', 'CourseNest', 'coursenest_vault_courses.json'),
    path.join(HOME, 'Library', 'Application Support', 'CourseNest', 'coursenest_vault_courses.json'),
    process.env['APPDATA'] ? path.join(process.env['APPDATA'], 'CourseNest', 'coursenest_vault_courses.json') : undefined,
    path.resolve('.', 'coursenest_vault_courses.json'),
  ].filter((p): p is string => Boolean(p));
  return paths;
}

function loadAllCourses(): any[] {
  const coursesMap = new Map<string, any>();

  // 1. Add default catalog courses
  for (const c of CATALOG_COURSES) {
    coursesMap.set(c.id.toLowerCase(), c);
  }

  // 2. Discover courses from Electron vault storage
  for (const p of getVaultSearchPaths()) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          for (const c of list) {
            if (c && c.id) {
              coursesMap.set(c.id.toLowerCase(), {
                id: c.id,
                title: c.title || 'Untitled Course',
                description: c.description || '',
                instructorName: c.instructorName || 'Unknown Instructor',
                subject: c.subject || 'General',
                tags: Array.isArray(c.tags) ? c.tags : [],
                estimatedDurationMinutes: c.estimatedDurationMinutes || 120,
                sections: Array.isArray(c.sections) ? c.sections : [],
              });
            }
          }
        }
      }
    } catch {}
  }

  return Array.from(coursesMap.values());
}

function loadUserNotes(): Record<string, string> {
  try {
    if (fs.existsSync(NOTES_FILE)) {
      return JSON.parse(fs.readFileSync(NOTES_FILE, 'utf-8'));
    }
  } catch {}
  return {};
}

function saveUserNotes(notes: Record<string, string>): void {
  try {
    fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2), 'utf-8');
  } catch {}
}

function loadFlashcards(): any[] {
  try {
    if (fs.existsSync(FLASHCARDS_FILE)) {
      return JSON.parse(fs.readFileSync(FLASHCARDS_FILE, 'utf-8'));
    }
  } catch {}
  return [];
}

function saveFlashcards(cards: any[]): void {
  try {
    fs.writeFileSync(FLASHCARDS_FILE, JSON.stringify(cards, null, 2), 'utf-8');
  } catch {}
}

function loadProgress(): Record<string, any> {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    }
  } catch {}
  return {};
}

// -----------------------------------------------------------------------------
// MCP Server Initialization
// -----------------------------------------------------------------------------
const server = new McpServer({
  name: 'coursenest-server',
  version: '2.1.0',
});

// Tool 1: List Courses
server.tool(
  'coursenest_list_courses',
  'List all courses currently available in the CourseNest offline learning vault.',
  {
    search: z.string().optional().describe('Optional keyword filter to search course titles, instructors, or tags'),
  },
  async ({ search }) => {
    let courses = loadAllCourses();
    if (search) {
      const q = search.toLowerCase();
      courses = courses.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.subject.toLowerCase().includes(q) ||
          c.instructorName.toLowerCase().includes(q) ||
          c.tags.some((t: string) => t.toLowerCase().includes(q))
      );
    }

    const formatted = courses.map((c) => ({
      id: c.id,
      title: c.title,
      instructor: c.instructorName,
      subject: c.subject,
      durationHours: (c.estimatedDurationMinutes / 60).toFixed(1),
      sectionCount: c.sections?.length || 0,
      lessonCount: (c.sections || []).reduce((acc: number, s: any) => acc + (s.lessons?.length || 0), 0),
      tags: c.tags,
      description: c.description,
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(formatted, null, 2),
        },
      ],
    };
  }
);

// Tool 2: Get Course Curriculum
server.tool(
  'coursenest_get_curriculum',
  'Get the complete syllabus and chapter breakdown of a course in CourseNest.',
  {
    courseId: z.string().describe('ID of the course (e.g. "cs101" or "ml201")'),
  },
  async ({ courseId }) => {
    const courses = loadAllCourses();
    const course = courses.find((c) => c.id.toLowerCase() === courseId.toLowerCase());
    if (!course) {
      return {
        content: [
          {
            type: 'text',
            text: `Course not found with ID "${courseId}". Use coursenest_list_courses to inspect available courses.`,
          },
        ],
      };
    }

    const outline = {
      courseId: course.id,
      title: course.title,
      instructor: course.instructorName,
      totalDurationHours: (course.estimatedDurationMinutes / 60).toFixed(1),
      sections: (course.sections || []).map((s: any) => ({
        sectionId: s.id,
        title: s.title,
        description: s.description,
        lessons: (s.lessons || []).map((l: any) => ({
          lessonId: l.id,
          title: l.title,
          description: l.description,
          durationMinutes: l.durationMinutes || l.estimatedDurationMinutes || 30,
        })),
      })),
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(outline, null, 2),
        },
      ],
    };
  }
);

// Tool 3: Get Lesson Content & Lecture Transcript
server.tool(
  'coursenest_get_lesson',
  'Retrieve the lecture transcript, study notes, and code snippets for a specific lesson.',
  {
    courseId: z.string().describe('Course identifier (e.g. "cs101")'),
    lessonId: z.string().describe('Lesson identifier (e.g. "les-1-1")'),
  },
  async ({ courseId, lessonId }) => {
    const courses = loadAllCourses();
    const course = courses.find((c) => c.id.toLowerCase() === courseId.toLowerCase());
    if (!course) {
      return {
        content: [{ type: 'text', text: `Course "${courseId}" not found.` }],
      };
    }

    for (const sec of course.sections || []) {
      const les = (sec.lessons || []).find((l: any) => l.id.toLowerCase() === lessonId.toLowerCase());
      if (les) {
        const userNotes = loadUserNotes()[`${course.id}:${les.id}`] || les.notes || '';
        const transcript = les.transcript || (les.blocks || []).find((b: any) => b.type === 'rich_text' || b.content)?.content || '';
        const codeSnippet = les.codeSnippet || (les.blocks || []).find((b: any) => b.type === 'code_snippet' || b.code)?.code || null;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  courseId: course.id,
                  courseTitle: course.title,
                  sectionTitle: sec.title,
                  lessonId: les.id,
                  title: les.title,
                  durationMinutes: les.durationMinutes || les.estimatedDurationMinutes || 30,
                  spokenLectureTranscript: transcript,
                  codeSnippet: codeSnippet,
                  studentNotes: userNotes,
                },
                null,
                2
              ),
            },
          ],
        };
      }
    }

    return {
      content: [{ type: 'text', text: `Lesson "${lessonId}" not found in course "${courseId}".` }],
    };
  }
);

// Tool 4: Search Library
server.tool(
  'coursenest_search',
  'Search across all course titles, lecture transcripts with timestamps, and study notes.',
  {
    query: z.string().describe('Search keyword or phrase (e.g. "cache line", "page fault", "SGD")'),
  },
  async ({ query }) => {
    const q = query.toLowerCase();
    const results: Array<{
      courseId: string;
      courseTitle: string;
      lessonId: string;
      lessonTitle: string;
      matchType: string;
      snippet: string;
    }> = [];

    const courses = loadAllCourses();
    for (const c of courses) {
      for (const s of c.sections || []) {
        for (const l of s.lessons || []) {
          if (l.title.toLowerCase().includes(q) || (l.description && l.description.toLowerCase().includes(q))) {
            results.push({
              courseId: c.id,
              courseTitle: c.title,
              lessonId: l.id,
              lessonTitle: l.title,
              matchType: 'Lesson Title/Description',
              snippet: l.description || l.title,
            });
          }

          const transcript = l.transcript || '';
          if (transcript.toLowerCase().includes(q)) {
            const lines = transcript.split('\n');
            const matchedLines = lines.filter((line: string) => line.toLowerCase().includes(q));
            for (const line of matchedLines.slice(0, 2)) {
              results.push({
                courseId: c.id,
                courseTitle: c.title,
                lessonId: l.id,
                lessonTitle: l.title,
                matchType: 'Lecture Transcript',
                snippet: line,
              });
            }
          }
        }
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ query, totalMatches: results.length, matches: results }, null, 2),
        },
      ],
    };
  }
);

// Tool 5: Save Study Note
server.tool(
  'coursenest_save_note',
  'Save or append a study note or key formula to a lesson in the CourseNest vault.',
  {
    courseId: z.string().describe('Course ID (e.g. "cs101")'),
    lessonId: z.string().describe('Lesson ID (e.g. "les-1-1")'),
    noteText: z.string().describe('Text of the note to append or save'),
  },
  async ({ courseId, lessonId, noteText }) => {
    const notes = loadUserNotes();
    const key = `${courseId}:${lessonId}`;
    const existing = notes[key] || '';
    const updated = existing ? `${existing}\n\n[AI Note Added ${new Date().toLocaleTimeString()}]:\n${noteText}` : noteText;
    notes[key] = updated;
    saveUserNotes(notes);

    return {
      content: [
        {
          type: 'text',
          text: `Successfully saved study note to Course ${courseId}, Lesson ${lessonId}. Total note length: ${updated.length} chars.`,
        },
      ],
    };
  }
);

// Tool 6: Get Course Progress
server.tool(
  'coursenest_get_progress',
  'Retrieve the student learning progress, completed lessons, and overall completion percent for a course.',
  {
    courseId: z.string().describe('Course ID to query progress for'),
  },
  async ({ courseId }) => {
    const courses = loadAllCourses();
    const course = courses.find((c) => c.id.toLowerCase() === courseId.toLowerCase());
    if (!course) {
      return {
        content: [{ type: 'text', text: `Course "${courseId}" not found in vault.` }],
      };
    }

    const allLessons: string[] = [];
    for (const sec of course.sections || []) {
      for (const les of sec.lessons || []) {
        allLessons.push(les.id);
      }
    }

    const progressData = loadProgress();
    const courseProgress = progressData[course.id] || { completedLessons: [] };
    const completedCount = (courseProgress.completedLessons || []).length;
    const totalLessons = allLessons.length;
    const percent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              courseId: course.id,
              courseTitle: course.title,
              totalLessons,
              completedLessonsCount: completedCount,
              progressPercent: percent,
              isCompleted: percent >= 100,
              completedLessonIds: courseProgress.completedLessons || [],
              lastActive: courseProgress.lastActive || new Date().toISOString(),
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// Tool 7: Create Active Recall Flashcard
server.tool(
  'coursenest_create_flashcard',
  'Create and save a high-yield study flashcard to the student review vault.',
  {
    courseId: z.string().describe('Course ID associated with this flashcard'),
    lessonId: z.string().optional().describe('Optional lesson ID for attribution'),
    question: z.string().describe('The prompt or test question (front of card)'),
    answer: z.string().describe('The concise explanation or solution (back of card)'),
    topic: z.string().optional().describe('Subject or concept topic'),
    hint: z.string().optional().describe('Optional clue before flipping the card'),
  },
  async ({ courseId, lessonId, question, answer, topic, hint }) => {
    const cards = loadFlashcards();
    const newCard = {
      id: `fc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      courseId,
      lessonId: lessonId || 'general',
      question,
      answer,
      topic: topic || 'General Review',
      hint: hint || '',
      createdAt: new Date().toISOString(),
    };
    cards.unshift(newCard);
    saveFlashcards(cards);

    return {
      content: [
        {
          type: 'text',
          text: `Flashcard created and saved successfully! ID: ${newCard.id}\nQuestion: "${question}"`,
        },
      ],
    };
  }
);

// Tool 8: Get Flashcards
server.tool(
  'coursenest_get_flashcards',
  'Retrieve active recall flashcards from the student review vault.',
  {
    courseId: z.string().optional().describe('Filter flashcards by course ID'),
  },
  async ({ courseId }) => {
    let cards = loadFlashcards();
    if (courseId) {
      cards = cards.filter((c) => c.courseId.toLowerCase() === courseId.toLowerCase());
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ total: cards.length, flashcards: cards }, null, 2),
        },
      ],
    };
  }
);

// Resources
server.resource(
  'catalog',
  'coursenest://courses',
  async () => ({
    contents: [
      {
        uri: 'coursenest://courses',
        mimeType: 'application/json',
        text: JSON.stringify(loadAllCourses(), null, 2),
      },
    ],
  })
);

// Start server on stdio
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('CourseNest MCP Server v2.1.0 running on stdio');
}

main().catch((err) => {
  console.error('Fatal MCP Server error:', err);
  process.exit(1);
});
