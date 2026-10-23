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

// Pre-bundled fallback courses catalog for instant zero-config operation
const CATALOG_COURSES = [
  {
    id: 'cs101',
    title: 'CS 101: Systems Programming & Operating Principles',
    description: 'Comprehensive undergraduate systems programming course covering computer architecture, memory hierarchies, virtual memory paging, multithreading, and process synchronization.',
    instructorName: 'Dr. Elena Rostova',
    subject: 'Computer Science',
    tags: ['Operating Systems', 'Systems', 'C', 'Architecture', 'Virtual Memory'],
    estimatedDurationMinutes: 360,
    sections: [
      {
        id: 'sec-arch',
        title: 'Section 1: Architecture & Execution Models',
        description: 'Hardware foundations, register files, cache hierarchies, and instruction pipelining.',
        lessons: [
          {
            id: 'les-1-1',
            title: '1.1 Memory Hierarchy & CPU Registers',
            description: 'Examines L1/L2/L3 caches, register sets, and latency numbers every programmer should know.',
            durationMinutes: 35,
            transcript: `[00:00] Welcome back to Systems Programming. Today we dive into the physical reality of CPU memory hierarchies.
[00:25] We often treat memory as a uniform flat array of bytes in high-level programming.
[00:52] But in hardware physics, accessing a register takes less than half a nanosecond (1 cycle).
[01:15] Accessing L1 Cache takes 4 cycles (~1 ns). L2 Cache takes 10 cycles (~4 ns).
[01:45] Main RAM takes between 60 to 100 nanoseconds! That is 200 times slower than L1 cache.
[02:18] To bridge this massive 'Memory Wall', modern architectures transfer memory in 64-byte chunks called cache lines.
[02:55] When your code exhibits high spatial locality, adjacent elements are pre-loaded automatically into L1 cache.
[03:30] Let us examine the C benchmark on screen measuring latency across different stride lengths.
[04:10] In the next unit, we will explore multithreaded synchronization barriers.`,
            codeSnippet: `#include <stdio.h>\n#include <stdlib.h>\n\nvoid benchmark_stride(int bytes, int stride) {\n    int count = bytes / sizeof(int);\n    int *buf = malloc(bytes);\n    for (int i = 0; i < count; i += stride) buf[i] = i;\n    free(buf);\n}`,
            notes: 'Remember: CPU cache line is 64 bytes. Stride access larger than 64 bytes causes compulsory cache misses.',
          },
          {
            id: 'les-1-2',
            title: '1.2 Concurrency, Threads & Race Conditions',
            description: 'Understanding mutexes, semaphores, atomic operations, and memory barriers.',
            durationMinutes: 45,
            transcript: `[00:00] In this lecture, we tackle concurrent execution and race conditions.
[00:40] A race condition happens when two threads access shared memory concurrently and at least one is a write.
[01:20] Mutual exclusion (mutex) guarantees that only one thread enters the critical section at a time.
[02:10] Be cautious of deadlocks: check Coffman conditions (Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait).
[03:00] Atomic test-and-set instructions provide hardware-level synchronization without OS context switch overhead.`,
            notes: 'Deadlock checklist: verify lock acquisition ordering is strictly monotonic across all worker threads.',
          },
        ],
      },
      {
        id: 'sec-mem',
        title: 'Section 2: Virtual Memory & Address Translation',
        description: 'Page tables, TLBs, page faults, and physical memory frames.',
        lessons: [
          {
            id: 'les-2-1',
            title: '2.1 Paging & Page Tables',
            description: 'Multi-level hierarchical page tables and virtual-to-physical address translation.',
            durationMinutes: 40,
            transcript: `[00:00] Virtual memory decouples process address space from physical RAM frames.
[01:00] A standard x86-64 page is 4 Kilobytes (4096 bytes).
[01:50] The Translation Lookaside Buffer (TLB) caches recent translations to avoid multiple memory lookups.
[02:40] A page fault triggers an OS trap, bringing the requested frame from disk or swap into physical RAM.`,
            notes: 'Virtual memory isolates processes and prevents unauthorized memory accesses.',
          },
        ],
      },
    ],
  },
  {
    id: 'ml201',
    title: 'Machine Learning: Algorithms & Inference',
    description: 'Foundations of statistical inference, gradient descent optimization, backpropagation, and transformer attention mechanisms.',
    instructorName: 'Prof. Marcus Vance',
    subject: 'Artificial Intelligence',
    tags: ['Machine Learning', 'AI', 'Optimization', 'Neural Networks', 'Transformers'],
    estimatedDurationMinutes: 420,
    sections: [
      {
        id: 'sec-opt',
        title: 'Section 1: Optimization & Loss Functions',
        description: 'Convex optimization, stochastic gradient descent, and momentum.',
        lessons: [
          {
            id: 'les-ml-1',
            title: '1.1 Stochastic Gradient Descent & Learning Rates',
            description: 'Mathematical derivation of gradient descent update rules and adaptive learning rate schedulers.',
            durationMinutes: 45,
            transcript: `[00:00] Welcome to Machine Learning Inference. Today we analyze loss landscapes and stochastic gradient descent.
[00:45] The weight update rule is W_new = W_old - alpha * grad(Loss).
[01:30] Momentum accelerates convergence through valleys while dampening oscillations across steep ravines.
[02:15] Adam optimizer maintains running estimates of both first (mean) and second (uncentered variance) moments.`,
            notes: 'Adam default beta1=0.9, beta2=0.999, epsilon=1e-8.',
          },
        ],
      },
    ],
  },
];

// Persistent user notes storage file path for MCP interactions
const NOTES_FILE = path.resolve(
  process.env['HOME'] || process.env['USERPROFILE'] || '.',
  '.coursenest-notes.json'
);

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

// -----------------------------------------------------------------------------
// MCP Server Initialization
// -----------------------------------------------------------------------------
const server = new McpServer({
  name: 'coursenest-server',
  version: '0.1.0',
});

// Tool 1: List Courses
server.tool(
  'coursenest_list_courses',
  'List all courses currently available in the CourseNest offline learning vault.',
  {
    search: z.string().optional().describe('Optional keyword filter to search course titles, instructors, or tags'),
  },
  async ({ search }) => {
    let courses = CATALOG_COURSES;
    if (search) {
      const q = search.toLowerCase();
      courses = courses.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.subject.toLowerCase().includes(q) ||
          c.instructorName.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    const formatted = courses.map((c) => ({
      id: c.id,
      title: c.title,
      instructor: c.instructorName,
      subject: c.subject,
      durationHours: (c.estimatedDurationMinutes / 60).toFixed(1),
      sectionCount: c.sections.length,
      lessonCount: c.sections.reduce((acc, s) => acc + s.lessons.length, 0),
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
    const course = CATALOG_COURSES.find((c) => c.id.toLowerCase() === courseId.toLowerCase());
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
      sections: course.sections.map((s) => ({
        sectionId: s.id,
        title: s.title,
        description: s.description,
        lessons: s.lessons.map((l) => ({
          lessonId: l.id,
          title: l.title,
          description: l.description,
          durationMinutes: l.durationMinutes,
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
    const course = CATALOG_COURSES.find((c) => c.id.toLowerCase() === courseId.toLowerCase());
    if (!course) {
      return {
        content: [{ type: 'text', text: `Course "${courseId}" not found.` }],
      };
    }

    for (const sec of course.sections) {
      const les = sec.lessons.find((l) => l.id.toLowerCase() === lessonId.toLowerCase());
      if (les) {
        const userNotes = loadUserNotes()[`${course.id}:${les.id}`] || les.notes || '';
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
                  durationMinutes: les.durationMinutes,
                  spokenLectureTranscript: les.transcript || '',
                  codeSnippet: les.codeSnippet || null,
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

    for (const c of CATALOG_COURSES) {
      for (const s of c.sections) {
        for (const l of s.lessons) {
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

          if (l.transcript && l.transcript.toLowerCase().includes(q)) {
            const lines = l.transcript.split('\n');
            const matchedLines = lines.filter((line) => line.toLowerCase().includes(q));
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

// Resources
server.resource(
  'catalog',
  'coursenest://courses',
  async () => ({
    contents: [
      {
        uri: 'coursenest://courses',
        mimeType: 'application/json',
        text: JSON.stringify(CATALOG_COURSES, null, 2),
      },
    ],
  })
);

// Start server on stdio
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('CourseNest MCP Server running on stdio');
}

main().catch((err) => {
  console.error('Fatal MCP Server error:', err);
  process.exit(1);
});
