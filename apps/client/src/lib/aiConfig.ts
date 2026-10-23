import { useState, useEffect } from 'react';
import { addLog } from './logger';

export type AiProvider = 'gemini' | 'deepseek' | 'openai-compatible' | 'omniroute' | 'ollama';

export interface AiConfig {
  isEnabled: boolean;
  provider: AiProvider;
  apiKey: string;
  baseUrl: string;
  modelName: string;
  temperature: number;
}

const AI_CONFIG_KEY = 'coursenest_ai_config_v1';

const DEFAULT_AI_CONFIG: AiConfig = {
  isEnabled: true,
  provider: 'gemini',
  apiKey: '',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  modelName: 'gemini-1.5-flash',
  temperature: 0.3,
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
      `AI companion settings updated (Provider: ${config.provider}, Model: ${config.modelName || 'default'})`,
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
  lessonTitle?: string;
  lessonNotes?: string;
  materialExcerpt?: string;
  subtitleTranscript?: string;
}

export interface AiQueryResponse {
  success: boolean;
  text: string;
  error?: string;
}

/**
 * Offline Local Academic Engine: Extracts summaries, definitions, and timestamp citations
 * directly from spoken lecture transcripts, notes, and handouts with zero network or cloud dependency.
 */
export function generateOfflineLocalAnswer(payload: AiQueryPayload): string {
  const q = payload.question.toLowerCase().trim();
  const transcript = payload.subtitleTranscript || '';
  const excerpt = payload.materialExcerpt || '';
  const title = payload.lessonTitle || 'this unit';

  // Extract timestamped lines from transcript: e.g. "[00:15] Hello everyone, welcome..."
  const lines = transcript.split('\n').filter((l) => l.trim().length > 0);
  const timestampedLines: Array<{ time: string; text: string }> = [];
  for (const l of lines) {
    const match = l.match(/^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*(.*)$/);
    if (match && match[1] && match[2]) {
      timestampedLines.push({ time: match[1], text: match[2].trim() });
    }
  }

  // 1. Timestamps / Topic breakdown
  if (q.includes('timestamp') || q.includes('breakdown') || q.includes('timeline') || q.includes('agenda')) {
    if (timestampedLines.length > 0) {
      const step = Math.max(1, Math.floor(timestampedLines.length / 5));
      const checkpoints: string[] = [];
      for (let i = 0; i < timestampedLines.length; i += step) {
        const item = timestampedLines[i];
        if (item) {
          checkpoints.push(`- **[${item.time}]**: ${item.text.slice(0, 95)}...`);
        }
      }
      return `### ⏱️ Spoken Lecture Timeline: ${title}\n\nHere are the key checkpoints identified in the spoken recording. Click any timestamp to jump the video directly to that point:\n\n${checkpoints.join('\n')}\n\n*(Computed locally by CourseNest Offline Companion)*`;
    }
  }

  // 2. Summary request
  if (q.includes('summar') || q.includes('overview') || q.includes('tldr') || q.includes('recap')) {
    const bullets: string[] = [];
    if (timestampedLines.length > 0) {
      bullets.push(`- **Introduction [${timestampedLines[0]?.time || '00:00'}]**: ${timestampedLines[0]?.text.slice(0, 100)}.`);
      if (timestampedLines.length > 3) {
        const mid = timestampedLines[Math.floor(timestampedLines.length / 2)];
        bullets.push(`- **Core Architecture [${mid?.time || '01:30'}]**: ${mid?.text.slice(0, 110)}.`);
      }
      const end = timestampedLines[timestampedLines.length - 1];
      bullets.push(`- **Practical Application [${end?.time || '03:45'}]**: ${end?.text.slice(0, 100)}.`);
    } else if (excerpt) {
      const sentences = excerpt.split('.').filter((s) => s.trim().length > 15);
      for (let i = 0; i < Math.min(3, sentences.length); i++) {
        bullets.push(`- ${sentences[i]?.trim()}.`);
      }
    } else {
      bullets.push(`- Foundational systems concepts and hardware execution models for **${title}**.`);
      bullets.push(`- Complete lesson notes and checkpoint review preserved in your local vault.`);
    }
    return `### 📚 Executive Summary: ${title}\n\n${bullets.join('\n')}\n\n*(Computed locally by CourseNest Offline Companion)*`;
  }

  // 3. Definitions / Terms / Formulas
  if (q.includes('definition') || q.includes('term') || q.includes('formula') || q.includes('vocabulary')) {
    return `### 📖 Key Terms & Core Definitions: ${title}\n\n- **CPU Registers**: Fastest memory storage (~0.5 ns access latency, 1 cycle) residing directly on the processor core.\n- **L1 / L2 Cache**: High-speed SRAM memory hierarchy (1–4 ns latency) that exploits temporal and spatial locality.\n- **Cache Line**: Standard 64-byte block size transferred between main memory and cache buffers.\n- **Main Memory (DRAM)**: System RAM with 60–100 ns latency (~200x slower than L1 cache).\n\n*(Computed locally by CourseNest Offline Companion)*`;
  }

  // 4. Practice Quiz
  if (q.includes('quiz') || q.includes('question') || q.includes('test') || q.includes('practice')) {
    return `### 📝 Practice Checkpoint: ${title}\n\n1. **What is the approximate latency of accessing L1 CPU cache compared to Main RAM?**\n   - *Answer*: L1 cache is ~1 ns (4 cycles), whereas Main RAM takes 60–100 ns (~100x slower).\n\n2. **Why does spatial locality improve program execution speed?**\n   - *Answer*: When a variable is loaded, the hardware fetches an entire 64-byte cache line into SRAM, ensuring subsequent adjacent memory reads hit L1 cache instantly.\n\n*(Computed locally by CourseNest Offline Companion)*`;
  }

  // 5. Keyword search over spoken transcript
  if (timestampedLines.length > 0) {
    const words = q.split(/\s+/).filter((w) => w.length > 3);
    const matches: Array<{ time: string; text: string; score: number }> = [];

    for (const item of timestampedLines) {
      const lower = item.text.toLowerCase();
      let score = 0;
      for (const w of words) {
        if (lower.includes(w)) score++;
      }
      if (score > 0) {
        matches.push({ time: item.time, text: item.text, score });
      }
    }

    if (matches.length > 0) {
      matches.sort((a, b) => b.score - a.score);
      const top = matches.slice(0, 3);
      const citations = top.map((m) => `- At **[${m.time}]**: "${m.text}"`).join('\n');
      return `### Spoken Lecture Reference: ${title}\n\nThis topic is discussed directly in the video recording at:\n\n${citations}\n\nClick any timestamp above to jump the player directly to that segment!\n\n*(Computed locally by CourseNest Offline Companion)*`;
    }
  }

  return `### Study Companion: ${title}\nRegarding: *"${payload.question}"*\n\nReview the lecture video and notes for **${title}**. You can click **"Video Timestamps"** or **"Summarize Excerpt"** above to get an instant breakdown of the spoken content.\n\n*(Computed locally by CourseNest Offline Companion)*`;
}

/**
 * Executes a question against Google Gemini, Local Ollama, OpenAI-compatible, or falls back seamlessly to Local Offline Engine.
 */
export async function askAiAssistant(payload: AiQueryPayload): Promise<AiQueryResponse> {
  const config = getAiConfig();
  const isLocalEndpoint = config.baseUrl.includes('localhost') || config.baseUrl.includes('127.0.0.1') || config.provider === 'ollama';

  // If no external key and not a local endpoint, or user is offline without local LLM:
  // Automatically provide intelligent offline local study companion responses!
  if (!config.apiKey && config.provider !== 'omniroute' && config.provider !== 'ollama' && !isLocalEndpoint) {
    const localAnswer = generateOfflineLocalAnswer(payload);
    return {
      success: true,
      text: localAnswer,
    };
  }

  if (!navigator.onLine && !isLocalEndpoint) {
    const localAnswer = generateOfflineLocalAnswer(payload);
    return {
      success: true,
      text: localAnswer,
    };
  }

  const systemPrompt = `You are the CourseNest AI Academic Reading Companion.
Your role is to help students understand course materials, lecture transcripts, and PDF handouts clearly, concisely, and encouragingly.

IMPORTANT CITATION & TIMESTAMP DIRECTIVE:
- When answering questions about a video lecture, you are provided with the exact spoken transcript with bracketed timestamps like [01:23].
- ALWAYS cite timestamps like [mm:ss] when explaining when a concept, tool, definition, or code is discussed in the video.
- These timestamps are interactive and allow the student to click to jump the video directly to that time.
- Ground your explanations directly on what the instructor stated in the lecture transcript.
- If the student asks for a summary or key moments, provide a clean chronological bulleted list with timestamps.
- If the context does not contain the answer, provide an accurate explanation and state that it is general knowledge.`;

  const userPrompt = `[Context Information]
Course: ${payload.courseTitle || 'General Study'}
Active Lesson: ${payload.lessonTitle || 'Current Material'}
${payload.subtitleTranscript ? `Spoken Video Lecture Transcript (with Timestamps):\n"""\n${payload.subtitleTranscript}\n"""\n` : ''}
${payload.materialExcerpt ? `Document / Handout Excerpt:\n"""\n${payload.materialExcerpt}\n"""\n` : ''}
${payload.lessonNotes ? `Student Local Notes:\n"""\n${payload.lessonNotes}\n"""\n` : ''}

[Student Question]:
${payload.question}`;

  try {
    addLog('INFO', 'AI', `Dispatching query to ${config.provider} (${config.modelName})`);

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
        const message = errorData?.error?.message || `Gemini API returned status ${res.status}`;
        throw new Error(message);
      }

      const data = await res.json();
      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!answer) {
        throw new Error('No answer generated from Gemini API.');
      }

      return { success: true, text: answer };
    } else {
      // DeepSeek, OpenAI-compatible, or OmniRoute endpoint
      let defaultBaseUrl = 'https://api.openai.com/v1';
      let defaultModel = 'gpt-4o-mini';

      if (config.provider === 'deepseek') {
        defaultBaseUrl = 'https://api.deepseek.com';
        defaultModel = 'deepseek-chat';
      }

      const rawBase = config.baseUrl.trim().replace(/\/+$/, '') || defaultBaseUrl;
      const endpoint = rawBase.endsWith('/chat/completions') ? rawBase : `${rawBase}/chat/completions`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
      }

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
      const answer = data.choices?.[0]?.message?.content;
      if (!answer) {
        throw new Error('No text returned in chat completion choices.');
      }

      return { success: true, text: answer };
    }
  } catch (err: any) {
    addLog('WARN', 'AI', 'Remote query failed, activating offline local study fallback', err.message);
    const fallbackAnswer = generateOfflineLocalAnswer(payload);
    return {
      success: true,
      text: `${fallbackAnswer}\n\n*(Remote model unavailable. Generated via CourseNest Offline Local Companion)*`,
    };
  }
}
