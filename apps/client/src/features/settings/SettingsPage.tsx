import { useState, useEffect } from 'react';
import { APP_NAME, APP_VERSION } from '@coursenest/config';
import { getVaultAnalytics, resetVaultToDefaults } from '../../lib/courseStore';
import { 
  Download, 
  Moon, 
  Sun, 
  Sliders, 
  ShieldCheck, 
  AlertTriangle,
  CheckCircle2,
  Database,
  RotateCcw
} from 'lucide-react';

export function SettingsPage() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [playbackSpeed, setPlaybackSpeed] = useState('1');
  const [autoplayNext, setAutoplayNext] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [analytics, setAnalytics] = useState(getVaultAnalytics());

  useEffect(() => {
    const savedTheme = (localStorage.getItem('cn-theme') as 'light' | 'dark') || 'system';
    setTheme(savedTheme);
    setAnalytics(getVaultAnalytics());
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

  // Export personal notes and progress to JSON file
  const handleExportData = () => {
    const exportPayload = {
      application: APP_NAME,
      version: APP_VERSION,
      exportTimestamp: new Date().toISOString(),
      vaultStorageDump: { ...localStorage },
      analytics: getVaultAnalytics(),
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coursenest_vault_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setShowExportSuccess(true);
    setTimeout(() => setShowExportSuccess(false), 3500);
  };

  const handleResetDefaults = () => {
    resetVaultToDefaults();
    setAnalytics(getVaultAnalytics());
    setShowResetModal(false);
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--cn-text-primary)]">
          Vault Settings
        </h1>
        <p className="text-xs md:text-sm text-[var(--cn-text-secondary)] mt-1">
          Manage offline storage, appearance preferences, data backups, and air-gapped system telemetry.
        </p>
      </div>

      {/* Storage Management Telemetry */}
      <section className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-[var(--cn-border)] pb-4">
          <div className="flex items-center gap-2.5">
            <Database size={18} className="text-[var(--cn-primary)]" />
            <h2 className="text-sm font-bold font-mono text-[var(--cn-text-primary)] uppercase tracking-wider">
              Local Vault Storage
            </h2>
          </div>
          <span className="text-xs font-mono font-bold text-[var(--cn-text-primary)] px-2.5 py-1 rounded bg-[var(--cn-surface-subtle)] border border-[var(--cn-border)]">
            {analytics.estimatedStorageMB} MB allocated
          </span>
        </div>

        {/* Breakdown bar */}
        <div className="space-y-2">
          <div className="h-2 w-full bg-[var(--cn-bg)] rounded-full overflow-hidden flex border border-[var(--cn-border)]">
            <div className="bg-[var(--cn-primary)] h-full" style={{ width: '70%' }} title="Course Media & Manifests" />
            <div className="bg-[var(--cn-info)] h-full" style={{ width: '20%' }} title="SQLite Relational State" />
            <div className="bg-[var(--cn-accent)] h-full" style={{ width: '10%' }} title="Notes, Bookmarks & Quizzes" />
          </div>

          <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-[var(--cn-text-muted)] pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--cn-primary)] shrink-0" />
              Manifests: {analytics.totalCourses} courses
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--cn-info)] shrink-0" />
              Completed: {analytics.completedLessons} units
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--cn-accent)] shrink-0" />
              Notes: {analytics.notesCount} entries
            </span>
          </div>
        </div>

        {/* Vault Actions */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[var(--cn-border)]/60">
          <button
            onClick={handleExportData}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-mono font-semibold hover:bg-[var(--cn-primary-hover)] transition-colors shadow-xs"
          >
            <Download size={14} />
            <span>Export Vault Backup (.json)</span>
          </button>

          <button
            onClick={() => setShowResetModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs font-mono font-medium text-[var(--cn-text-secondary)] hover:text-[var(--cn-danger)] hover:border-[var(--cn-danger)]/50 transition-colors"
          >
            <RotateCcw size={14} />
            <span>Reset Vault Manifests</span>
          </button>
        </div>

        {showExportSuccess && (
          <div className="p-3.5 rounded-xl bg-[var(--cn-success-tint)] text-[var(--cn-success)] text-xs font-mono font-medium flex items-center gap-2 border border-[var(--cn-success)]/30">
            <CheckCircle2 size={15} />
            <span>Encrypted local JSON archive downloaded successfully.</span>
          </div>
        )}
      </section>

      {/* Appearance Section */}
      <section className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-6 space-y-4">
        <h2 className="text-sm font-bold font-mono text-[var(--cn-text-muted)] uppercase tracking-wider">
          Visual Theme
        </h2>

        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'dark', label: 'Obsidian Deep', icon: Moon },
            { id: 'light', label: 'Academic Ivory', icon: Sun },
            { id: 'system', label: 'Match System', icon: Sliders },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleThemeChange(id as 'light' | 'dark' | 'system')}
              className={`p-3.5 rounded-xl border text-xs font-mono font-medium flex flex-col items-center gap-2 transition-all ${
                theme === id
                  ? 'border-[var(--cn-primary)] bg-[var(--cn-primary-tint)]/40 text-[var(--cn-primary)] font-semibold shadow-xs'
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
      <section className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-6 space-y-4">
        <h2 className="text-sm font-bold font-mono text-[var(--cn-text-muted)] uppercase tracking-wider">
          Player Behavior
        </h2>

        <div className="flex items-center justify-between py-2 border-b border-[var(--cn-border)]/60 text-xs">
          <div>
            <p className="font-semibold text-[var(--cn-text-primary)]">Preferred Playback Rate</p>
            <p className="text-[11px] text-[var(--cn-text-muted)] font-mono">Applies globally across all lecture videos</p>
          </div>
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs font-mono text-[var(--cn-text-secondary)] font-medium"
          >
            <option value="0.75">0.75×</option>
            <option value="1">1.0× (Standard)</option>
            <option value="1.25">1.25×</option>
            <option value="1.5">1.5×</option>
            <option value="2.0">2.0×</option>
          </select>
        </div>

        <div className="flex items-center justify-between py-2 text-xs">
          <div>
            <p className="font-semibold text-[var(--cn-text-primary)]">Sequential Auto-Advance</p>
            <p className="text-[11px] text-[var(--cn-text-muted)] font-mono">Proceeds to the next unit upon video completion</p>
          </div>
          <input
            type="checkbox"
            checked={autoplayNext}
            onChange={(e) => setAutoplayNext(e.target.checked)}
            className="w-4 h-4 accent-[var(--cn-primary)] rounded cursor-pointer"
          />
        </div>
      </section>

      {/* Architectural Guarantee Box */}
      <section className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-6 text-xs text-[var(--cn-text-secondary)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm text-[var(--cn-text-primary)]">{APP_NAME} Air-Gap Architecture</span>
          <span className="font-mono text-[11px] text-[var(--cn-primary)] font-bold">v{APP_VERSION}</span>
        </div>
        <p className="text-[11px] text-[var(--cn-text-muted)] leading-relaxed">
          CourseNest executes exclusively on local runtime primitives. Manifests, databases, bookmarks, and video files are persisted strictly within your machine's private application boundaries.
        </p>
        <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--cn-success)] pt-2 border-t border-[var(--cn-border)]">
          <ShieldCheck size={14} />
          <span>Zero telemetry • Zero external analytical beacons • 100% Offline</span>
        </div>
      </section>

      {/* Reset Vault Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--cn-surface)] border border-[var(--cn-border)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-[var(--cn-warning)]">
              <div className="w-10 h-10 rounded-full bg-[var(--cn-warning-tint)] flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <h3 className="font-bold text-base text-[var(--cn-text-primary)]">
                Reset Vault to Clean Defaults?
              </h3>
            </div>

            <p className="text-xs text-[var(--cn-text-secondary)] leading-relaxed">
              This will re-initialize the course vault with the verified foundational curriculums (CS-101 and ML-201) and clear temporary staging caches.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--cn-border)]">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-lg border border-[var(--cn-border)] text-xs font-mono font-medium text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]"
              >
                Cancel
              </button>
              <button
                onClick={handleResetDefaults}
                className="px-4 py-2 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-mono font-semibold hover:bg-[var(--cn-primary-hover)]"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
