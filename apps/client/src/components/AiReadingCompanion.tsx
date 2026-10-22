import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  Send, 
  Copy, 
  Check, 
  BookmarkPlus, 
  WifiOff, 
  Key, 
  Settings, 
  Cpu
} from 'lucide-react';
import { useAiConfig, askAiAssistant, type AiQueryPayload } from '../lib/aiConfig';
import { saveUserNote, getUserNotes } from '../lib/courseStore';
import { addLog } from '../lib/logger';
import { StatusBadge } from './StatusBadge';
import clsx from 'clsx';

export interface AiReadingCompanionProps {
  courseTitle?: string;
  lessonTitle?: string;
  lessonId?: string;
  activeDocumentText?: string;
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
  onAppendNote,
  className,
}: AiReadingCompanionProps) {
  const { config } = useAiConfig();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am your AI Reading & Study Companion. 
I can analyze the reading materials for **${lessonTitle || 'this lesson'}**, answer questions on difficult passages, or generate quick self-assessment questions.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);

  const isOnline = navigator.onLine;
  const hasKey = Boolean(config.apiKey) || config.provider === 'omniroute';

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
      materialExcerpt: activeDocumentText?.slice(0, 4000), // send up to 4k chars of context
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
      ? `${existing}\n\n--- [AI Study Note] ---\n${text}`
      : `--- [AI Study Note] ---\n${text}`;
    saveUserNote(lessonId, newNote);
    if (onAppendNote) onAppendNote(newNote);
    setSavedNoteId(id);
    addLog('INFO', 'AI', `Study note saved to lesson: ${lessonTitle}`);
    setTimeout(() => setSavedNoteId(null), 2500);
  };

  const quickPrompts = [
    { label: 'Summarize Excerpt', prompt: 'Provide a concise 3-bullet summary of this lesson reading material.' },
    { label: 'Key Formulas / Terms', prompt: 'Extract and define the key terms and formulas mentioned in this material.' },
    { label: 'Practice Quiz', prompt: 'Generate 3 multiple-choice study questions with explanations based on this reading material.' },
  ];

  return (
    <div className={clsx('flex flex-col h-full bg-[var(--cn-surface)] border-l border-[var(--cn-border)]', className)}>
      {/* Header */}
      <div className="p-4 border-b border-[var(--cn-border)] bg-[var(--cn-surface-subtle)]/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[var(--cn-primary)]" />
          <h3 className="text-xs font-bold font-mono tracking-wider uppercase text-[var(--cn-text-primary)]">
            AI Reading Companion
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {hasKey && isOnline ? (
            <StatusBadge tone="success" size="sm" label={config.provider === 'gemini' ? 'Gemini Pro' : config.provider} showDot={true} />
          ) : !isOnline ? (
            <StatusBadge tone="warning" size="sm" label="Offline" showDot={true} />
          ) : (
            <StatusBadge tone="neutral" size="sm" label="No Key" showDot={false} />
          )}

          <Link
            to="/settings"
            className="p-1 rounded text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)] hover:bg-[var(--cn-surface)] transition-colors"
            title="Configure AI API in Settings"
          >
            <Settings size={14} />
          </Link>
        </div>
      </div>

      {/* Hardware / Low-End Laptop Guarantee Banner */}
      <div className="px-4 py-2 bg-[var(--cn-bg)] border-b border-[var(--cn-border)] flex items-center gap-2 text-[10px] font-mono text-[var(--cn-text-muted)]">
        <Cpu size={12} className="text-[var(--cn-primary)] shrink-0" />
        <span className="line-clamp-1">Zero local RAM/GPU footprint (lightweight cloud API companion)</span>
      </div>

      {/* Key Missing Warning if needed */}
      {!hasKey && (
        <div className="m-3 p-3.5 rounded-xl border border-[var(--cn-accent)]/30 bg-[var(--cn-accent-tint)] space-y-2 text-xs">
          <div className="flex items-center gap-2 font-semibold text-[var(--cn-accent)]">
            <Key size={14} />
            <span>BYO-API Key Recommended</span>
          </div>
          <p className="text-[11px] text-[var(--cn-text-secondary)] leading-relaxed">
            CourseNest never forces heavy local models (like Ollama) that would overheat or slow down your laptop. You can optionally connect your free Google Gemini API key or campus OmniRoute URL.
          </p>
          <Link
            to="/settings"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-[var(--cn-accent)] underline hover:opacity-80"
          >
            Configure in Settings &rarr;
          </Link>
        </div>
      )}

      {/* Offline Warning if disconnected */}
      {!isOnline && (
        <div className="m-3 p-3 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)] space-y-1.5 text-xs">
          <div className="flex items-center gap-2 font-semibold text-[var(--cn-text-muted)]">
            <WifiOff size={14} />
            <span>Offline-First Mode Active</span>
          </div>
          <p className="text-[11px] text-[var(--cn-text-muted)] leading-relaxed">
            All your video playback, reading, quizzes, and notes remain 100% accessible offline. AI queries will resume whenever an internet connection is detected.
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
              {m.text}
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
                    {copiedId === m.id ? <Check size={11} className="text-[var(--cn-success)]" /> : <Copy size={11} />}
                    <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                  </button>

                  {lessonId && (
                    <button
                      onClick={() => handleSaveToNotes(m.id, m.text)}
                      className="hover:text-[var(--cn-primary)] flex items-center gap-0.5 transition-colors"
                      title="Save answer into Lesson Notes"
                    >
                      {savedNoteId === m.id ? <Check size={11} className="text-[var(--cn-success)]" /> : <BookmarkPlus size={11} />}
                      <span>{savedNoteId === m.id ? 'Saved to Notes' : 'Save to Notes'}</span>
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
            <span>Synthesizing material analysis...</span>
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
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
