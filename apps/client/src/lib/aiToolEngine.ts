/**
 * CourseNest In-App Model Context Protocol (MCP) & Tool Dispatcher
 * Allows AI models (Gemini, DeepSeek, Ollama, OpenAI, and Offline Companion)
 * to take direct actions: jump video timestamps, flip presentation slides,
 * create flashcards in the vault, and search materials.
 */

import { saveFlashcard } from './flashcardStore';
import { saveUserNote, getUserNotes } from './courseStore';
import { globalAiVectorStore } from './aiVectorStore';
import { addLog } from './logger';

export interface ToolActionCall {
  tool: string;
  arguments: Record<string, any>;
  resultSummary?: string;
  success?: boolean;
}

export interface ToolExecutionContext {
  courseId: string;
  lessonId: string;
  lessonTitle?: string;
  onSeekTo?: (seconds: number) => void;
  onNavigateSlide?: (slideNumber: number) => void;
  onAppendNote?: (note: string) => void;
}

export interface InAppToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
}

export const IN_APP_AI_TOOLS: InAppToolDefinition[] = [
  {
    name: 'seek_video_player',
    description: 'Jumps the HTML5/YouTube lecture video player to a specific timestamp in seconds when referencing a spoken part of the lecture.',
    parameters: {
      type: 'object',
      properties: {
        timestampSeconds: {
          type: 'number',
          description: 'The time position in seconds to jump to (e.g. 142 for 02:22).',
        },
        reason: {
          type: 'string',
          description: 'Brief reason explaining what is being discussed at this moment.',
        },
      },
      required: ['timestampSeconds'],
    },
  },
  {
    name: 'navigate_to_slide',
    description: 'Flips the PowerPoint (.pptx) presentation viewer to a specific slide number to show the student relevant diagrams or notes.',
    parameters: {
      type: 'object',
      properties: {
        slideNumber: {
          type: 'number',
          description: 'The 1-based slide number to jump to.',
        },
        reason: {
          type: 'string',
          description: 'Why this slide is relevant to the question.',
        },
      },
      required: ['slideNumber'],
    },
  },
  {
    name: 'create_flashcard',
    description: 'Creates a high-yield active-recall flashcard and saves it directly into the student local review deck.',
    parameters: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'The front of the card: clear, focused test question.',
        },
        answer: {
          type: 'string',
          description: 'The back of the card: concise explanation or key formula.',
        },
        topic: {
          type: 'string',
          description: 'Subject or category tag (e.g. "Computer Architecture", "Calculus").',
        },
        hint: {
          type: 'string',
          description: 'Optional clue for the student before flipping.',
        },
      },
      required: ['question', 'answer'],
    },
  },
  {
    name: 'save_study_note',
    description: 'Appends a key takeaway or summary checkpoint directly into the student lesson study notes.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title of the note section.',
        },
        content: {
          type: 'string',
          description: 'Markdown text content of the note.',
        },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'search_course_catalog',
    description: 'Performs semantic vector search across all lecture transcripts, slides, and notes in the course.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query or keywords to look up.',
        },
      },
      required: ['query'],
    },
  },
];

/**
 * Executes a tool action within the active player context.
 */
export async function executeInAppTool(
  action: ToolActionCall,
  context: ToolExecutionContext,
): Promise<{ success: boolean; resultSummary: string; data?: any }> {
  try {
    switch (action.tool) {
      case 'seek_video_player': {
        const secs = Number(action.arguments.timestampSeconds);
        if (!isNaN(secs) && context.onSeekTo) {
          context.onSeekTo(secs);
          const mm = Math.floor(secs / 60);
          const ss = Math.floor(secs % 60).toString().padStart(2, '0');
          const summary = `Jumped video to [${mm}:${ss}]${action.arguments.reason ? ` (${action.arguments.reason})` : ''}`;
          addLog('INFO', 'AI', summary);
          return { success: true, resultSummary: summary, data: { seconds: secs } };
        }
        return { success: false, resultSummary: 'Invalid timestamp or video seeker not available' };
      }

      case 'navigate_to_slide': {
        const slide = Number(action.arguments.slideNumber);
        if (!isNaN(slide) && context.onNavigateSlide) {
          context.onNavigateSlide(slide);
          const summary = `Navigated presentation to [Slide ${slide}]${action.arguments.reason ? ` (${action.arguments.reason})` : ''}`;
          addLog('INFO', 'AI', summary);
          return { success: true, resultSummary: summary, data: { slideNumber: slide } };
        }
        return { success: false, resultSummary: 'Invalid slide number or slide viewer not active' };
      }

      case 'create_flashcard': {
        const { question, answer, topic, hint } = action.arguments;
        if (!question || !answer) {
          return { success: false, resultSummary: 'Missing question or answer for flashcard' };
        }
        const card = saveFlashcard({
          courseId: context.courseId,
          lessonId: context.lessonId,
          question,
          answer,
          topic: topic || context.lessonTitle,
          hint,
          citation: action.arguments.citation,
        });
        const summary = `Saved active-recall flashcard: "${question.slice(0, 45)}..."`;
        addLog('INFO', 'AI', summary);
        return { success: true, resultSummary: summary, data: card };
      }

      case 'save_study_note': {
        const { title, content } = action.arguments;
        if (!content) {
          return { success: false, resultSummary: 'Missing note content' };
        }
        const existing = getUserNotes(context.lessonId);
        const heading = title ? `### 📝 ${title}\n` : '### 📝 Study Checkpoint\n';
        const formatted = `${heading}${content}`;
        const updated = existing ? `${existing}\n\n${formatted}` : formatted;
        saveUserNote(context.lessonId, updated);
        if (context.onAppendNote) context.onAppendNote(updated);
        const summary = `Saved study checkpoint note: "${title || 'Summary'}"`;
        addLog('INFO', 'AI', summary);
        return { success: true, resultSummary: summary };
      }

      case 'search_course_catalog': {
        const q = String(action.arguments.query || '');
        const results = globalAiVectorStore.search(q, 3, { courseId: context.courseId });
        const summary = `Found ${results.length} relevant excerpts in course vault`;
        return { success: true, resultSummary: summary, data: results };
      }

      default:
        return { success: false, resultSummary: `Unknown tool: ${action.tool}` };
    }
  } catch (err: any) {
    addLog('ERROR', 'AI', `Tool execution failed: ${action.tool}`, err.message);
    return { success: false, resultSummary: `Tool error: ${err.message}` };
  }
}

/**
 * Extracts embedded tool calls from AI model markdown output
 * Formats supported:
 * 1. ```tool_call\n{"tool": "seek_video_player", "arguments": {"timestampSeconds": 120}}\n```
 * 2. [ACTION: seek_video_player(timestampSeconds=120)]
 */
export function extractEmbeddedToolCalls(responseText: string): { cleanText: string; toolCalls: ToolActionCall[] } {
  const toolCalls: ToolActionCall[] = [];
  let cleanText = responseText;

  // Pattern 1: ```tool_call ... ```
  const jsonBlockRegex = /```(?:tool_call|json_action)\s*([\s\S]*?)\s*```/g;
  cleanText = cleanText.replace(jsonBlockRegex, (_, jsonStr) => {
    try {
      const parsed = JSON.parse(jsonStr.trim());
      if (parsed.tool) {
        toolCalls.push({
          tool: parsed.tool,
          arguments: parsed.arguments || {},
        });
        return ''; // remove block from visible text
      }
    } catch {}
    return _;
  });

  // Pattern 2: [ACTION: tool_name({"key": "val"})]
  const actionRegex = /\[ACTION:\s*([a-zA-Z0-9_]+)\(([\s\S]*?)\)\]/g;
  cleanText = cleanText.replace(actionRegex, (_, toolName, argsStr) => {
    try {
      let argsObj: Record<string, any> = {};
      const trimmedArgs = argsStr.trim();
      if (trimmedArgs.startsWith('{') && trimmedArgs.endsWith('}')) {
        argsObj = JSON.parse(trimmedArgs);
      } else {
        // Parse key=val, key2=val2
        const parts = trimmedArgs.split(',');
        for (const p of parts) {
          const [k, v] = p.split('=').map((s: string) => s.trim());
          if (k && v !== undefined) {
            argsObj[k] = isNaN(Number(v)) ? v.replace(/^['"]|['"]$/g, '') : Number(v);
          }
        }
      }
      toolCalls.push({
        tool: toolName,
        arguments: argsObj,
      });
      return '';
    } catch {}
    return _;
  });

  return { cleanText: cleanText.trim(), toolCalls };
}
