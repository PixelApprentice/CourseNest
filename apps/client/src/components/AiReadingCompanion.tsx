import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  IconBrain, 
  IconSend, 
  IconCopy, 
  IconCheck, 
  IconBookmarkPlus, 
  IconWifiOff, 
  IconKey, 
  IconSettings, 
  IconCpu,
  IconBadgeCc,
  IconPlayerPlay
} from '@tabler/icons-react';
import { useAiConfig, askAiAssistant, type AiQueryPayload } from '../lib/aiConfig';
import { saveUserNote, getUserNotes } from '../lib/courseStore';
import { addLog } from '../lib/logger';
import { timestampToSeconds } from '../lib/formatHelpers';
import { StatusBadge } from './StatusBadge';
import clsx from 'clsx';

export interface AiReadingCompanionProps {
  courseTitle?: string;
  lessonTitle?: string;
  lessonId?: string;
  activeDocumentText?: string;
  subtitleTranscript?: string;
  onSeekTo?: (seconds: number) => void;
  onAppendNote?: (text: string) => void;
  className?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  error?: boolean;
}

export function AiReadingCompanion({
  courseTitle,
  lessonTitle,
  lessonId,
  activeDocumentText,
  subtitleTranscript,
  onSeekTo,
  onAppendNote,
  className,
}: AiReadingCompanionProps) {
  const { config } = useAiConfig();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: subtitleTranscript 
        ? `Hello! I am your Study Companion. 
I have the **spoken lecture transcript with timestamps** ready for **${lessonTitle || 'this video'}**. Ask me any question, or request a summary, and click any timestamp [mm:ss] to jump directly to that point in the lecture!`
        : `Hello! I am your Study Companion. 
I can analyze reading materials for **${lessonTitle || 'this lesson'}**, answer questions on complex concepts, or generate quick practice questions.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);

  const isOnline = navigator.onLine;
  const hasKey = Boolean(config.apiKey) || config.provider === 'omniroute';

  const renderTimestampedText = (text: string) => {
    const parts = text.split(/(\[\d{1,2}:\d{2}(?::\d{2})?\])/g);
    if (parts.length === 1) return text;

    return parts.map((part, index) => {
      const match = part.match(/^\[(\d{1,2}:\d{2}(?::\d{2})?)\]$/);
      if (match && match[1]) {
        const ts = match[1];
        const sec = timestampToSeconds(ts);
        return (
          <button
            key={index}
            type="button"
            onClick={() => onSeekTo?.(sec)}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border border-[var(--cn-primary)]/40 hover:bg-[var(--cn-primary)] hover:text-white font-mono text-[11px] font-bold transition-all mx-0.5 shadow-xs group cursor-pointer"
            title={`Jump video player to ${ts}`}
          >
            <IconPlayerPlay size={10} className="group-hover:translate-x-0.5 transition-transform shrink-0" />
            <span>{ts}</span>
          </button>
        );
      }
      return part;
    });
  };

  const handleAsk = async (questionText: string) => {
    const q = questionText.trim();
    if (!q || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setIsLoading(true);

    const payload: AiQueryPayload = {
      question: q,
      courseTitle,
      lessonTitle,
      lessonNotes: lessonId ? getUserNotes(lessonId) : undefined,
      materialExcerpt: activeDocumentText?.slice(0, 4000),
      subtitleTranscript: subtitleTranscript?.slice(0, 14000),
    };

    const res = await askAiAssistant(payload);

    setIsLoading(false);

    if (res.success) {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'assistant',
          text: res.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          sender: 'assistant',
          text: res.error || 'Failed to receive response from AI model.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          error: true,
        },
      ]);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveToNotes = (id: string, text: string) => {
    if (!lessonId) return;
    const existing = getUserNotes(lessonId);
    const newNote = existing 
      ? `${existing}\n\n--- [Study Note] ---\n${text}`
      : `--- [Study Note] ---\n${text}`;
    saveUserNote(lessonId, newNote);
    if (onAppendNote) onAppendNote(newNote);
    setSavedNoteId(id);
    addLog('INFO', 'AI', `Study note saved to lesson: ${lessonTitle}`);
    setTimeout(() => setSavedNoteId(null), 2500);
  };

  const quickPrompts = subtitleTranscript
    ? [
        { label: 'Video Timestamps', prompt: 'Provide a chronological breakdown of this lecture with exact timestamps [mm:ss] for each topic covered.' },
        { label: 'Summarize Video', prompt: 'Summarize the core concepts explained in this video lecture, citing relevant timestamps.' },
        { label: 'Key Definitions', prompt: 'What key technical terms are defined in this lecture? Include timestamps where each is introduced.' },
      ]
    : [
        { label: 'Summarize Excerpt', prompt: 'Provide a concise 3-bullet summary of this lesson reading material.' },
        { label: 'Key Formulas / Terms', prompt: 'Extract and define the key terms and formulas mentioned in this material.' },
        { label: 'Practice Quiz', prompt: 'Generate 3 multiple-choice study questions with explanations based on this reading material.' },
      ];

  return (
    <div className={clsx('flex flex-col h-full bg-[var(--cn-surface)] border-l border-[var(--cn-border)]', className)}>
      {/* Header */}
      <div className="p-4 border-b border-[var(--cn-border)] bg-[var(--cn-surface-subtle)]/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <IconBrain size={16} className="text-[var(--cn-primary)]" />
          <h3 className="text-xs font-bold font-mono tracking-wider uppercase text-[var(--cn-text-primary)]">
            Study Companion
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {hasKey && isOnline ? (
            <StatusBadge tone="success" size="sm" label={config.provider === 'gemini' ? 'Gemini' : config.provider} showDot={true} />
          ) : !isOnline ? (
            <StatusBadge tone="warning" size="sm" label="Offline" showDot={true} />
          ) : (
            <StatusBadge tone="neutral" size="sm" label="No Key" showDot={false} />
          )}

          <Link
            to="/settings"
            className="p-1 rounded text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)] hover:bg-[var(--cn-surface)] transition-colors"
            title="Configure in Settings"
          >
            <IconSettings size={15} />
          </Link>
        </div>
      </div>

      {/* Zero Local GPU/RAM Footprint Banner */}
      <div className="px-4 py-2 bg-[var(--cn-bg)] border-b border-[var(--cn-border)] flex items-center gap-2 text-[10px] font-mono text-[var(--cn-text-muted)]">
        <IconCpu size={13} className="text-[var(--cn-primary)] shrink-0" />
        <span className="line-clamp-1">Lightweight API assistance (runs smoothly on budget hardware)</span>
      </div>

      {/* Subtitle Transcript Active Badge */}
      {subtitleTranscript && (
        <div className="px-4 py-2 bg-[var(--cn-surface-subtle)] border-b border-[var(--cn-border)] flex items-center justify-between text-[11px] font-mono text-[var(--cn-text-secondary)]">
          <span className="flex items-center gap-1.5 text-[var(--cn-primary)] font-semibold">
            <IconBadgeCc size={15} />
            <span>Lecture Transcript Connected</span>
          </span>
          <span className="text-[10px] text-[var(--cn-text-muted)]">
            Click timestamps to jump video
          </span>
        </div>
      )}

      {/* Key Missing Alert */}
      {!hasKey && (
        <div className="m-3 p-3.5 rounded-xl border border-[var(--cn-accent)]/30 bg-[var(--cn-accent-tint)] space-y-2 text-xs">
          <div className="flex items-center gap-2 font-semibold text-[var(--cn-accent)]">
            <IconKey size={14} />
            <span>Optional API Key</span>
          </div>
          <p className="text-[11px] text-[var(--cn-text-secondary)] leading-relaxed">
            CourseNest runs 100% offline for reading, video playback, and notes. If you want AI assistance, you can connect a free Gemini API key in Settings.
          </p>
          <Link
            to="/settings"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-[var(--cn-accent)] underline hover:opacity-80"
          >
            Configure in Settings &rarr;
          </Link>
        </div>
      )}

      {/* Offline Mode Alert */}
      {!isOnline && (
        <div className="m-3 p-3 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)] space-y-1.5 text-xs">
          <div className="flex items-center gap-2 font-semibold text-[var(--cn-text-muted)]">
            <IconWifiOff size={14} />
            <span>Offline Mode Active</span>
          </div>
          <p className="text-[11px] text-[var(--cn-text-muted)] leading-relaxed">
            All video playback, documents, quizzes, and notes remain 100% accessible offline.
          </p>
        </div>
      )}

      {/* Chat Messages Body */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={clsx(
              'flex flex-col space-y-1.5 max-w-[90%]',
              m.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start',
            )}
          >
            <div
              className={clsx(
                'rounded-xl p-3 leading-relaxed whitespace-pre-wrap transition-colors',
                m.sender === 'user'
                  ? 'bg-[var(--cn-primary)] text-white font-medium rounded-tr-xs'
                  : m.error
                  ? 'bg-red-500/10 border border-red-500/25 text-red-500 rounded-tl-xs'
                  : 'bg-[var(--cn-surface-subtle)] border border-[var(--cn-border)] text-[var(--cn-text-primary)] rounded-tl-xs',
              )}
            >
              {m.sender === 'assistant' ? renderTimestampedText(m.text) : m.text}
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--cn-text-muted)] px-1">
              <span>{m.timestamp}</span>

              {m.sender === 'assistant' && !m.error && (
                <>
                  <button
                    onClick={() => handleCopy(m.id, m.text)}
                    className="hover:text-[var(--cn-text-primary)] flex items-center gap-0.5 transition-colors"
                    title="Copy response"
                  >
                    {copiedId === m.id ? <IconCheck size={11} className="text-[var(--cn-success)]" /> : <IconCopy size={11} />}
                    <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                  </button>

                  {lessonId && (
                    <button
                      onClick={() => handleSaveToNotes(m.id, m.text)}
                      className="hover:text-[var(--cn-primary)] flex items-center gap-0.5 transition-colors"
                      title="Save answer into Lesson Notes"
                    >
                      {savedNoteId === m.id ? <IconCheck size={11} className="text-[var(--cn-success)]" /> : <IconBookmarkPlus size={11} />}
                      <span>{savedNoteId === m.id ? 'Saved' : 'Save to Notes'}</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--cn-text-muted)] p-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--cn-primary)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--cn-primary)]"></span>
            </span>
            <span>Analyzing material...</span>
          </div>
        )}
      </div>

      {/* Quick Action Prompt Chips */}
      <div className="p-3 border-t border-[var(--cn-border)] bg-[var(--cn-surface-subtle)]/30 space-y-2 shrink-0">
        <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--cn-text-muted)]">
          Quick Inquiries
        </p>
        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleAsk(qp.prompt)}
              disabled={isLoading || !isOnline}
              className="text-[11px] px-2.5 py-1 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface)] text-[var(--cn-text-secondary)] hover:border-[var(--cn-primary)] hover:text-[var(--cn-primary)] hover:bg-[var(--cn-surface-subtle)] disabled:opacity-50 transition-colors"
            >
              {qp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Bar */}
      <div className="p-3 border-t border-[var(--cn-border)] bg-[var(--cn-surface)] shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk(inputQuestion);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            placeholder={
              !isOnline
                ? 'Offline - queries pause until reconnected'
                : 'Ask a question about this material...'
            }
            disabled={isLoading || !isOnline}
            className="flex-1 px-3 py-2 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs text-[var(--cn-text-primary)] focus:outline-none focus:border-[var(--cn-primary)] transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputQuestion.trim() || isLoading || !isOnline}
            className="p-2 rounded-lg bg-[var(--cn-primary)] text-white hover:bg-[var(--cn-primary-hover)] disabled:opacity-40 transition-colors shrink-0"
            title="Send query"
          >
            <IconSend size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
