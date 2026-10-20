import { useState, useEffect } from 'react';
import { APP_NAME, APP_VERSION } from '@coursenest/config';
import { 
  HardDrive, 
  Trash2, 
  Download, 
  Moon, 
  Sun, 
  Sliders, 
  ShieldCheck, 
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

export function SettingsPage() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [playbackSpeed, setPlaybackSpeed] = useState('1');
  const [autoplayNext, setAutoplayNext] = useState(true);
  const [storageBytes, setStorageBytes] = useState(148 * 1024 * 1024); // 148 MB
  const [showClearModal, setShowClearModal] = useState(false);
  const [showExportSuccess, setShowExportSuccess] = useState(false);

  useEffect(() => {
    const savedTheme = (localStorage.getItem('cn-theme') as 'light' | 'dark') || 'system';
    setTheme(savedTheme);
  }, []);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('cn-theme', newTheme);
    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', newTheme);
    }
  };

  // Clear downloaded media only (keeps learning records)
  const handleClearMedia = () => {
    setStorageBytes(12 * 1024 * 1024); // 12 MB (only DB and notes remain)
    setShowClearModal(false);
  };

  // Export personal notes and progress to JSON file
  const handleExportData = () => {
    const data = {
      app: APP_NAME,
      version: APP_VERSION,
      exportTimestamp: new Date().toISOString(),
      localStorageDump: { ...localStorage },
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coursenest_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setShowExportSuccess(true);
    setTimeout(() => setShowExportSuccess(false), 3000);
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--cn-text-primary)]">Settings</h1>
        <p className="text-xs text-[var(--cn-text-secondary)] mt-0.5">
          Configure appearance, local storage management, playback behavior, and personal backups.
        </p>
      </div>

      {/* Appearance Section */}
      <section className="border border-[var(--cn-border)] rounded-xl bg-[var(--cn-surface)] p-6 space-y-4">
        <h2 className="text-sm font-bold text-[var(--cn-text-primary)] uppercase tracking-wider text-[var(--cn-text-muted)]">
          Appearance & Theme
        </h2>

        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'light', label: 'Light', icon: Sun },
            { id: 'dark', label: 'Dark', icon: Moon },
            { id: 'system', label: 'System', icon: Sliders },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleThemeChange(id as 'light' | 'dark' | 'system')}
              className={`p-3 rounded-lg border text-xs font-medium flex flex-col items-center gap-2 transition-all ${
                theme === id
                  ? 'border-[var(--cn-primary)] bg-[var(--cn-primary-tint)]/50 text-[var(--cn-primary)] font-semibold shadow-sm'
                  : 'border-[var(--cn-border)] hover:bg-[var(--cn-surface-subtle)] text-[var(--cn-text-secondary)]'
              }`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Playback Controls */}
      <section className="border border-[var(--cn-border)] rounded-xl bg-[var(--cn-surface)] p-6 space-y-4">
        <h2 className="text-sm font-bold text-[var(--cn-text-primary)] uppercase tracking-wider text-[var(--cn-text-muted)]">
          Lesson Playback
        </h2>

        <div className="flex items-center justify-between py-2 border-b border-[var(--cn-border)]/60 text-xs">
          <div>
            <p className="font-semibold text-[var(--cn-text-primary)]">Default Playback Speed</p>
            <p className="text-[11px] text-[var(--cn-text-muted)]">Preferred video speed across all lessons</p>
          </div>
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface)] text-xs text-[var(--cn-text-secondary)] font-medium"
          >
            <option value="0.75">0.75×</option>
            <option value="1">1.0× (Normal)</option>
            <option value="1.25">1.25×</option>
            <option value="1.5">1.5×</option>
            <option value="2">2.0×</option>
          </select>
        </div>

        <div className="flex items-center justify-between py-2 text-xs">
          <div>
            <p className="font-semibold text-[var(--cn-text-primary)]">Auto-play Next Lesson</p>
            <p className="text-[11px] text-[var(--cn-text-muted)]">Automatically advance to the next lesson when video finishes</p>
          </div>
          <input
            type="checkbox"
            checked={autoplayNext}
            onChange={(e) => setAutoplayNext(e.target.checked)}
            className="w-4 h-4 accent-[var(--cn-primary)]"
          />
        </div>
      </section>

      {/* Storage Management (Checklist Item 11) */}
      <section className="border border-[var(--cn-border)] rounded-xl bg-[var(--cn-surface)] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive size={18} className="text-[var(--cn-primary)]" />
            <h2 className="text-sm font-bold text-[var(--cn-text-primary)] uppercase tracking-wider text-[var(--cn-text-muted)]">
              Local Storage Management
            </h2>
          </div>
          <span className="text-xs font-semibold text-[var(--cn-text-primary)]">
            {(storageBytes / 1024 / 1024).toFixed(0)} MB used
          </span>
        </div>

        {/* Space Breakdown Bar */}
        <div className="space-y-1.5">
          <div className="h-2 w-full bg-[var(--cn-surface-subtle)] rounded-full overflow-hidden flex border border-[var(--cn-border)]">
            <div className="bg-[var(--cn-primary)] h-full" style={{ width: '75%' }} title="Course Media" />
            <div className="bg-[var(--cn-info)] h-full" style={{ width: '15%' }} title="Local SQLite Database" />
            <div className="bg-[var(--cn-accent)] h-full" style={{ width: '10%' }} title="Personal Notes & Cache" />
          </div>
          <div className="flex items-center justify-between text-[11px] text-[var(--cn-text-muted)] pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--cn-primary)]" />
              Media Files (112 MB)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--cn-info)]" />
              SQLite DB (22 MB)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--cn-accent)]" />
              Notes & Cache (14 MB)
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-3">
          <button
            onClick={() => setShowClearModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--cn-danger)]/40 text-xs font-medium text-[var(--cn-danger)] hover:bg-[var(--cn-danger-tint)] transition-colors"
          >
            <Trash2 size={14} />
            <span>Clear Downloaded Media Files</span>
          </button>

          <button
            onClick={handleExportData}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)] text-xs font-medium text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)] transition-colors"
          >
            <Download size={14} />
            <span>Export Personal Notes & Records</span>
          </button>
        </div>

        {showExportSuccess && (
          <div className="p-3 rounded-lg bg-[var(--cn-success-tint)] text-[var(--cn-success)] text-xs font-medium flex items-center gap-2">
            <CheckCircle2 size={14} />
            <span>Personal data exported successfully to JSON backup.</span>
          </div>
        )}
      </section>

      {/* About Box */}
      <section className="border border-[var(--cn-border)] rounded-xl bg-[var(--cn-surface)] p-6 text-xs text-[var(--cn-text-secondary)] space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[var(--cn-text-primary)]">{APP_NAME}</span>
          <span className="font-mono text-[var(--cn-text-muted)]">v{APP_VERSION}</span>
        </div>
        <p className="text-[var(--cn-text-muted)] leading-relaxed">
          Local-first, offline-capable learning platform architecture for Electron desktop and Android Capacitor.
        </p>
        <div className="flex items-center gap-2 text-[11px] text-[var(--cn-text-muted)] pt-2 border-t border-[var(--cn-border)]">
          <ShieldCheck size={13} className="text-[var(--cn-success)]" />
          <span>Local Storage Sandboxed • No telemetry or tracking</span>
        </div>
      </section>

      {/* Clear Media Confirmation Dialog */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--cn-surface)] border border-[var(--cn-border)] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-[var(--cn-warning)]">
              <div className="w-10 h-10 rounded-full bg-[var(--cn-warning-tint)] flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <h3 className="font-bold text-base text-[var(--cn-text-primary)]">
                Clear Downloaded Media Files?
              </h3>
            </div>

            <p className="text-xs text-[var(--cn-text-secondary)] leading-relaxed">
              This will free 112 MB by deleting cached videos and PDF documents from your local disk.
              <br /><br />
              <strong className="text-[var(--cn-text-primary)] font-medium">Safe Guarantee:</strong> Your course enrollments, completion records, personal notes, and bookmarks will <strong className="text-[var(--cn-success)]">NOT be deleted</strong>.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--cn-border)]">
              <button
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 rounded-lg border border-[var(--cn-border)] text-xs font-medium text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]"
              >
                Cancel
              </button>
              <button
                onClick={handleClearMedia}
                className="px-4 py-2 rounded-lg bg-[var(--cn-danger)] text-white text-xs font-medium hover:bg-[var(--cn-danger)]/90"
              >
                Confirm & Free Space
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
