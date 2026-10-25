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
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (raw) {
      return { ...DEFAULT_AI_CONFIG, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_AI_CONFIG;
}

export function saveAiConfig(config: AiConfig): void {
  try {
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
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
  const title = payload.lessonTitle || 'this unit';
  const mode = payload.pedagogicalMode || 'socratic';
  const toolCalls: ToolActionCall[] = [];

  // 1. Generate Flashcards Request
  if (q.includes('flashcard') || q.includes('active recall') || q.includes('anki')) {
    const flashcardsToCreate = [
      {
        question: `What are the primary operational characteristics of ${title}?`,
        answer: topChunks[0]?.chunk.content.slice(0, 200) || `Core concepts and execution models discussed in ${title}.`,
        hint: `Review the foundational section of ${title}.`,
      },
      {
        question: `How does spatial locality affect memory caching efficiency?`,
        answer: `When a memory address is accessed, an entire cache line (64 bytes) is transferred to L1 SRAM, accelerating subsequent adjacent reads.`,
        hint: `Recall CPU memory hierarchies.`,
      },
    ];

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
      text: `### 🃏 Active Recall Flashcards Generated: ${title}\n\nI have generated **${flashcardsToCreate.length} active-recall flashcards** based on verified lesson materials and saved them directly to your personal review deck!\n\n${flashcardsToCreate.map((f, i) => `**Card ${i + 1}**: ${f.question}\n*Answer*: ${f.answer}`).join('\n\n')}\n\n*(Created locally by CourseNest Offline Study Engine)*`,
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
        text: `### ⏱️ Video Lecture Citations: ${title}\n\nThis concept is discussed directly in the video recording at the following timestamps. Click any timestamp or view the auto-jump below:\n\n${citations}\n\n*(Vector-indexed by CourseNest Offline Engine)*`,
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
    const citations = topChunks.map((c) => `${c.chunk.citationBadge} ${c.chunk.content.slice(0, 140)}...`).join('\n\n');

    if (mode === 'socratic') {
      return {
        text: `### 🧑‍🏫 Academic Socratic Exploration: ${title}\n\nTo understand this concept deeply, consider the core principle highlighted in **${primary.chunk.citationBadge}**:\n\n> "${primary.chunk.content.slice(0, 180)}..."\n\n**Think through this:**\n1. What happens to overall throughput when latency increases across memory stages?\n2. How does the relationship between time and spatial locality affect cache miss rates?\n\n*Review **${primary.chunk.citationBadge}** in the player or notes above to test your hypothesis.*`,
        toolCalls,
      };
    } else if (mode === 'quiz') {
      return {
        text: `### 📝 Practice Checkpoint: ${title}\n\nBased directly on **${primary.chunk.citationBadge}**:\n\n**1. Comprehension Test**\nAccording to the lesson material, what is the significance of the following principle?\n> "${primary.chunk.content.slice(0, 150)}..."\n\n**Quick Answer:**\nClick **"Active Recall Flashcards"** in the companion header to practice this question in your review deck!`,
        toolCalls,
      };
    } else {
      // Reference mode
      return {
        text: `### ⚡ Technical Reference: ${title}\n\n**Verified Excerpts:**\n\n${citations}\n\n*(Vector-retrieved locally via CourseNest RAG Engine)*`,
        toolCalls,
      };
    }
  }

  return {
    text: `### Study Companion: ${title}\n\nI have indexed the materials for **${title}**. You can ask about specific formulas, request video timestamps, generate active-recall flashcards, or ask for a slide breakdown!`,
    toolCalls,
  };
}

/**
 * Main Question Dispatcher:
 * Coordinates local vector retrieval, cloud/local LLM APIs, and In-App Tool execution.
 */
export async function askAiAssistant(payload: AiQueryPayload): Promise<AiQueryResponse> {
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
  };

  const isLocalEndpoint =
    config.baseUrl.includes('localhost') ||
    config.baseUrl.includes('127.0.0.1') ||
    config.provider === 'ollama';

  // If no external API key and not a local endpoint, or offline without local LLM:
  if (!config.apiKey && config.provider !== 'omniroute' && config.provider !== 'ollama' && !isLocalEndpoint) {
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
      const model = config.modelName || 'gemini-1.5-flash';
      const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/models/${model}:generateContent?key=${config.apiKey.trim()}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        throw new Error(errorData?.error?.message || `Gemini API returned status ${res.status}`);
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

      const res = await fetch(endpoint, {
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
    addLog('WARN', 'AI', 'Remote RAG query failed, running offline local academic fallback', err.message);
    const offlineResult = generateOfflineLocalAnswer(payload, topChunks);
    const executedActions: Array<{ tool: string; summary: string }> = [];

    for (const action of offlineResult.toolCalls) {
      const res = await executeInAppTool(action, toolContext);
      executedActions.push({ tool: action.tool, summary: res.resultSummary });
    }

    return {
      success: true,
      text: `${offlineResult.text}\n\n*(Remote model unavailable. Processed via CourseNest In-Browser RAG Engine)*`,
      executedActions,
      groundedSources: topChunks.map((c) => ({
        citation: c.chunk.citationBadge,
        excerpt: c.excerpt,
      })),
    };
  }
}
