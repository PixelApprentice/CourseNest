import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  IconBrain, 
  IconSend, 
  IconCopy, 
  IconCheck, 
  IconBookmarkPlus, 
  IconSettings, 
  IconBadgeCc,
  IconPlayerPlay,
  IconVolume,
  IconVolumeOff,
  IconCards,
  IconPresentation,
  IconTool,
  IconSparkles,
  IconChevronDown,
  IconChevronUp
} from '@tabler/icons-react';
import { 
  useAiConfig, 
  askAiAssistant, 
  type AiQueryPayload, 
  type PedagogicalMode 
} from '../lib/aiConfig';
import { saveUserNote, getUserNotes } from '../lib/courseStore';
import { addLog } from '../lib/logger';
import { timestampToSeconds } from '../lib/formatHelpers';
import { useAudible } from '../lib/audibleSuite';
import { FlashcardDeckModal } from './FlashcardDeckModal';
import clsx from 'clsx';

export interface AiReadingCompanionProps {
  courseTitle?: string;
  courseId?: string;
  lessonTitle?: string;
  lessonId?: string;
  activeDocumentText?: string;
  subtitleTranscript?: string;
  slidesData?: Array<{ slideNumber: number; title: string; bullets: string[]; speakerNotes?: string }>;
  onSeekTo?: (seconds: number) => void;
  onNavigateSlide?: (slideNumber: number) => void;
  onAppendNote?: (text: string) => void;
  className?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  error?: boolean;
  executedActions?: Array<{ tool: string; summary: string }>;
  groundedSources?: Array<{ citation: string; excerpt: string }>;
}

export function AiReadingCompanion({
  courseTitle,
  courseId = 'active-course',
  lessonTitle,
  lessonId = 'active-lesson',
  activeDocumentText,
  subtitleTranscript,
  slidesData,
  onSeekTo,
  onNavigateSlide,
  onAppendNote,
  className,
}: AiReadingCompanionProps) {
  const { config, updateConfig } = useAiConfig();
  const [pedagogicalMode, setPedagogicalMode] = useState<PedagogicalMode>(config.pedagogicalMode || 'socratic');
  const [showFlashcardsModal, setShowFlashcardsModal] = useState(false);
  const [expandedSourcesMessageId, setExpandedSourcesMessageId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: subtitleTranscript 
        ? `Hello! I am your AI Study Companion with **In-Browser RAG & Tool Calling**.
I have indexed the **spoken transcript** for **${lessonTitle || 'this video'}**. Click any timestamp like [mm:ss] to jump the video directly, ask for a Socratic concept breakdown, or generate active-recall flashcards!`
        : `Hello! I am your AI Study Companion. 
I have indexed the reading materials for **${lessonTitle || 'this lesson'}**. Ask me conceptual questions, request key formulas, or generate flashcards for your review deck!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const { speak, stop, isSpeaking } = useAudible();

  const handleModeChange = (mode: PedagogicalMode) => {
    setPedagogicalMode(mode);
    updateConfig({ ...config, pedagogicalMode: mode });
  };

  /**
   * Renders interactive citation chips:
   * 1. [mm:ss] -> Jumps video player
   * 2. [Slide X] -> Flips presentation viewer
   */
  const renderInteractiveText = (text: string) => {
    // Regex splits by [mm:ss] OR [Slide X]
    const regex = /(\[\d{1,2}:\d{2}(?::\d{2})?\]|\[Slide\s+\d+\])/g;
    const parts = text.split(regex);
    if (parts.length === 1) return text;

    return parts.map((part, index) => {
      // Check for timestamp: [01:23]
      const tsMatch = part.match(/^\[(\d{1,2}:\d{2}(?::\d{2})?)\]$/);
      if (tsMatch && tsMatch[1]) {
        const ts = tsMatch[1];
        const sec = timestampToSeconds(ts);
        return (
          <button
            key={index}
            type="button"
            onClick={() => onSeekTo?.(sec)}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border border-[var(--cn-primary)]/40 hover:bg-[var(--cn-primary)] hover:text-white font-mono text-[11px] font-bold transition-[background-color,color,border-color,transform] duration-150 ease-out active:scale-95 mx-0.5 shadow-xs group cursor-pointer"
            title={`Jump video player to ${ts}`}
          >
            <IconPlayerPlay size={10} className="group-hover:translate-x-0.5 transition-transform shrink-0" />
            <span>{ts}</span>
          </button>
        );
      }

      // Check for slide badge: [Slide 4]
      const slideMatch = part.match(/^\[Slide\s+(\d+)\]$/i);
      if (slideMatch && slideMatch[1]) {
        const slideNum = parseInt(slideMatch[1], 10);
        return (
          <button
            key={index}
            type="button"
            onClick={() => onNavigateSlide?.(slideNum)}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/40 hover:bg-amber-500 hover:text-white font-mono text-[11px] font-bold transition-[background-color,color,border-color,transform] duration-150 ease-out active:scale-95 mx-0.5 shadow-xs cursor-pointer"
            title={`Jump presentation to Slide ${slideNum}`}
          >
            <IconPresentation size={11} className="shrink-0" />
            <span>Slide {slideNum}</span>
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
      courseId,
      lessonTitle,
      lessonId,
      lessonNotes: lessonId ? getUserNotes(lessonId) : undefined,
      materialExcerpt: activeDocumentText,
      subtitleTranscript,
      slidesData,
      pedagogicalMode,
      onSeekTo,
      onNavigateSlide,
      onAppendNote,
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
          executedActions: res.executedActions,
          groundedSources: res.groundedSources,
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

  const quickPrompts = [
    { label: '🃏 Generate Flashcards', prompt: 'Generate 2 active-recall flashcards for my study review deck based on this lesson.' },
    { label: '⏱️ Video Citations', prompt: 'Provide key timestamps [mm:ss] where core definitions and formulas are explained.' },
    { label: '💡 Socratic Guidance', prompt: 'What is the most challenging conceptual leap in this lesson, and what hints should I consider?' },
  ];

  return (
    <div className={clsx('flex flex-col h-full bg-[var(--cn-surface)] border-l border-[var(--cn-border)]', className)}>
      {/* Header */}
      <div className="p-3.5 border-b border-[var(--cn-border)] bg-[var(--cn-surface-subtle)]/70 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] flex items-center justify-center">
            <IconBrain size={14} />
          </div>
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wider uppercase text-[var(--cn-text-primary)]">
              Study Companion
            </h3>
            <span className="text-[10px] text-[var(--cn-text-muted)] font-mono">
              In-Browser RAG & Tools
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Flashcards Deck Button */}
          <button
            type="button"
            onClick={() => setShowFlashcardsModal(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface)] text-[var(--cn-text-secondary)] hover:text-[var(--cn-primary)] hover:border-[var(--cn-primary)]/40 text-[11px] font-mono transition-colors active:scale-95 cursor-pointer shadow-xs"
            title="Open Active Recall Flashcard Deck"
          >
            <IconCards size={13} className="text-[var(--cn-primary)]" />
            <span className="font-bold">Cards</span>
          </button>

          <Link
            to="/settings"
            className="p-1 rounded text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)] hover:bg-[var(--cn-surface)] transition-colors"
            title="Configure in Settings"
          >
            <IconSettings size={15} />
          </Link>
        </div>
      </div>

      {/* Pedagogical Tutoring Mode Selector */}
      <div className="px-3.5 py-1.5 bg-[var(--cn-bg)] border-b border-[var(--cn-border)] flex items-center justify-between text-[11px] font-mono">
        <span className="text-[10px] text-[var(--cn-text-muted)] uppercase tracking-wider font-semibold">
          Tutoring Mode:
        </span>
        <div className="flex items-center gap-1 bg-[var(--cn-surface)] rounded-md p-0.5 border border-[var(--cn-border)]">
          <button
            type="button"
            onClick={() => handleModeChange('socratic')}
            className={clsx(
              'px-2 py-0.5 rounded text-[10px] transition-colors',
              pedagogicalMode === 'socratic'
                ? 'bg-[var(--cn-primary)] text-white font-bold'
                : 'text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)]'
            )}
            title="Socratic Tutor: Guides with hints and questions"
          >
            Socratic
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('reference')}
            className={clsx(
              'px-2 py-0.5 rounded text-[10px] transition-colors',
              pedagogicalMode === 'reference'
                ? 'bg-[var(--cn-primary)] text-white font-bold'
                : 'text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)]'
            )}
            title="Technical Reference: Dense bullet facts and timestamps"
          >
            Reference
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('quiz')}
            className={clsx(
              'px-2 py-0.5 rounded text-[10px] transition-colors',
              pedagogicalMode === 'quiz'
                ? 'bg-[var(--cn-primary)] text-white font-bold'
                : 'text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)]'
            )}
            title="Active Recall Quiz: Generates self-test questions"
          >
            Quiz
          </button>
        </div>
      </div>

      {/* Subtitle / Slide Provenance Indicator */}
      {(subtitleTranscript || slidesData) && (
        <div className="px-3.5 py-1.5 bg-[var(--cn-surface-subtle)] border-b border-[var(--cn-border)] flex items-center justify-between text-[10px] font-mono text-[var(--cn-text-secondary)]">
          <span className="flex items-center gap-1.5 text-[var(--cn-primary)] font-semibold">
            {subtitleTranscript ? <IconBadgeCc size={13} /> : <IconPresentation size={13} />}
            <span>{subtitleTranscript ? 'Transcript Connected' : 'Slide Deck Connected'}</span>
          </span>
          <span className="text-[10px] text-[var(--cn-text-muted)]">
            Click [mm:ss] or [Slide X] to navigate
          </span>
        </div>
      )}

      {/* Chat Messages Body */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 text-xs select-text">
        {messages.map((m) => (
          <div
            key={m.id}
            className={clsx(
              'flex flex-col space-y-1.5 max-w-[92%]',
              m.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start',
            )}
          >
            {/* Executed In-App Tool Badges */}
            {m.executedActions && m.executedActions.length > 0 && (
              <div className="space-y-1 w-full mb-1">
                {m.executedActions.map((act, i) => (
                  <div
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--cn-primary-tint)] border border-[var(--cn-primary)]/30 text-[var(--cn-primary)] text-[10px] font-mono font-semibold"
                  >
                    <IconTool size={11} className="shrink-0" />
                    <span>Action: {act.summary}</span>
                  </div>
                ))}
              </div>
            )}

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
              {m.sender === 'assistant' ? renderInteractiveText(m.text) : m.text}
            </div>

            {/* Grounded Sources Collapsible */}
            {m.groundedSources && m.groundedSources.length > 0 && (
              <div className="w-full text-[10px] font-mono pt-0.5">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedSourcesMessageId(expandedSourcesMessageId === m.id ? null : m.id)
                  }
                  className="flex items-center gap-1 text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)]"
                >
                  <IconSparkles size={11} className="text-amber-500" />
                  <span>{m.groundedSources.length} Grounded Excerpts</span>
                  {expandedSourcesMessageId === m.id ? <IconChevronUp size={11} /> : <IconChevronDown size={11} />}
                </button>

                {expandedSourcesMessageId === m.id && (
                  <div className="mt-1 p-2 rounded-lg bg-[var(--cn-bg)] border border-[var(--cn-border)] space-y-1.5">
                    {m.groundedSources.map((g, i) => (
                      <div key={i} className="space-y-0.5">
                        <span className="font-bold text-[var(--cn-primary)]">{g.citation}:</span>
                        <p className="text-[10px] text-[var(--cn-text-secondary)] italic line-clamp-2">
                          "{g.excerpt}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Message Action Bar */}
            <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--cn-text-muted)] px-1">
              <span>{m.timestamp}</span>

              {m.sender === 'assistant' && !m.error && (
                <>
                  <button
                    onClick={() => {
                      if (speakingMessageId === m.id && isSpeaking) {
                        stop();
                        setSpeakingMessageId(null);
                      } else {
                        setSpeakingMessageId(m.id);
                        speak(m.text);
                      }
                    }}
                    className="hover:text-[var(--cn-text-primary)] flex items-center gap-1 transition-colors"
                    title={speakingMessageId === m.id && isSpeaking ? 'Stop narration' : 'Listen aloud'}
                  >
                    {speakingMessageId === m.id && isSpeaking ? (
                      <IconVolumeOff size={12} className="text-[var(--cn-primary)] animate-pulse" />
                    ) : (
                      <IconVolume size={12} />
                    )}
                    <span>{speakingMessageId === m.id && isSpeaking ? 'Stop' : 'Listen'}</span>
                  </button>

                  <button
                    onClick={() => handleCopy(m.id, m.text)}
                    className="hover:text-[var(--cn-text-primary)] flex items-center gap-1 transition-colors"
                    title="Copy response"
                  >
                    {copiedId === m.id ? <IconCheck size={12} className="text-emerald-500" /> : <IconCopy size={12} />}
                    <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={() => handleSaveToNotes(m.id, m.text)}
                    className="hover:text-[var(--cn-text-primary)] flex items-center gap-1 transition-colors"
                    title="Save to lesson notes"
                  >
                    {savedNoteId === m.id ? (
                      <IconCheck size={12} className="text-emerald-500" />
                    ) : (
                      <IconBookmarkPlus size={12} />
                    )}
                    <span>{savedNoteId === m.id ? 'Saved' : 'Save Note'}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="mr-auto items-start flex flex-col space-y-1">
            <div className="rounded-xl p-3 bg-[var(--cn-surface-subtle)] border border-[var(--cn-border)] flex items-center gap-2 text-xs text-[var(--cn-text-muted)] font-mono">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-[var(--cn-primary)] border-t-transparent animate-spin" />
              <span>Synthesizing with vector RAG & tools...</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Prompts Bar */}
      <div className="p-2 border-t border-[var(--cn-border)] bg-[var(--cn-bg)]/80 flex gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
        {quickPrompts.map((qp, i) => (
          <button
            key={i}
            type="button"
            disabled={isLoading}
            onClick={() => handleAsk(qp.prompt)}
            className="px-2.5 py-1 rounded-lg bg-[var(--cn-surface)] border border-[var(--cn-border)] hover:border-[var(--cn-primary)]/40 hover:text-[var(--cn-primary)] text-[10px] font-mono text-[var(--cn-text-secondary)] whitespace-nowrap transition-colors disabled:opacity-50 active:scale-95 shrink-0"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk(inputQuestion);
        }}
        className="p-3 border-t border-[var(--cn-border)] bg-[var(--cn-surface-subtle)]/50 shrink-0"
      >
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            placeholder={`Ask in ${pedagogicalMode} mode...`}
            disabled={isLoading}
            className="w-full pl-3 pr-10 py-2 rounded-xl bg-[var(--cn-bg)] border border-[var(--cn-border)] text-xs text-[var(--cn-text-primary)] placeholder-[var(--cn-text-muted)] focus:outline-none focus:border-[var(--cn-primary)] transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputQuestion.trim() || isLoading}
            className="absolute right-1.5 p-1.5 rounded-lg bg-[var(--cn-primary)] text-white hover:opacity-90 disabled:opacity-30 disabled:hover:opacity-30 transition-all active:scale-95 cursor-pointer shadow-xs"
            title="Send question"
          >
            <IconSend size={13} />
          </button>
        </div>
      </form>

      {/* Flashcard Deck Modal */}
      {showFlashcardsModal && (
        <FlashcardDeckModal
          courseId={courseId}
          lessonId={lessonId}
          courseTitle={courseTitle}
          lessonTitle={lessonTitle}
          onClose={() => setShowFlashcardsModal(false)}
          onSeekTo={(sec) => onSeekTo?.(sec)}
        />
      )}
    </div>
  );
}
