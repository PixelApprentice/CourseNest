import React, { useState, useEffect, useRef } from 'react';
import { IconLock, IconEye, IconEyeOff, IconAlertTriangle, IconLoader2, IconX, IconShieldCheck } from '@tabler/icons-react';

interface ArchivePasswordModalProps {
  isOpen: boolean;
  archiveName: string;
  errorMessage?: string | null;
  isLoading?: boolean;
  onSubmit: (password: string, rememberForCourse: boolean) => void;
  onCancel: () => void;
}

export const ArchivePasswordModal: React.FC<ArchivePasswordModalProps> = ({
  isOpen,
  archiveName,
  errorMessage = null,
  isLoading = false,
  onSubmit,
  onCancel,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberForCourse, setRememberForCourse] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setShowPassword(false);
      setRememberForCourse(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, archiveName]);

  useEffect(() => {
    if (isOpen && errorMessage) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [errorMessage, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isLoading) return;
    onSubmit(password, rememberForCourse);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-[var(--cn-surface)] border-2 border-[var(--cn-border)] rounded-xl shadow-2xl overflow-hidden text-[var(--cn-text-primary)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-modal-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--cn-border)] bg-[var(--cn-bg)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--cn-primary)]/10 text-[var(--cn-primary)] flex items-center justify-center border border-[var(--cn-primary)]/20">
              <IconLock size={18} />
            </div>
            <div>
              <h3 id="password-modal-title" className="text-sm font-bold tracking-tight">
                Encrypted Archive
              </h3>
              <p className="text-[11px] font-mono text-[var(--cn-text-muted)] truncate max-w-[260px]">
                {archiveName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)] hover:bg-[var(--cn-border)]/30 transition-colors disabled:opacity-50"
            title="Cancel"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-[var(--cn-text-muted)] leading-relaxed">
            This archive is password-protected. Enter the decryption password to extract course lectures, videos, and materials safely.
          </p>

          {/* Error Banner */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs animate-in fade-in slide-in-from-top-1">
              <IconAlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Password Input */}
          <div className="space-y-1.5">
            <label htmlFor="archive-password" className="text-xs font-semibold text-[var(--cn-text-primary)]">
              Password
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                id="archive-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter archive password..."
                disabled={isLoading}
                required
                autoComplete="off"
                spellCheck="false"
                className="w-full px-3.5 py-2.5 pr-10 text-sm font-mono bg-[var(--cn-bg)] border border-[var(--cn-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--cn-primary)] focus:border-transparent transition-all placeholder:text-[var(--cn-text-muted)]/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)] transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </button>
            </div>
          </div>

          {/* Optional OS-Level Keychain Persistence Checkbox (Fixes Issue A) */}
          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[var(--cn-text-secondary)]">
              <input
                type="checkbox"
                checked={rememberForCourse}
                onChange={(e) => setRememberForCourse(e.target.checked)}
                disabled={isLoading}
                className="rounded border-[var(--cn-border)] text-[var(--cn-primary)] focus:ring-[var(--cn-primary)]"
              />
              <span>Remember for this course (uses OS-level safeStorage encryption)</span>
            </label>
          </div>

          {/* Local Security & Privacy Badge */}
          <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--cn-text-muted)] pt-0.5">
            <IconShieldCheck size={14} className="text-[var(--cn-primary)] shrink-0" />
            <span>Kept in memory for this session by default. Passwords are never logged or stored in plaintext.</span>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--cn-border)]">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="cn-btn cn-btn-md cn-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="cn-btn cn-btn-md cn-btn-primary"
            >
              {isLoading ? (
                <>
                  <IconLoader2 size={14} className="animate-spin" />
                  <span>Decrypting...</span>
                </>
              ) : (
                <span>Extract Contents</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
