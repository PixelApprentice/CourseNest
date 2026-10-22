import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { APP_NAME, APP_VERSION } from '@coursenest/config';
import { getVaultAnalytics, resetVaultToDefaults } from '../../lib/courseStore';
import { 
  useStorageConfig, 
  setVolumeType, 
  setExternalMountPath, 
  toggleMountStatus, 
  createSafetyBackup 
} from '../../lib/storageConfig';
import { 
  Download, 
  Moon, 
  Sun, 
  Sliders, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Database, 
  HardDrive,
  Terminal,
  Sparkles,
  Cpu,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAiConfig, saveAiConfig, askAiAssistant, type AiProvider } from '../../lib/aiConfig';
import { StatusBadge } from '../../components/StatusBadge';

export function SettingsPage() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [playbackSpeed, setPlaybackSpeed] = useState('1');
  const [autoplayNext, setAutoplayNext] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [backupNotice, setBackupNotice] = useState<string | null>(null);
  const [customPathInput, setCustomPathInput] = useState('');

  const { config: storageConfig } = useStorageConfig();
  const [analytics, setAnalytics] = useState(getVaultAnalytics());

  // AI Companion BYO-API State
  const { config: aiConfig } = useAiConfig();
  const [aiProvider, setAiProvider] = useState<AiProvider>(aiConfig.provider);
  const [aiApiKey, setAiApiKey] = useState(aiConfig.apiKey);
  const [aiBaseUrl, setAiBaseUrl] = useState(aiConfig.baseUrl);
  const [aiModelName, setAiModelName] = useState(aiConfig.modelName);
  const [showAiKey, setShowAiKey] = useState(false);
  const [aiTestStatus, setAiTestStatus] = useState<{ testing: boolean; message?: string; success?: boolean } | null>(null);
  const [aiSavedNotice, setAiSavedNotice] = useState(false);

  useEffect(() => {
    setAiProvider(aiConfig.provider);
    setAiApiKey(aiConfig.apiKey);
    setAiBaseUrl(aiConfig.baseUrl);
    setAiModelName(aiConfig.modelName);
  }, [aiConfig]);

  const handleSaveAiConfig = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    saveAiConfig({
      ...aiConfig,
      provider: aiProvider,
      apiKey: aiApiKey.trim(),
      baseUrl: aiBaseUrl.trim(),
      modelName: aiModelName.trim(),
    });
    setAiSavedNotice(true);
    setTimeout(() => setAiSavedNotice(false), 3000);
  };

  const handleTestAiConnection = async () => {
    setAiTestStatus({ testing: true });
    // First save current inputs
    saveAiConfig({
      ...aiConfig,
      provider: aiProvider,
      apiKey: aiApiKey.trim(),
      baseUrl: aiBaseUrl.trim(),
      modelName: aiModelName.trim(),
    });

    const res = await askAiAssistant({
      question: 'Reply with "Connection successful! AI Reading Companion is ready."',
      courseTitle: 'System Diagnostic Verification',
      lessonTitle: 'API Connectivity Check',
    });

    if (res.success) {
      setAiTestStatus({ testing: false, success: true, message: res.text });
    } else {
      setAiTestStatus({ testing: false, success: false, message: res.error || 'Connection failed' });
    }
  };

  useEffect(() => {
    const savedTheme = (localStorage.getItem('cn-theme') as 'light' | 'dark') || 'system';
    setTheme(savedTheme);
    setAnalytics(getVaultAnalytics());
    setCustomPathInput(storageConfig.externalMountPath);
  }, [storageConfig.externalMountPath]);

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
      storageConfig,
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

  const handleCreateSnapshot = () => {
    const res = createSafetyBackup();
    if (res.success) {
      setBackupNotice(`Safety snapshot captured (${(res.sizeBytes / 1024).toFixed(1)} KB)`);
      setTimeout(() => setBackupNotice(null), 3000);
    }
  };

  const handleResetDefaults = () => {
    resetVaultToDefaults();
    setAnalytics(getVaultAnalytics());
    setShowResetModal(false);
  };

  const handleSaveMountPath = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPathInput.trim()) {
      setExternalMountPath(customPathInput.trim());
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--cn-text-primary)]">
          Vault Settings & Storage
        </h1>
        <p className="text-xs md:text-sm text-[var(--cn-text-secondary)] mt-1">
          Manage storage volumes, removable external disks, safety backups, and system diagnostics.
        </p>
      </div>

      {/* Removable Media & Storage Volumes Manager */}
      <section className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-[var(--cn-border)] pb-4">
          <div className="flex items-center gap-2.5">
            <HardDrive size={18} className="text-[var(--cn-primary)]" />
            <h2 className="text-sm font-bold font-mono text-[var(--cn-text-primary)] uppercase tracking-wider">
              Media Volume & External Disk Configuration
            </h2>
          </div>
          <span
            className={`text-[10px] font-mono px-2.5 py-1 rounded font-bold border ${
              storageConfig.isMounted
                ? 'bg-[var(--cn-success-tint)] text-[var(--cn-success)] border-[var(--cn-success)]/40'
                : 'bg-[var(--cn-danger-tint)] text-[var(--cn-danger)] border-[var(--cn-danger)]/40'
            }`}
          >
            {storageConfig.isMounted ? '● VOLUME MOUNTED' : '○ DISCONNECTED'}
          </span>
        </div>

        {/* Volume Type Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <button
            onClick={() => setVolumeType('internal')}
            className={`p-4 rounded-xl border text-left transition-all space-y-1 ${
              storageConfig.volumeType === 'internal'
                ? 'border-[var(--cn-primary)] bg-[var(--cn-primary-tint)]/20 shadow-xs'
                : 'border-[var(--cn-border)] hover:bg-[var(--cn-surface-subtle)]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-[var(--cn-text-primary)]">Internal Storage</span>
              {storageConfig.volumeType === 'internal' && <CheckCircle2 size={15} className="text-[var(--cn-primary)]" />}
            </div>
            <p className="text-[11px] text-[var(--cn-text-muted)]">
              Stores courses and media inside app's private sandbox. Always accessible.
            </p>
          </button>

          <button
            onClick={() => setVolumeType('external')}
            className={`p-4 rounded-xl border text-left transition-all space-y-1 ${
              storageConfig.volumeType === 'external'
                ? 'border-[var(--cn-primary)] bg-[var(--cn-primary-tint)]/20 shadow-xs'
                : 'border-[var(--cn-border)] hover:bg-[var(--cn-surface-subtle)]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-[var(--cn-text-primary)]">External USB / SD Disk</span>
              {storageConfig.volumeType === 'external' && <CheckCircle2 size={15} className="text-[var(--cn-primary)]" />}
            </div>
            <p className="text-[11px] text-[var(--cn-text-muted)]">
              Redirects heavy video assets to external volume to conserve device storage.
            </p>
          </button>
        </div>

        {/* External Path Form & Disconnect Simulation */}
        {storageConfig.volumeType === 'external' && (
          <div className="p-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-bg)] space-y-3">
            <form onSubmit={handleSaveMountPath} className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-[var(--cn-text-secondary)]">
                External Mount Path (Linux / USB / SD Card)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customPathInput}
                  onChange={(e) => setCustomPathInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface)] text-xs font-mono text-[var(--cn-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--cn-primary)]"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-mono font-semibold hover:bg-[var(--cn-primary-hover)] transition-colors"
                >
                  Save Path
                </button>
              </div>
            </form>

            {/* Test Simulation Controls */}
            <div className="pt-2 border-t border-[var(--cn-border)] flex items-center justify-between text-xs font-mono">
              <span className="text-[11px] text-[var(--cn-text-muted)]">
                Test Unplugged Fallback:
              </span>
              <button
                onClick={() => toggleMountStatus(!storageConfig.isMounted)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold border transition-colors ${
                  storageConfig.isMounted
                    ? 'border-[var(--cn-warning)]/40 text-[var(--cn-warning)] hover:bg-[var(--cn-warning-tint)]'
                    : 'bg-[var(--cn-success)] text-white border-[var(--cn-success)] hover:bg-[var(--cn-success)]/90'
                }`}
              >
                {storageConfig.isMounted ? 'Simulate Unplugging USB' : 'Simulate Reconnecting USB'}
              </button>
            </div>
          </div>
        )}

        <div className="p-3.5 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs font-mono space-y-1">
          <p className="font-bold text-[var(--cn-text-primary)] flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[var(--cn-success)]" />
            Offline Resiliency Guarantee
          </p>
          <p className="text-[11px] text-[var(--cn-text-muted)] leading-relaxed">
            All course enrollments, lecture notes, bookmarks, and quiz scores are strictly saved to internal device storage. If an external drive is unplugged, learning records are never lost.
          </p>
        </div>
      </section>

      {/* Safety Snapshots & Data Backups */}
      <section className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-[var(--cn-border)] pb-4">
          <div className="flex items-center gap-2.5">
            <Database size={18} className="text-[var(--cn-primary)]" />
            <h2 className="text-sm font-bold font-mono text-[var(--cn-text-primary)] uppercase tracking-wider">
              Safety Snapshot & Data Backups
            </h2>
          </div>
          <span className="text-xs font-mono font-bold text-[var(--cn-text-primary)] px-2.5 py-1 rounded bg-[var(--cn-surface-subtle)] border border-[var(--cn-border)]">
            {analytics.estimatedStorageMB} MB allocated
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleCreateSnapshot}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-mono font-semibold hover:bg-[var(--cn-primary-hover)] transition-colors shadow-xs"
          >
            <ShieldCheck size={14} />
            <span>Create Immediate Safety Snapshot</span>
          </button>

          <button
            onClick={handleExportData}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs font-mono font-medium text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)] hover:bg-[var(--cn-surface-subtle)] transition-colors"
          >
            <Download size={14} />
            <span>Export Full Backup (.json)</span>
          </button>

          <Link
            to="/logs"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs font-mono font-medium text-[var(--cn-text-secondary)] hover:text-[var(--cn-primary)] hover:border-[var(--cn-primary)]/40 transition-colors"
          >
            <Terminal size={14} />
            <span>View System Logs</span>
          </Link>
        </div>

        {backupNotice && (
          <div className="p-3.5 rounded-xl bg-[var(--cn-success-tint)] text-[var(--cn-success)] text-xs font-mono font-medium flex items-center gap-2 border border-[var(--cn-success)]/30">
            <CheckCircle2 size={15} />
            <span>{backupNotice}</span>
          </div>
        )}

        {showExportSuccess && (
          <div className="p-3.5 rounded-xl bg-[var(--cn-success-tint)] text-[var(--cn-success)] text-xs font-mono font-medium flex items-center gap-2 border border-[var(--cn-success)]/30">
            <CheckCircle2 size={15} />
            <span>Complete student timeline and database exported successfully.</span>
          </div>
        )}
      </section>

      {/* AI Academic Reading Companion (Optional BYO-API) */}
      <section className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-[var(--cn-border)] pb-4">
          <div className="flex items-center gap-2.5">
            <Sparkles size={18} className="text-[var(--cn-primary)]" />
            <h2 className="text-sm font-bold font-mono text-[var(--cn-text-primary)] uppercase tracking-wider">
              AI Reading Companion (Optional BYO-API)
            </h2>
          </div>
          <StatusBadge
            tone={aiApiKey ? 'success' : 'neutral'}
            label={aiApiKey ? 'API Key Configured' : 'No Key Set (Offline Core Active)'}
            showDot={Boolean(aiApiKey)}
          />
        </div>

        {/* Low-End Laptop Guarantee Alert */}
        <div className="p-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-bg)] space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-[var(--cn-text-primary)]">
            <Cpu size={15} className="text-[var(--cn-primary)]" />
            <span>Low-Power Workstation & Air-Gapped Philosophy</span>
          </div>
          <p className="text-[11px] text-[var(--cn-text-muted)] font-mono leading-relaxed">
            CourseNest runs <strong className="text-[var(--cn-text-primary)]">100% offline</strong> for all reading, video playback, and quiz workflows. We deliberately do <em>not</em> run heavy local models (like Ollama or 8GB GGUFs) that would overheat or freeze budget student laptops. When you have internet or a school LAN proxy, you can optionally connect your own API key to ask questions about lecture handouts.
          </p>
        </div>

        <form onSubmit={handleSaveAiConfig} className="space-y-4 text-xs font-mono">
          {/* Provider Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--cn-text-secondary)]">
              AI Provider Endpoint
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setAiProvider('gemini');
                  setAiBaseUrl('https://generativelanguage.googleapis.com/v1beta');
                  setAiModelName('gemini-1.5-flash');
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  aiProvider === 'gemini'
                    ? 'border-[var(--cn-primary)] bg-[var(--cn-primary-tint)]/30 text-[var(--cn-primary)] font-bold'
                    : 'border-[var(--cn-border)] hover:bg-[var(--cn-surface-subtle)] text-[var(--cn-text-secondary)]'
                }`}
              >
                <div className="font-bold">Google Gemini Pro API</div>
                <div className="text-[10px] text-[var(--cn-text-muted)] font-normal">Direct free/commercial Google AI API</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAiProvider('omniroute');
                  setAiBaseUrl('http://localhost:8000/v1');
                  setAiModelName('gpt-4o-mini');
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  aiProvider === 'omniroute'
                    ? 'border-[var(--cn-primary)] bg-[var(--cn-primary-tint)]/30 text-[var(--cn-primary)] font-bold'
                    : 'border-[var(--cn-border)] hover:bg-[var(--cn-surface-subtle)] text-[var(--cn-text-secondary)]'
                }`}
              >
                <div className="font-bold">OmniRoute / Campus Proxy</div>
                <div className="text-[10px] text-[var(--cn-text-muted)] font-normal">OpenAI-compatible gateway or local school LAN</div>
              </button>
            </div>
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--cn-text-secondary)]">
                {aiProvider === 'gemini' ? 'Gemini API Key' : 'Proxy / Gateway API Key (Optional for internal LAN)'}
              </label>
              {aiProvider === 'gemini' && (
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-[var(--cn-primary)] underline"
                >
                  Get free Gemini API key &rarr;
                </a>
              )}
            </div>
            <div className="relative">
              <input
                type={showAiKey ? 'text' : 'password'}
                value={aiApiKey}
                onChange={(e) => setAiApiKey(e.target.value)}
                placeholder={aiProvider === 'gemini' ? 'AIzaSy...' : 'sk-... or leave blank for unauthenticated LAN'}
                className="w-full px-3 py-2 pr-10 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs text-[var(--cn-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--cn-primary)]"
              />
              <button
                type="button"
                onClick={() => setShowAiKey(!showAiKey)}
                className="absolute right-2.5 top-2.5 text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)]"
              >
                {showAiKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Base URL and Model Name in 2 Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--cn-text-secondary)]">
                Base URL
              </label>
              <input
                type="text"
                value={aiBaseUrl}
                onChange={(e) => setAiBaseUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs text-[var(--cn-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--cn-primary)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--cn-text-secondary)]">
                Model Name
              </label>
              <input
                type="text"
                value={aiModelName}
                onChange={(e) => setAiModelName(e.target.value)}
                placeholder="e.g. gemini-1.5-flash or gpt-4o-mini"
                className="w-full px-3 py-2 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs text-[var(--cn-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--cn-primary)]"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-semibold hover:bg-[var(--cn-primary-hover)] transition-colors shadow-xs"
            >
              Save AI Settings
            </button>

            <button
              type="button"
              onClick={handleTestAiConnection}
              disabled={aiTestStatus?.testing}
              className="px-3.5 py-2 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs font-medium text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)] hover:bg-[var(--cn-surface-subtle)] disabled:opacity-50 transition-colors"
            >
              {aiTestStatus?.testing ? 'Testing connection...' : 'Test API Connection'}
            </button>

            {aiSavedNotice && (
              <span className="text-[11px] text-[var(--cn-success)] flex items-center gap-1">
                <CheckCircle2 size={13} />
                <span>Configuration saved to local vault</span>
              </span>
            )}
          </div>

          {/* Test Status Feedback */}
          {aiTestStatus && !aiTestStatus.testing && (
            <div
              className={`p-3 rounded-xl border text-xs leading-relaxed ${
                aiTestStatus.success
                  ? 'bg-[var(--cn-success-tint)] text-[var(--cn-success)] border-[var(--cn-success)]/30'
                  : 'bg-red-500/10 text-red-500 border-red-500/25'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                {aiTestStatus.success ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                <span>{aiTestStatus.success ? 'Verification Passed' : 'Connection Check Failed'}</span>
              </div>
              <p className="mt-1 text-[11px] opacity-90">{aiTestStatus.message}</p>
            </div>
          )}
        </form>
      </section>

      {/* Visual Appearance Section */}
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
              This will re-initialize the course vault with foundational curriculums (CS-101 and ML-201).
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
