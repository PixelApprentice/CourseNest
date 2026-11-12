import { useState, useEffect } from 'react';
import { addLog } from './logger';
import { chunkSubtitles, chunkPptxSlides, chunkDocument, type AiChunk } from './aiChunker';
import { globalAiVectorStore, type ScoredChunk } from './aiVectorStore';
import { 
  executeInAppTool, 
  extractEmbeddedToolCalls, 
  type ToolActionCall, 
  type ToolExecutionContext 
} from './aiToolEngine';

export type AiProvider = 'gemini' | 'deepseek' | 'openai-compatible' | 'omniroute' | 'ollama';
export type PedagogicalMode = 'socratic' | 'reference' | 'quiz';

export interface AiConfig {
  isEnabled: boolean;
  provider: AiProvider;
  apiKey: string;
  baseUrl: string;
  modelName: string;
  temperature: number;
  pedagogicalMode: PedagogicalMode;
}

const AI_CONFIG_KEY = 'coursenest_ai_config_v1';

let inMemoryApiKey: string | null = null;

// Asynchronously hydrate safeStorage API key if running in Electron desktop
if (typeof window !== 'undefined') {
  const electron = (window as any).electron || (window as any).__ELECTRON__;
  if (electron?.storage?.getAiKey) {
    electron.storage.getAiKey().then((key: string | null) => {
      if (key) {
        inMemoryApiKey = key;
        window.dispatchEvent(new Event('coursenest_ai_config_changed'));
      }
    }).catch(() => {});
  }
}

const DEFAULT_AI_CONFIG: AiConfig = {
  isEnabled: true,
  provider: 'gemini',
  apiKey: '',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  modelName: 'gemini-1.5-flash',
  temperature: 0.3,
  pedagogicalMode: 'socratic',
};

export function getAiConfig(): AiConfig {
  let baseConfig = DEFAULT_AI_CONFIG;
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (raw) {
      baseConfig = { ...DEFAULT_AI_CONFIG, ...JSON.parse(raw) };
    }
  } catch {}

  if (inMemoryApiKey !== null) {
    baseConfig.apiKey = inMemoryApiKey;
  }
  return baseConfig;
}

export function saveAiConfig(config: AiConfig): void {
  try {
    inMemoryApiKey = config.apiKey;
    const electron = (window as any).electron || (window as any).__ELECTRON__;
    if (electron?.storage?.saveAiKey) {
      electron.storage.saveAiKey(config.apiKey).catch(() => {});
      // In localStorage, store empty apiKey so plaintext is never left in localStorage
      const safeConfig = { ...config, apiKey: '' };
      localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(safeConfig));
    } else {
      localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
    }

    window.dispatchEvent(new Event('coursenest_ai_config_changed'));
    addLog(
      'INFO',
      'AI',
      `AI companion settings updated (Provider: ${config.provider}, Mode: ${config.pedagogicalMode})`,
    );
  } catch (err: any) {
    addLog('ERROR', 'AI', 'Failed to save AI configuration', err.message);
  }
}

export function useAiConfig() {
  const [config, setConfig] = useState<AiConfig>(getAiConfig());

  useEffect(() => {
    const handleUpdate = () => setConfig(getAiConfig());
    window.addEventListener('coursenest_ai_config_changed', handleUpdate);
    return () => window.removeEventListener('coursenest_ai_config_changed', handleUpdate);
  }, []);

  return {
    config,
    updateConfig: saveAiConfig,
  };
}

export interface AiQueryPayload {
  question: string;
  courseTitle?: string;
  courseId?: string;
  lessonTitle?: string;
  lessonId?: string;
  lessonNotes?: string;
  materialExcerpt?: string;
  subtitleTranscript?: string;
  slidesData?: Array<{ slideNumber: number; title: string; bullets: string[]; speakerNotes?: string }>;
  pedagogicalMode?: PedagogicalMode;
  onSeekTo?: (seconds: number) => void;
  onNavigateSlide?: (slideNumber: number) => void;
  onAppendNote?: (note: string) => void;
  onToggleComplete?: (completed: boolean) => void;
}

export interface AiQueryResponse {
  success: boolean;
  text: string;
  error?: string;
  executedActions?: Array<{ tool: string; summary: string }>;
  groundedSources?: Array<{ citation: string; excerpt: string }>;
}

/**
 * Builds and indexes multi-modal lesson content into the vector store.
 */
export function indexLessonMaterial(payload: AiQueryPayload): void {
  const courseId = payload.courseId || 'default-course';
  const lessonId = payload.lessonId || 'default-lesson';
  const chunks: AiChunk[] = [];

  if (payload.subtitleTranscript) {
    chunks.push(...chunkSubtitles(payload.subtitleTranscript, courseId, lessonId));
  }

  if (payload.slidesData && payload.slidesData.length > 0) {
    chunks.push(...chunkPptxSlides(payload.slidesData, courseId, lessonId));
  }

  if (payload.materialExcerpt) {
    chunks.push(...chunkDocument(payload.materialExcerpt, courseId, lessonId));
  }

  if (chunks.length > 0) {
    globalAiVectorStore.addChunks(chunks);
  }
}

/**
 * High-Accuracy Offline Academic Engine:
 * Employs local BM25 + sublinear vector retrieval across transcripts, slides, and notes.
 * Automatically crafts Socratic responses, generates flashcards, and triggers in-app tool actions!
 */
export function generateOfflineLocalAnswer(
  payload: AiQueryPayload,
  topChunks: ScoredChunk[],
): { text: string; toolCalls: ToolActionCall[] } {
  const q = payload.question.toLowerCase().trim();
  const title = payload.lessonTitle || payload.courseTitle || 'this unit';
  const mode = payload.pedagogicalMode || 'socratic';
  const toolCalls: ToolActionCall[] = [];

  // Extract real text excerpts from topChunks or lesson payload
  const primaryChunk = topChunks[0]?.chunk;
  const rawExcerpt = primaryChunk?.content || payload.materialExcerpt || payload.subtitleTranscript || '';
  const cleanExcerpt = rawExcerpt.slice(0, 300).replace(/\s+/g, ' ').trim();

  // 1. Generate Flashcards Request
  if (q.includes('flashcard') || q.includes('active recall') || q.includes('anki')) {
    const flashcardsToCreate: Array<{ question: string; answer: string; hint: string }> = [];

    if (topChunks.length > 0) {
      topChunks.slice(0, 3).forEach((sc) => {
        const text = sc.chunk.content.replace(/\s+/g, ' ').trim();
        const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 15);
        if (sentences.length > 0) {
          const qText = sentences[0]!;
          const aText = sentences.slice(1, 3).join(' ') || text.slice(0, 180);
          flashcardsToCreate.push({
            question: `Key concept from ${sc.chunk.citationBadge || title}: What is stated regarding "${qText.slice(0, 70)}..."?`,
            answer: aText.slice(0, 220),
            hint: `Review ${sc.chunk.citationBadge || title}`,
          });
        }
      });
    }

    if (flashcardsToCreate.length === 0) {
      flashcardsToCreate.push({
        question: `What are the primary operational characteristics of ${title}?`,
        answer: cleanExcerpt || `Core principles and methodology introduced in ${title}.`,
        hint: `Review the foundational section of ${title}.`,
      });
    }

    for (const fc of flashcardsToCreate) {
      toolCalls.push({
        tool: 'create_flashcard',
        arguments: {
          question: fc.question,
          answer: fc.answer,
          topic: title,
          hint: fc.hint,
        },
      });
    }

    return {
      text: `### 🃏 Active Recall Flashcards Generated: ${title}\n\nI generated **${flashcardsToCreate.length} active-recall flashcard(s)** directly from your verified lesson materials:\n\n${flashcardsToCreate.map((f, i) => `**Card ${i + 1}**: ${f.question}\n*Answer*: ${f.answer}`).join('\n\n')}\n\n*(Created locally by CourseNest Offline Study Engine)*`,
      toolCalls,
    };
  }

  // 2. Video Jump or Timeline Request
  if (q.includes('timestamp') || q.includes('timeline') || q.includes('jump') || q.includes('when')) {
    const transcriptMatches = topChunks.filter((c) => c.chunk.sourceType === 'transcript');
    if (transcriptMatches.length > 0) {
      const best = transcriptMatches[0]!;
      if (best.chunk.sourceType === 'transcript') {
        toolCalls.push({
          tool: 'seek_video_player',
          arguments: {
            timestampSeconds: best.chunk.startTimeSeconds,
            reason: `Topic discussion: "${best.chunk.content.slice(0, 60)}..."`,
          },
        });
      }

      const citations = transcriptMatches.map((m) => {
        return `- **${m.chunk.citationBadge}**: "${m.chunk.content.slice(0, 110)}..." (Relevance: ${Math.round(m.score * 100)}%)`;
      }).join('\n');

      return {
        text: `### ⏱️ Video Lecture Citations: ${title}\n\nThis concept is discussed in the lecture video at the following timestamps:\n\n${citations}\n\n*(Vector-indexed by CourseNest Offline Engine)*`,
        toolCalls,
      };
    }
  }

  // 3. Slide Deck References
  const slideMatches = topChunks.filter((c) => c.chunk.sourceType === 'slide');
  if (slideMatches.length > 0 && (q.includes('slide') || q.includes('diagram') || q.includes('present'))) {
    const bestSlide = slideMatches[0]!;
    if (bestSlide.chunk.sourceType === 'slide') {
      toolCalls.push({
        tool: 'navigate_to_slide',
        arguments: {
          slideNumber: bestSlide.chunk.slideNumber,
          reason: bestSlide.chunk.slideTitle,
        },
      });

      return {
        text: `### 📊 Slide Presentation Grounding: ${title}\n\nRelevant lecture content found on **${bestSlide.chunk.citationBadge}**: **${bestSlide.chunk.slideTitle}**\n\n${bestSlide.chunk.content}\n\n*(Presentation synced by CourseNest In-App Tool Engine)*`,
        toolCalls,
      };
    }
  }

  // 4. Grounded Context Synthesis based on Pedagogical Mode
  if (topChunks.length > 0) {
    const primary = topChunks[0]!;
    const citations = topChunks.map((c) => `> **${c.chunk.citationBadge}**: "${c.chunk.content.slice(0, 180)}..."`).join('\n\n');

    if (mode === 'socratic') {
      return {
        text: `### 🧑‍🏫 Academic Socratic Exploration: ${title}\n\nConsider what the lesson material states in **${primary.chunk.citationBadge}**:\n\n> "${primary.chunk.content.slice(0, 220)}..."\n\n**To deepen your understanding:**\n1. How does this concept apply to the objectives of ${title}?\n2. What are the key consequences or requirements implied by this statement?\n\n*Review **${primary.chunk.citationBadge}** above to test your hypothesis.*`,
        toolCalls,
      };
    } else if (mode === 'quiz') {
      return {
        text: `### 📝 Practice Checkpoint: ${title}\n\nBased directly on **${primary.chunk.citationBadge}**:\n\n**Comprehension Test**\nAccording to the lesson material:\n> "${primary.chunk.content.slice(0, 180)}..."\n\n**Think through this question:**\nWhat is the primary role or significance of this topic in ${title}?\n\n*(Practice active recall or review your lesson notes above!)*`,
        toolCalls,
      };
    } else {
      // Reference mode
      return {
        text: `### ⚡ Technical Reference: ${title}\n\n**Verified Excerpts from ${title}:**\n\n${citations}\n\n*(Vector-retrieved locally via CourseNest RAG Engine)*`,
        toolCalls,
      };
    }
  }

  return {
    text: `### Study Companion: ${title}\n\nI have indexed the materials for **${title}**. You can ask about specific concepts from the lesson, request video timestamps, generate active-recall flashcards, or ask for a study breakdown!`,
    toolCalls,
  };
}

let activeInflightQuery: Promise<AiQueryResponse> | null = null;

/**
 * Resilient fetch with exponential backoff and jitter for HTTP 429 and 503.
 * Respects Retry-After headers and Google AI Studio retryDelay fields.
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429 || res.status === 503) {
        if (attempt >= maxRetries) {
          return res;
        }
        const retryAfterHeader = res.headers.get('retry-after');
        let delayMs = 0;
        if (retryAfterHeader) {
          const parsed = parseInt(retryAfterHeader, 10);
          if (!isNaN(parsed) && parsed > 0) {
            delayMs = parsed * 1000;
          }
        }
        if (delayMs === 0) {
          try {
            const clone = res.clone();
            const data = await clone.json();
            const delayStr = data?.error?.details?.find?.((d: any) => d.retryDelay)?.retryDelay;
            if (delayStr && typeof delayStr === 'string') {
              const seconds = parseFloat(delayStr.replace(/s$/, ''));
              if (!isNaN(seconds) && seconds > 0) {
                delayMs = seconds * 1000;
              }
            }
          } catch {}
        }
        if (delayMs === 0) {
          // Exponential backoff with jitter: 1s, 2s, 4s...
          delayMs = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 500, 10000);
        }
        delayMs = Math.min(delayMs, 15000);
        addLog(
          'INFO',
          'AI',
          `Rate limited (HTTP ${res.status}). Waiting ${Math.round(delayMs / 1000)}s before retry ${attempt + 1}/${maxRetries}...`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        attempt++;
        continue;
      }
      return res;
    } catch (netErr: any) {
      if (attempt >= maxRetries) throw netErr;
      const delayMs = 1000 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      attempt++;
    }
  }
  throw new Error('Maximum retries exceeded');
}

/**
 * Main Question Dispatcher:
 * Coordinates local vector retrieval, cloud/local LLM APIs, and In-App Tool execution.
 * Enforces sequential concurrency lock to prevent API hammering.
 */
export async function askAiAssistant(payload: AiQueryPayload): Promise<AiQueryResponse> {
  if (activeInflightQuery) {
    try {
      await activeInflightQuery;
    } catch {}
  }

  const execution = doAskAiAssistant(payload);
  activeInflightQuery = execution;
  try {
    return await execution;
  } finally {
    if (activeInflightQuery === execution) {
      activeInflightQuery = null;
    }
  }
}

async function doAskAiAssistant(payload: AiQueryPayload): Promise<AiQueryResponse> {
  const config = getAiConfig();
  const effectiveMode = payload.pedagogicalMode || config.pedagogicalMode || 'socratic';

  // 1. Index material locally in vector store
  indexLessonMaterial(payload);

  // 2. Retrieve top-K relevant semantic chunks
  const topChunks = globalAiVectorStore.search(
    payload.question,
    4,
    { courseId: payload.courseId, lessonId: payload.lessonId }
  );

  const toolContext: ToolExecutionContext = {
    courseId: payload.courseId || 'default-course',
    lessonId: payload.lessonId || 'default-lesson',
    lessonTitle: payload.lessonTitle,
    onSeekTo: payload.onSeekTo,
    onNavigateSlide: payload.onNavigateSlide,
    onAppendNote: payload.onAppendNote,
    onToggleComplete: payload.onToggleComplete,
  };

  const isLocalEndpoint =
    config.baseUrl.includes('localhost') ||
    config.baseUrl.includes('127.0.0.1') ||
    config.provider === 'ollama';

  // If no external API key and not a local endpoint, or offline without local LLM:
  if (!config.apiKey && config.provider !== 'ollama' && !isLocalEndpoint) {
    const offlineResult = generateOfflineLocalAnswer(payload, topChunks);
    const executedActions: Array<{ tool: string; summary: string }> = [];

    for (const action of offlineResult.toolCalls) {
      const res = await executeInAppTool(action, toolContext);
      executedActions.push({ tool: action.tool, summary: res.resultSummary });
    }

    return {
      success: true,
      text: offlineResult.text,
      executedActions,
      groundedSources: topChunks.map((c) => ({
        citation: c.chunk.citationBadge,
        excerpt: c.excerpt,
      })),
    };
  }

  // 3. Format grounded prompt with retrieved excerpts and pedagogical instructions
  const excerptsText = topChunks.length > 0
    ? topChunks.map((c) => `[Source ${c.chunk.citationBadge}]:\n${c.chunk.content}`).join('\n\n---\n\n')
    : payload.materialExcerpt?.slice(0, 3000) || payload.subtitleTranscript?.slice(0, 3000) || 'General study material';

  const systemPrompt = `You are CourseNest's Academic Socratic Study Companion and Tool-Enabled Agent.
Mode: ${effectiveMode.toUpperCase()}
Tutoring Guidelines:
- If Mode is SOCRATIC: Guide the student with thoughtful questions and hints. Do not dump immediate answers; prompt them to consider the underlying mechanics.
- If Mode is REFERENCE: Provide direct, high-density facts, mathematical definitions, and bulleted takeaways.
- If Mode is QUIZ: Present a challenging multiple-choice or short-answer question based on the excerpts.

MANDATORY PROVENANCE & TIMESTAMPS:
- ALWAYS cite timestamps like [mm:ss] when referencing spoken lectures.
- ALWAYS cite slides like [Slide X] when referencing presentations.
- Ground your answers strictly on the verified excerpts below.

IN-APP ACTIONS & TOOL CALLS:
If the student asks to jump to a time, review a slide, or make flashcards, you can include tool calls in this format:
\`\`\`tool_call
{"tool": "seek_video_player", "arguments": {"timestampSeconds": 145, "reason": "Explaining gradient descent"}}
\`\`\`
Or to create a flashcard:
\`\`\`tool_call
{"tool": "create_flashcard", "arguments": {"question": "Front of card", "answer": "Back of card", "hint": "Clue"}}
\`\`\`
Or to navigate to a slide:
\`\`\`tool_call
{"tool": "navigate_to_slide", "arguments": {"slideNumber": 3, "reason": "Architecture overview"}}
\`\`\``;

  const userPrompt = `[Verified Lesson Excerpts (Vector RAG Ranked)]:
"""
${excerptsText}
"""

[Student Question]:
${payload.question}`;

  try {
    addLog('INFO', 'AI', `Dispatching grounded RAG query to ${config.provider} (${config.modelName || 'default'})`);

    let rawOutputText = '';

    if (config.provider === 'gemini') {
      const model = (config.modelName || 'gemini-1.5-flash').trim().replace(/^models\//, '') || 'gemini-1.5-flash';
      let baseUrl = config.baseUrl.trim().replace(/\/+$/, '');
      if (!baseUrl.includes('/v1')) {
        baseUrl += '/v1beta';
      }
      const endpoint = `${baseUrl}/models/${model}:generateContent`;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.apiKey) {
        headers['x-goog-api-key'] = config.apiKey.trim();
      }

      const res = await fetchWithRetry(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
            },
          ],
          generationConfig: {
            temperature: config.temperature,
            maxOutputTokens: 1024,
          },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const rawMsg = errorData?.error?.message || `Gemini API returned status ${res.status}`;
        if (res.status === 429) {
          throw new Error(
            `Google AI Studio rate limit or quota exceeded (HTTP 429: ${rawMsg}). Automatic retries were attempted with backoff, but your current quota window is exhausted.`
          );
        }
        throw new Error(rawMsg);
      }

      const data = await res.json();
      rawOutputText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      // DeepSeek, Ollama, OpenAI-compatible
      let defaultBaseUrl = 'https://api.openai.com/v1';
      let defaultModel = 'gpt-4o-mini';

      if (config.provider === 'deepseek') {
        defaultBaseUrl = 'https://api.deepseek.com';
        defaultModel = 'deepseek-chat';
      } else if (config.provider === 'ollama') {
        defaultBaseUrl = 'http://localhost:11434/v1';
        defaultModel = 'llama3.2';
      }

      const rawBase = config.baseUrl.trim().replace(/\/+$/, '') || defaultBaseUrl;
      const endpoint = rawBase.endsWith('/chat/completions') ? rawBase : `${rawBase}/chat/completions`;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;

      const res = await fetchWithRetry(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config.modelName || defaultModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: config.temperature,
          max_tokens: 1024,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`API returned HTTP ${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = await res.json();
      rawOutputText = data.choices?.[0]?.message?.content || '';
    }

    // 4. Parse and execute any in-app tool actions from response
    const { cleanText, toolCalls } = extractEmbeddedToolCalls(rawOutputText);
    const executedActions: Array<{ tool: string; summary: string }> = [];

    for (const call of toolCalls) {
      const toolRes = await executeInAppTool(call, toolContext);
      executedActions.push({ tool: call.tool, summary: toolRes.resultSummary });
    }

    return {
      success: true,
      text: cleanText,
      executedActions,
      groundedSources: topChunks.map((c) => ({
        citation: c.chunk.citationBadge,
        excerpt: c.excerpt,
      })),
    };
  } catch (err: any) {
    addLog('WARN', 'AI', 'Remote RAG query failed', err.message);
    const isQuota =
      err.message?.includes('429') ||
      err.message?.includes('quota') ||
      err.message?.includes('RESOURCE_EXHAUSTED');
    const userMessage = isQuota
      ? `### ⚠️ Google AI Studio Rate Limit / Quota Exceeded (HTTP 429)\n\n${err.message}\n\n**Recommendations:**\n- Wait 60 seconds for the free-tier per-minute quota to refresh.\n- Check your quota allocation at [ai.google.dev](https://ai.google.dev).\n- Or continue studying offline using CourseNest's built-in **Offline Study Engine** (no API key required).`
      : `### ⚠️ AI Query Failed\n\n**Error:** ${err.message || 'Unable to connect to AI provider'}.\n\n*Please verify your API key, base URL, and model name in Settings > Study Companion.*`;

    return {
      success: false,
      text: userMessage,
      error: err.message || 'Remote AI query failed',
    };
  }
}
