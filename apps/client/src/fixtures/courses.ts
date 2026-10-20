import type { Course, Section, Lesson, ContentBlock, Activity } from '@coursenest/domain';
import { 
  DownloadStatus, 
  ContentBlockType, 
  LessonCompletionPolicy, 
  QuestionType,
  createId 
} from '@coursenest/domain';

export interface FixtureCourseData {
  course: Course;
  sections: Array<{
    section: Section;
    lessons: Array<{
      lesson: Lesson;
      blocks: ContentBlock[];
      activity?: Activity;
    }>;
  }>;
}

export const DEMO_COURSES: FixtureCourseData[] = [
  {
    course: {
      id: createId('course-cs101'),
      title: 'CS 101: Systems Programming & Operating Principles',
      description: 'A comprehensive university introduction to computer architecture, processes, memory management, virtual memory, concurrency, and file systems.',
      language: 'en',
      instructorName: 'Prof. Elena Rostova',
      subject: 'Computer Science',
      tags: ['Operating Systems', 'Systems', 'C', 'Architecture'],
      estimatedDurationMinutes: 360,
      learningObjectives: [
        'Understand the Von Neumann architecture and CPU execution cycle',
        'Analyze process states, context switching, and concurrency primitives',
        'Master virtual memory paging, page tables, and address translation',
        'Implement safe memory management and avoid buffer overflows',
      ],
      localAvailability: DownloadStatus.Downloaded,
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-10-15T14:30:00Z',
    },
    sections: [
      {
        section: {
          id: createId('sec-arch'),
          courseVersionId: createId('ver-1'),
          title: 'Section 1: Architecture & Execution Models',
          description: 'Hardware foundations, register files, cache hierarchies, and instruction pipelining.',
          position: 1,
          estimatedDurationMinutes: 120,
          isOptional: false,
          prerequisiteSectionIds: [],
        },
        lessons: [
          {
            lesson: {
              id: createId('les-1-1'),
              sectionId: createId('sec-arch'),
              title: '1.1 Memory Hierarchy & CPU Registers',
              description: 'Examines L1/L2/L3 caches, register sets, and latency numbers every programmer should know.',
              learningObjectives: [
                'Distinguish cache lines from memory words',
                'Calculate effective memory access time',
              ],
              position: 1,
              estimatedDurationMinutes: 35,
              completionPolicy: LessonCompletionPolicy.AllBlocksCompleted,
              isRequired: true,
              prerequisiteLessonIds: [],
              revision: 1,
            },
            blocks: [
              {
                id: createId('blk-1-1-v1'),
                lessonId: createId('les-1-1'),
                type: ContentBlockType.Video,
                position: 1,
                displayMetadata: {
                  title: 'Lecture: Hardware Foundations & The Memory Wall',
                  durationSeconds: 1240,
                  src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                },
                isRequired: true,
                schemaVersion: '1.0.0',
              },
              {
                id: createId('blk-1-1-t1'),
                lessonId: createId('les-1-1'),
                type: ContentBlockType.RichText,
                position: 2,
                displayMetadata: {
                  content: `### Latency Numbers Every Systems Engineer Should Know\n\nAccessing CPU registers occurs in less than **1 cycle (~0.5 ns)**. In contrast, retrieving data from **L1 Cache** requires approximately 4 cycles (1 ns), **L2 Cache** roughly 10 cycles, and **Main RAM** between 60–100 ns.\n\nNotice the orders of magnitude difference:\n- **L1 Cache Reference:** 1 ns\n- **Branch Mispredict:** 3 ns\n- **L2 Cache Reference:** 4 ns\n- **Mutex Lock/Unlock:** 17 ns\n- **Main Memory Reference:** 100 ns\n- **Read 1MB sequentially from SSD:** 16,000 ns\n- **Read 1MB sequentially from Disk:** 2,000,000 ns`,
                },
                isRequired: false,
                schemaVersion: '1.0.0',
              },
              {
                id: createId('blk-1-1-d1'),
                lessonId: createId('les-1-1'),
                type: ContentBlockType.Document,
                position: 3,
                displayMetadata: {
                  filename: 'CS101_Lecture01_Architecture_Diagrams.pdf',
                  fileSizeBytes: 3450000,
                  mimeType: 'application/pdf',
                  description: 'Detailed schematic diagrams of superscalar execution and cache topologies.',
                },
                isRequired: false,
                schemaVersion: '1.0.0',
              },
              {
                id: createId('blk-1-1-dl1'),
                lessonId: createId('les-1-1'),
                type: ContentBlockType.Download,
                position: 4,
                displayMetadata: {
                  filename: 'cache_simulator_starter.tar.gz',
                  fileSizeBytes: 1820000,
                  mimeType: 'application/gzip',
                  checksumSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
                  description: 'C simulation lab files for direct-mapped and 4-way set associative caches.',
                },
                isRequired: false,
                schemaVersion: '1.0.0',
              },
            ],
          },
          {
            lesson: {
              id: createId('les-1-2'),
              sectionId: createId('sec-arch'),
              title: '1.2 Concurrency, Threads & Race Conditions',
              description: 'Understanding mutexes, semaphores, atomic operations, and memory barriers.',
              learningObjectives: [
                'Identify data races and critical sections',
                'Apply atomic primitives to multithreaded workflows',
              ],
              position: 2,
              estimatedDurationMinutes: 45,
              completionPolicy: LessonCompletionPolicy.RequiredBlocksCompleted,
              isRequired: true,
              prerequisiteLessonIds: [createId('les-1-1')],
              revision: 1,
            },
            blocks: [
              {
                id: createId('blk-1-2-t1'),
                lessonId: createId('les-1-2'),
                type: ContentBlockType.RichText,
                position: 1,
                displayMetadata: {
                  content: `### Critical Sections and Mutex Locks\n\nA **data race** occurs when two or more concurrent threads access the same memory location concurrently, and at least one access is a write, without synchronization.\n\nTo prevent corruption:\n1. Identify the critical section\n2. Guard with a POSIX pthread mutex or spinlock\n3. Ensure lock acquisition order is strictly monotonic to prevent deadlocks!`,
                },
                isRequired: true,
                schemaVersion: '1.0.0',
              },
              {
                id: createId('blk-1-2-q1'),
                lessonId: createId('les-1-2'),
                type: ContentBlockType.Quiz,
                position: 2,
                activityId: createId('act-quiz-1'),
                displayMetadata: {
                  title: 'Checkpoint Quiz: Concurrency & Synchronization',
                },
                isRequired: true,
                schemaVersion: '1.0.0',
              },
            ],
            activity: {
              id: createId('act-quiz-1'),
              type: 'quiz',
              title: 'Checkpoint Quiz: Concurrency & Synchronization',
              description: 'Test your understanding of threads, locks, and atomic instructions.',
              maxAttempts: 3,
              passingScore: 70,
              isRequired: true,
              questions: [
                {
                  id: 'q1',
                  type: QuestionType.MultipleChoice,
                  text: 'Which of the following conditions is NOT required for a deadlock to occur?',
                  points: 10,
                  options: [
                    { id: 'o1', text: 'Mutual Exclusion', isCorrect: false },
                    { id: 'o2', text: 'Hold and Wait', isCorrect: false },
                    { id: 'o3', text: 'Preemptive Resource Deallocation', isCorrect: true },
                    { id: 'o4', text: 'Circular Wait', isCorrect: false },
                  ],
                  explanation: 'Deadlock requires NO preemption. If resources can be preempted, circular wait can be broken.',
                },
                {
                  id: 'q2',
                  type: QuestionType.TrueFalse,
                  text: 'Atomic read-modify-write operations (like Compare-And-Swap) can be implemented without hardware support.',
                  points: 10,
                  options: [
                    { id: 'o2_1', text: 'True', isCorrect: false },
                    { id: 'o2_2', text: 'False', isCorrect: true },
                  ],
                  explanation: 'Hardware must provide bus locking or cache coherence protocol support (e.g. MESI) for atomic CAS instructions.',
                },
              ],
            },
          },
        ],
      },
    ],
  },
  {
    course: {
      id: createId('course-ml201'),
      title: 'Machine Learning: Algorithms, Datasets & Inference',
      description: 'Hands-on applied machine learning covering data pre-processing, gradient descent, linear models, tree ensembles, and offline model evaluation.',
      language: 'en',
      instructorName: 'Dr. Marcus Vance',
      subject: 'Data Science & AI',
      tags: ['Machine Learning', 'Python', 'Algorithms', 'Statistics'],
      estimatedDurationMinutes: 300,
      learningObjectives: [
        'Formulate supervised learning problems and loss functions',
        'Implement gradient descent and regularization techniques',
        'Evaluate models using precision, recall, and ROC-AUC',
      ],
      localAvailability: DownloadStatus.Downloaded,
      createdAt: '2026-09-10T10:00:00Z',
      updatedAt: '2026-10-18T16:00:00Z',
    },
    sections: [
      {
        section: {
          id: createId('sec-ml-1'),
          courseVersionId: createId('ver-ml-1'),
          title: 'Section 1: Supervised Learning Fundamentals',
          description: 'Loss surfaces, gradient estimation, and overfitting prevention.',
          position: 1,
          estimatedDurationMinutes: 90,
          isOptional: false,
          prerequisiteSectionIds: [],
        },
        lessons: [
          {
            lesson: {
              id: createId('les-ml-1-1'),
              sectionId: createId('sec-ml-1'),
              title: '1.1 Linear Regression & The Bias-Variance Tradeoff',
              description: 'Deriving the normal equation and gradient descent formulation.',
              learningObjectives: ['Derive MSE loss gradient', 'Apply L1 and L2 regularization'],
              position: 1,
              estimatedDurationMinutes: 40,
              completionPolicy: LessonCompletionPolicy.AllBlocksCompleted,
              isRequired: true,
              prerequisiteLessonIds: [],
              revision: 1,
            },
            blocks: [
              {
                id: createId('blk-ml-1'),
                lessonId: createId('les-ml-1-1'),
                type: ContentBlockType.RichText,
                position: 1,
                displayMetadata: {
                  content: `### The Bias-Variance Tradeoff\n\nWhen training machine learning models, expected error decomposes into three distinct parts:\n$$\\text{Error} = \\text{Bias}^2 + \\text{Variance} + \\text{Irreducible Error}$$\n\n- **High Bias:** Underfitting the underlying pattern.\n- **High Variance:** Overfitting to noise in the training sample.\n- **Regularization:** L2 (Ridge) and L1 (Lasso) penalties shrink weights to mitigate variance.`,
                },
                isRequired: true,
                schemaVersion: '1.0.0',
              },
            ],
          },
        ],
      },
    ],
  },
];
