import { useState, useEffect } from 'react';
import { addLog } from './logger';

export type AiProvider = 'gemini' | 'openai-compatible' | 'omniroute';

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
}

export interface AiQueryResponse {
  success: boolean;
  text: string;
  error?: string;
}

/**
 * Executes a question against either Google Gemini or an OpenAI-compatible/OmniRoute endpoint.
 * Keeps student laptops 100% responsive: runs lightweight network fetch with zero local RAM/GPU consumption.
 */
export async function askAiAssistant(payload: AiQueryPayload): Promise<AiQueryResponse> {
  const config = getAiConfig();

  if (!config.apiKey && config.provider !== 'omniroute') {
    return {
      success: false,
      text: '',
      error: 'No API key configured. Enter your Gemini Pro or OmniRoute API key in Settings > AI Companion.',
    };
  }

  if (!navigator.onLine) {
    return {
      success: false,
      text: '',
      error: 'You are currently in offline mode. The AI Assistant requires an active internet or campus LAN connection.',
    };
  }

  const systemPrompt = `You are the CourseNest AI Academic Reading Companion.
Your role is to help students understand course materials, lecture transcripts, and PDF handouts clearly, concisely, and encouragingly.
Ground your answers directly on the provided lesson context and reading excerpts whenever relevant.
Format your answer using clean markdown (bold terms, bullet points, concise code blocks if applicable).
If the context does not contain the answer, provide an accurate explanation and state that it is general knowledge.`;

  const userPrompt = `[Context Information]
Course: ${payload.courseTitle || 'General Study'}
Active Lesson: ${payload.lessonTitle || 'Current Material'}
${payload.materialExcerpt ? `Document / Handout Excerpt:\n"""\n${payload.materialExcerpt}\n"""` : ''}
${payload.lessonNotes ? `Student Local Notes:\n"""\n${payload.lessonNotes}\n"""` : ''}

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
      // OpenAI-compatible or OmniRoute endpoint
      const baseUrl = config.baseUrl.trim().replace(/\/+$/, '') || 'https://api.openai.com/v1';
      const endpoint = `${baseUrl}/chat/completions`;

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
          model: config.modelName || 'gpt-4o-mini',
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
    addLog('ERROR', 'AI', 'Query execution failed', err.message);
    return {
      success: false,
      text: '',
      error: err.message || 'An unexpected error occurred while communicating with the AI model.',
    };
  }
}
