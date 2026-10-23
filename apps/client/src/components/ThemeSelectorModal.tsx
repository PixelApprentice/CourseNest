import { useEffect } from 'react';
import { ThemeSelectorGrid } from './ThemeSelectorGrid';
import { IconPalette, IconX, IconBrush } from '@tabler/icons-react';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ThemeSelectorModal({ isOpen, onClose }: ThemeSelectorModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border border-[var(--cn-border)] bg-[var(--cn-surface)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-[var(--cn-border)] flex items-center justify-between bg-[var(--cn-surface-subtle)]/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border border-[var(--cn-primary)]/20 shadow-xs">
              <IconPalette size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight text-[var(--cn-text-primary)]">
                  Visual Theme & Aesthetic Studio
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border border-[var(--cn-primary)]/30">
                  <IconBrush size={11} />
                  9 Curated Styles
                </span>
              </div>
              <p className="text-xs text-[var(--cn-text-muted)]">
                Transform colors, open-source typography, and custom animations for your personal study vibe
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)] hover:bg-[var(--cn-surface-subtle)] border border-transparent hover:border-[var(--cn-border)] transition-colors"
            title="Close theme studio"
            aria-label="Close theme studio"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <ThemeSelectorGrid onThemeSelected={() => {}} />
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[var(--cn-border)] bg-[var(--cn-surface-subtle)]/30 flex items-center justify-between text-xs font-mono text-[var(--cn-text-muted)] shrink-0">
          <span>Themes are saved offline in your local vault with 0% cloud tracking</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[var(--cn-primary)] text-[var(--cn-primary-text)] font-semibold hover:opacity-95 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
