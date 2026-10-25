import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { APP_NAME, APP_VERSION } from '@coursenest/config';
import { getVaultAnalytics, resetVaultToDefaults } from '../../lib/courseStore';
import { clearAllMedia } from '../../lib/mediaVault';
import { 
  useStorageConfig, 
  setVolumeType, 
  setExternalMountPath, 
  toggleMountStatus, 
  createSafetyBackup 
} from '../../lib/storageConfig';
import { 
  IconDownload, 
  IconShieldCheck, 
  IconAlertTriangle, 
  IconCircleCheck, 
  IconDatabase, 
  IconDeviceFloppy, 
  IconTerminal, 
  IconBrain, 
  IconCpu, 
  IconEye, 
  IconEyeOff, 
  IconSettings,
  IconTrash
} from '@tabler/icons-react';
import { useAiConfig, saveAiConfig, askAiAssistant, type AiProvider, type PedagogicalMode } from '../../lib/aiConfig';
import { StatusBadge } from '../../components/StatusBadge';
import { LogsPage } from '../logs/LogsPage';
import { ThemeSelectorGrid } from '../../components/ThemeSelectorGrid';

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'logs' ? 'logs' : 'general';
  const [activeTab, setActiveTab] = useState<'general' | 'logs'>(initialTab);

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
  const [aiPedagogicalMode, setAiPedagogicalMode] = useState<PedagogicalMode>(aiConfig.pedagogicalMode || 'socratic');
  const [showAiKey, setShowAiKey] = useState(false);
  const [aiTestStatus, setAiTestStatus] = useState<{ testing: boolean; message?: string; success?: boolean } | null>(null);
  const [aiSavedNotice, setAiSavedNotice] = useState(false);

  useEffect(() => {
    if (searchParams.get('tab') === 'logs') {
      setActiveTab('logs');
    }
  }, [searchParams]);

  useEffect(() => {
    setAiProvider(aiConfig.provider);
    setAiApiKey(aiConfig.apiKey);
    setAiBaseUrl(aiConfig.baseUrl);
    setAiModelName(aiConfig.modelName);
    setAiPedagogicalMode(aiConfig.pedagogicalMode || 'socratic');
  }, [aiConfig]);

  const handleSaveAiConfig = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    saveAiConfig({
      ...aiConfig,
      provider: aiProvider,
      apiKey: aiApiKey.trim(),
      baseUrl: aiBaseUrl.trim(),
      modelName: aiModelName.trim(),
      pedagogicalMode: aiPedagogicalMode,
    });
    setAiSavedNotice(true);
    setTimeout(() => setAiSavedNotice(false), 3000);
  };

  const handleTestAiConnection = async () => {
    setAiTestStatus({ testing: true });
    saveAiConfig({
      ...aiConfig,
      provider: aiProvider,
      apiKey: aiApiKey.trim(),
      baseUrl: aiBaseUrl.trim(),
      modelName: aiModelName.trim(),
    });

    const res = await askAiAssistant({
      question: 'Reply with "Connection successful! Study Companion is active."',
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
    setAnalytics(getVaultAnalytics());
    setCustomPathInput(storageConfig.externalMountPath);
  }, [storageConfig.externalMountPath]);

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
      setBackupNotice(`Backup created successfully (${(res.sizeBytes / 1024).toFixed(1)} KB)`);
      setTimeout(() => setBackupNotice(null), 3000);
    }
  };

  const handleResetDefaults = async () => {
    resetVaultToDefaults();
    await clearAllMedia();
    setAnalytics(getVaultAnalytics());
    setShowResetModal(false);
  };

  const handleSaveMountPath = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPathInput.trim()) {
      setExternalMountPath(customPathInput.trim());
    }
  };

  const switchTab = (tab: 'general' | 'logs') => {
    setActiveTab(tab);
    setSearchParams(tab === 'logs' ? { tab: 'logs' } : {});
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
      {/* Page Title & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--cn-border)] pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--cn-text-primary)]">
            Settings & Diagnostics
          </h1>
          <p className="text-xs md:text-sm text-[var(--cn-text-secondary)] mt-1">
            Manage storage volumes, backups, optional AI assistance, and system logs.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-[var(--cn-surface-subtle)] p-1 rounded-xl border border-[var(--cn-border)] text-xs font-mono self-start sm:self-auto">
          <button
            onClick={() => switchTab('general')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-[background-color,color,box-shadow,transform] duration-150 ease-out active:scale-95 font-semibold ${
              activeTab === 'general'
                ? 'bg-[var(--cn-surface)] text-[var(--cn-primary)] shadow-xs'
                : 'text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)]'
            }`}
          >
            <IconSettings size={15} />
            <span>Preferences & Storage</span>
          </button>

          <button
            onClick={() => switchTab('logs')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-[background-color,color,box-shadow,transform] duration-150 ease-out active:scale-95 font-semibold ${
              activeTab === 'logs'
                ? 'bg-[var(--cn-surface)] text-[var(--cn-primary)] shadow-xs'
                : 'text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)]'
            }`}
          >
            <IconTerminal size={15} />
            <span>System Logs & Diagnostics</span>
          </button>
        </div>
      </div>

      {activeTab === 'logs' ? (
        <LogsPage />
      ) : (
        <div className="space-y-8">
          {/* Removable Media & Storage Volumes Manager */}
          <section className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--cn-border)] pb-4">
              <div className="flex items-center gap-2.5">
                <IconDeviceFloppy size={18} className="text-[var(--cn-primary)]" />
                <h2 className="text-sm font-bold font-mono text-[var(--cn-text-primary)] uppercase tracking-wider">
                  Media Volume & External Drive
                </h2>
              </div>
              <span
                className={`text-[10px] font-mono px-2.5 py-1 rounded font-bold border ${
                  storageConfig.isMounted
                    ? 'bg-[var(--cn-success-tint)] text-[var(--cn-success)] border-[var(--cn-success)]/40'
                    : 'bg-[var(--cn-danger-tint)] text-[var(--cn-danger)] border-[var(--cn-danger)]/40'
                }`}
              >
                {storageConfig.isMounted ? '● STORAGE MOUNTED' : '○ DISCONNECTED'}
              </span>
            </div>

            {/* Volume Type Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <button
                onClick={() => setVolumeType('internal')}
                className={`p-4 rounded-xl border text-left transition-[border-color,background-color,box-shadow,transform] duration-150 ease-out active:scale-[0.99] space-y-1 ${
                  storageConfig.volumeType === 'internal'
                    ? 'border-[var(--cn-primary)] bg-[var(--cn-primary-tint)]/20 shadow-xs'
                    : 'border-[var(--cn-border)] hover:bg-[var(--cn-surface-subtle)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--cn-text-primary)]">Internal Storage</span>
                  {storageConfig.volumeType === 'internal' && <IconCircleCheck size={16} className="text-[var(--cn-primary)]" />}
                </div>
                <p className="text-[11px] text-[var(--cn-text-muted)]">
                  Stores courses and media inside application private sandbox. Always accessible.
                </p>
              </button>

              <button
                onClick={() => setVolumeType('external')}
                className={`p-4 rounded-xl border text-left transition-[border-color,background-color,box-shadow,transform] duration-150 ease-out active:scale-[0.99] space-y-1 ${
                  storageConfig.volumeType === 'external'
                    ? 'border-[var(--cn-primary)] bg-[var(--cn-primary-tint)]/20 shadow-xs'
                    : 'border-[var(--cn-border)] hover:bg-[var(--cn-surface-subtle)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--cn-text-primary)]">External USB / SD Disk</span>
                  {storageConfig.volumeType === 'external' && <IconCircleCheck size={16} className="text-[var(--cn-primary)]" />}
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
                      className="px-3.5 py-1.5 rounded-lg bg-[var(--cn-primary)] text-[var(--cn-primary-text)] text-xs font-mono font-semibold hover:bg-[var(--cn-primary-hover)] transition-[background-color,transform] duration-150 ease-out active:scale-95"
                    >
                      Save Path
                    </button>
                  </div>
                </form>

                {/* Simulation Controls */}
                <div className="pt-2 border-t border-[var(--cn-border)] flex items-center justify-between text-xs font-mono">
                  <span className="text-[11px] text-[var(--cn-text-muted)]">
                    Drive Disconnect Simulation:
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
                <IconShieldCheck size={15} className="text-[var(--cn-success)]" />
                Offline Resiliency Guarantee
              </p>
              <p className="text-[11px] text-[var(--cn-text-muted)] leading-relaxed">
                All course enrollments, lecture notes, bookmarks, and quiz scores are strictly saved to internal device storage. If an external drive is unplugged, your notes and learning records remain safe.
              </p>
            </div>
          </section>

          {/* Safety Snapshots & Data Backups */}
          <section className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--cn-border)] pb-4">
              <div className="flex items-center gap-2.5">
                <IconDatabase size={18} className="text-[var(--cn-primary)]" />
                <h2 className="text-sm font-bold font-mono text-[var(--cn-text-primary)] uppercase tracking-wider">
                  Backup & Export Data
                </h2>
              </div>
              <span className="text-xs font-mono font-bold text-[var(--cn-text-primary)] px-2.5 py-1 rounded bg-[var(--cn-surface-subtle)] border border-[var(--cn-border)]">
                {analytics.estimatedStorageMB} MB allocated
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleCreateSnapshot}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--cn-primary)] text-[var(--cn-primary-text)] text-xs font-mono font-semibold hover:bg-[var(--cn-primary-hover)] transition-[background-color,transform] duration-150 ease-out active:scale-95 shadow-xs"
              >
                <IconShieldCheck size={14} />
                <span>Back Up My Progress Now</span>
              </button>

              <button
                onClick={handleExportData}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs font-mono font-medium text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)] hover:bg-[var(--cn-surface-subtle)] transition-colors"
              >
                <IconDownload size={14} />
                <span>Export Full Backup (.json)</span>
              </button>

              <button
                onClick={() => switchTab('logs')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs font-mono font-medium text-[var(--cn-text-secondary)] hover:text-[var(--cn-primary)] hover:border-[var(--cn-primary)]/40 transition-colors"
              >
                <IconTerminal size={14} />
                <span>View System Logs</span>
              </button>
            </div>

            {backupNotice && (
              <div className="p-3.5 rounded-xl bg-[var(--cn-success-tint)] text-[var(--cn-success)] text-xs font-mono font-medium flex items-center gap-2 border border-[var(--cn-success)]/30">
                <IconCircleCheck size={15} />
                <span>{backupNotice}</span>
              </div>
            )}

            {showExportSuccess && (
              <div className="p-3.5 rounded-xl bg-[var(--cn-success-tint)] text-[var(--cn-success)] text-xs font-mono font-medium flex items-center gap-2 border border-[var(--cn-success)]/30">
                <IconCircleCheck size={15} />
                <span>Complete student timeline and database exported successfully.</span>
              </div>
            )}
          </section>

          {/* AI Study Companion (Optional BYO-API) */}
          <section className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--cn-border)] pb-4">
              <div className="flex items-center gap-2.5">
                <IconBrain size={18} className="text-[var(--cn-primary)]" />
                <h2 className="text-sm font-bold font-mono text-[var(--cn-text-primary)] uppercase tracking-wider">
                  Study Companion (Optional Key)
                </h2>
              </div>
              <StatusBadge
                tone={aiApiKey ? 'success' : 'neutral'}
                label={aiApiKey ? 'Key Configured' : 'Offline Core Active (No Key)'}
                showDot={Boolean(aiApiKey)}
              />
            </div>

            {/* Low-End Laptop Guarantee Alert */}
            <div className="p-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-bg)] space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-[var(--cn-text-primary)]">
                <IconCpu size={15} className="text-[var(--cn-primary)]" />
                <span>Lightweight Design For All Computers</span>
              </div>
              <p className="text-[11px] text-[var(--cn-text-muted)] font-mono leading-relaxed">
                CourseNest runs <strong className="text-[var(--cn-text-primary)]">100% offline</strong> for all reading, video playback, and quiz workflows. We deliberately do <em>not</em> run heavy local models that overheat or freeze budget laptops. You can optionally connect an API key when online to ask questions about your course handouts.
              </p>
            </div>

            {/* AI Config Form */}
            <form onSubmit={handleSaveAiConfig} className="space-y-4 font-mono text-xs">
              {/* Provider Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--cn-text-secondary)]">
                  Provider / Connectivity
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setAiProvider('gemini');
                      setAiBaseUrl('https://generativelanguage.googleapis.com');
                      setAiModelName('gemini-1.5-flash');
                    }}
                    className={`p-3 rounded-xl border text-left transition-colors ${
                      aiProvider === 'gemini'
                        ? 'border-[var(--cn-primary)] bg-[var(--cn-primary-tint)]/20 font-bold text-[var(--cn-text-primary)]'
                        : 'border-[var(--cn-border)] hover:bg-[var(--cn-surface-subtle)] text-[var(--cn-text-secondary)]'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>Google Gemini Pro</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--cn-primary-tint)] text-[var(--cn-primary)]">Cloud API</span>
                    </div>
                    <div className="text-[10px] text-[var(--cn-text-muted)] font-normal mt-1">Default: gemini-1.5-flash (fast & free tier available)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAiProvider('deepseek');
                      setAiBaseUrl('https://api.deepseek.com');
                      setAiModelName('deepseek-chat');
                    }}
                    className={`p-3 rounded-xl border text-left transition-colors ${
                      aiProvider === 'deepseek'
                        ? 'border-[var(--cn-primary)] bg-[var(--cn-primary-tint)]/20 font-bold text-[var(--cn-text-primary)]'
                        : 'border-[var(--cn-border)] hover:bg-[var(--cn-surface-subtle)] text-[var(--cn-text-secondary)]'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>DeepSeek (Official API)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-400 font-mono">V3 & R1</span>
                    </div>
                    <div className="text-[10px] text-[var(--cn-text-muted)] font-normal mt-1">deepseek-chat & deepseek-reasoner (https://api.deepseek.com)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAiProvider('omniroute');
                      setAiBaseUrl('https://tokenharbor.ai/v1');
                      setAiModelName('deepseek-v4-flash:free');
                    }}
                    className={`p-3 rounded-xl border text-left transition-colors ${
                      aiProvider === 'omniroute' && aiBaseUrl.includes('tokenharbor')
                        ? 'border-[var(--cn-primary)] bg-[var(--cn-primary-tint)]/20 font-bold text-[var(--cn-text-primary)]'
                        : 'border-[var(--cn-border)] hover:bg-[var(--cn-surface-subtle)] text-[var(--cn-text-secondary)]'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>Free Cloud AI (TokenHarbor)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">100% Free Tier</span>
                    </div>
                    <div className="text-[10px] text-[var(--cn-text-muted)] font-normal mt-1">DeepSeek V4 Flash / MiMo 2.5 (OpenAI-compatible zero-cost route)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAiProvider('omniroute');
                      setAiBaseUrl('http://localhost:11434/v1');
                      setAiModelName('llama3.2');
                    }}
                    className={`p-3 rounded-xl border text-left transition-colors ${
                      aiProvider === 'omniroute' && aiBaseUrl.includes('11434')
                        ? 'border-[var(--cn-primary)] bg-[var(--cn-primary-tint)]/20 font-bold text-[var(--cn-text-primary)]'
                        : 'border-[var(--cn-border)] hover:bg-[var(--cn-surface-subtle)] text-[var(--cn-text-secondary)]'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>Local Ollama (Offline LLM)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">Localhost</span>
                    </div>
                    <div className="text-[10px] text-[var(--cn-text-muted)] font-normal mt-1">http://localhost:11434/v1 with Llama 3, Mistral, or Qwen</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAiProvider('omniroute');
                      setAiBaseUrl('http://localhost:8000/v1');
                      setAiModelName('gpt-4o-mini');
                    }}
                    className={`p-3 rounded-xl border text-left transition-colors ${
                      aiProvider === 'omniroute' && aiBaseUrl.includes('8000')
                        ? 'border-[var(--cn-primary)] bg-[var(--cn-primary-tint)]/20 font-bold text-[var(--cn-text-primary)]'
                        : 'border-[var(--cn-border)] hover:bg-[var(--cn-surface-subtle)] text-[var(--cn-text-secondary)]'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>Campus Gateway / Custom API</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">Custom Proxy</span>
                    </div>
                    <div className="text-[10px] text-[var(--cn-text-muted)] font-normal mt-1">OpenAI-compatible server or institutional campus relay</div>
                  </button>
                </div>
              </div>

              {/* API Key */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--cn-text-secondary)]">
                    {aiProvider === 'gemini' 
                      ? 'Gemini API Key' 
                      : aiProvider === 'deepseek'
                        ? 'DeepSeek API Key (sk-...)'
                        : 'Proxy / Gateway API Key (Optional)'}
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
                  {aiProvider === 'deepseek' && (
                    <a
                      href="https://platform.deepseek.com/api_keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[var(--cn-primary)] underline"
                    >
                      Get DeepSeek API key &rarr;
                    </a>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showAiKey ? 'text' : 'password'}
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    placeholder={aiProvider === 'gemini' ? 'AIzaSy...' : 'sk-... or leave blank for local LAN'}
                    className="w-full px-3 py-2 pr-10 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs text-[var(--cn-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--cn-primary)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAiKey(!showAiKey)}
                    className="absolute right-2.5 top-2.5 text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)]"
                  >
                    {showAiKey ? <IconEyeOff size={15} /> : <IconEye size={15} />}
                  </button>
                </div>
              </div>

              {/* Base URL and Model Name */}
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

              {/* Default Tutoring Mode */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--cn-text-secondary)]">
                  Default Pedagogical Tutoring Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAiPedagogicalMode('socratic')}
                    className={`p-2.5 rounded-xl border text-left transition-colors ${
                      aiPedagogicalMode === 'socratic'
                        ? 'border-[var(--cn-primary)] bg-[var(--cn-primary-tint)]/20 font-bold text-[var(--cn-text-primary)]'
                        : 'border-[var(--cn-border)] hover:bg-[var(--cn-surface-subtle)] text-[var(--cn-text-secondary)]'
                    }`}
                  >
                    <div className="font-bold text-xs">🧑‍🏫 Socratic Tutor</div>
                    <div className="text-[10px] text-[var(--cn-text-muted)] mt-0.5">Guides with hints & questions</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiPedagogicalMode('reference')}
                    className={`p-2.5 rounded-xl border text-left transition-colors ${
                      aiPedagogicalMode === 'reference'
                        ? 'border-[var(--cn-primary)] bg-[var(--cn-primary-tint)]/20 font-bold text-[var(--cn-text-primary)]'
                        : 'border-[var(--cn-border)] hover:bg-[var(--cn-surface-subtle)] text-[var(--cn-text-secondary)]'
                    }`}
                  >
                    <div className="font-bold text-xs">⚡ Technical Reference</div>
                    <div className="text-[10px] text-[var(--cn-text-muted)] mt-0.5">Concise bullet facts & citations</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiPedagogicalMode('quiz')}
                    className={`p-2.5 rounded-xl border text-left transition-colors ${
                      aiPedagogicalMode === 'quiz'
                        ? 'border-[var(--cn-primary)] bg-[var(--cn-primary-tint)]/20 font-bold text-[var(--cn-text-primary)]'
                        : 'border-[var(--cn-border)] hover:bg-[var(--cn-surface-subtle)] text-[var(--cn-text-secondary)]'
                    }`}
                  >
                    <div className="font-bold text-xs">🃏 Active Recall Quiz</div>
                    <div className="text-[10px] text-[var(--cn-text-muted)] mt-0.5">Generates practice test cards</div>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[var(--cn-primary)] text-[var(--cn-primary-text)] text-xs font-semibold hover:bg-[var(--cn-primary-hover)] transition-[background-color,transform] duration-150 ease-out active:scale-95 shadow-xs"
                >
                  Save Settings
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
                    <IconCircleCheck size={14} />
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
                    {aiTestStatus.success ? <IconCircleCheck size={15} /> : <IconAlertTriangle size={15} />}
                    <span>{aiTestStatus.success ? 'Verification Passed' : 'Connection Check Failed'}</span>
                  </div>
                  <p className="mt-1 text-[11px] opacity-90">{aiTestStatus.message}</p>
                </div>
              )}
            </form>
          </section>

          {/* Visual Appearance Section: Aesthetic Studio */}
          <section className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-6 space-y-4">
            <div>
              <h2 className="text-sm font-bold font-mono text-[var(--cn-text-muted)] uppercase tracking-wider">
                Visual Theme & Aesthetic Studio
              </h2>
              <p className="text-xs text-[var(--cn-text-muted)] mt-1">
                Curated open-source design systems with custom typography, color palettes, and theme-matched loading animations.
              </p>
            </div>

            <ThemeSelectorGrid />
          </section>

          {/* Playback Controls */}
          <section className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-6 space-y-4">
            <h2 className="text-sm font-bold font-mono text-[var(--cn-text-muted)] uppercase tracking-wider">
              Playback Behavior
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

          {/* Reset Clean Slate */}
          <section className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-6 flex items-center justify-between">
            <div>
              <p className="font-semibold text-xs text-[var(--cn-text-primary)]">Reset Vault Storage</p>
              <p className="text-[11px] text-[var(--cn-text-muted)] font-mono">Clear all stored courses and reset to an empty vault</p>
            </div>
            <button
              onClick={() => setShowResetModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-mono transition-colors"
            >
              <IconTrash size={14} />
              <span>Reset Vault</span>
            </button>
          </section>
        </div>
      )}

      {/* Reset Vault Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--cn-surface)] border border-[var(--cn-border)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-[var(--cn-warning)]">
              <div className="w-10 h-10 rounded-full bg-[var(--cn-warning-tint)] flex items-center justify-center shrink-0">
                <IconAlertTriangle size={20} />
              </div>
              <h3 className="font-bold text-base text-[var(--cn-text-primary)]">
                Reset Vault to Clean Defaults?
              </h3>
            </div>

            <p className="text-xs text-[var(--cn-text-secondary)] leading-relaxed">
              This will clear all course files, study progress, and media from your local device so you can start with a fresh, clean vault.
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
