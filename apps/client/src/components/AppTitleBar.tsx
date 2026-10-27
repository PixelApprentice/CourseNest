import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../lib/themeManager';
import { useStorageConfig, toggleMountStatus } from '../lib/storageConfig';
import { reconcileVaultStorage } from '../lib/courseStore';
import { 
  IconMinus, 
  IconSquare, 
  IconCopy, 
  IconX, 
  IconDeviceFloppy, 
  IconCircleCheck, 
  IconAlertTriangle,
  IconPalette,
  IconSun,
  IconMoon,
  IconSearch
} from '@tabler/icons-react';
import { APP_VERSION } from '@coursenest/config';

interface AppTitleBarProps {
  onOpenThemeModal?: () => void;
}

export function AppTitleBar({ onOpenThemeModal }: AppTitleBarProps) {
  const { currentTheme, setTheme } = useTheme();
  const { config: storageConfig } = useStorageConfig();
  const location = useLocation();
  const navigate = useNavigate();

  const [isMaximized, setIsMaximized] = useState(false);
  const [isElectron, setIsElectron] = useState(false);
  const [isRechecking, setIsRechecking] = useState(false);

  useEffect(() => {
    const electron = (window as any).electron || (window as any).__ELECTRON__;
    if (electron?.windowControls) {
      setIsElectron(true);
      electron.windowControls.isMaximized().then(setIsMaximized).catch(() => {});
      const unsubscribe = electron.windowControls.onMaximizedChanged((max: boolean) => {
        setIsMaximized(max);
      });
      return unsubscribe;
    }
  }, []);

  const handleMinimize = () => {
    const electron = (window as any).electron || (window as any).__ELECTRON__;
    electron?.windowControls?.minimize();
  };

  const handleMaximize = () => {
    const electron = (window as any).electron || (window as any).__ELECTRON__;
    electron?.windowControls?.maximize().then(setIsMaximized);
  };

  const handleClose = () => {
    const electron = (window as any).electron || (window as any).__ELECTRON__;
    electron?.windowControls?.close();
  };

  const toggleQuickDark = () => {
    if (currentTheme.isDark) {
      const lastLight = (localStorage.getItem('cn_last_light_theme') as any) || 'paper';
      setTheme(lastLight);
    } else {
      const lastDark = (localStorage.getItem('cn_last_dark_theme') as any) || 'obsidian';
      setTheme(lastDark);
    }
  };

  const handleReconnectStorage = async () => {
    setIsRechecking(true);
    const electron = (window as any).electron || (window as any).__ELECTRON__;
    if (electron?.storage && storageConfig.externalMountPath) {
      try {
        const res = await electron.storage.checkVolumeAccess(storageConfig.externalMountPath);
        toggleMountStatus(res.isMounted);
        if (res.isMounted) {
          await reconcileVaultStorage();
        }
      } catch {
        toggleMountStatus(false);
      }
    } else {
      toggleMountStatus(!storageConfig.isMounted);
    }
    setTimeout(() => setIsRechecking(false), 500);
  };

  const getPageTitle = () => {
    const p = location.pathname;
    if (p === '/') return 'Learning Overview';
    if (p.startsWith('/library')) return 'My Vault & Library';
    if (p.startsWith('/import')) return 'Course Ingestion Wizard';
    if (p.startsWith('/studio')) return 'Course Studio';
    if (p.startsWith('/settings')) return 'Preferences & Diagnostics';
    if (p.startsWith('/logs')) return 'System Logs';
    if (p.startsWith('/course/')) return 'Course Curriculum';
    return 'CourseNest Masterclass';
  };

  const mountLabel = storageConfig.externalMountPath
    ? storageConfig.externalMountPath.split(/[/\\]/).filter(Boolean).pop() || 'Removable HDD'
    : 'External Volume';

  return (
    <header className="h-8.5 shrink-0 bg-[var(--cn-surface-subtle)] border-b border-[var(--cn-border)] flex items-center justify-between px-3 select-none text-[12px] text-[var(--cn-text-muted)] font-sans relative z-50 transition-colors">
      {/* Left: Emblem + App Identity + Page Context (Draggable) */}
      <div className="flex items-center gap-2.5 min-w-0 cn-window-drag flex-1">
        <div className="flex items-center gap-1.5 cn-window-no-drag cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-4 h-4 rounded-xs bg-[var(--cn-primary)] text-[var(--cn-primary-text)] flex items-center justify-center font-bold text-[10px]">
            C
          </div>
          <span className="font-bold text-[var(--cn-text-primary)] font-mono text-xs tracking-tight">
            CourseNest
          </span>
          <span className="px-1.5 py-0.2 rounded-xs text-[9px] font-mono font-semibold bg-[var(--cn-surface)] border border-[var(--cn-border)] text-[var(--cn-primary)]">
            v{APP_VERSION}
          </span>
        </div>

        <span className="text-[var(--cn-border-highlight)]">/</span>
        <span className="truncate font-medium text-[var(--cn-text-secondary)] text-[11px] max-w-[260px]">
          {getPageTitle()}
        </span>
      </div>

      {/* Center: Window Drag Zone */}
      <div className="hidden lg:flex items-center justify-center text-[11px] text-[var(--cn-text-muted)] font-mono opacity-60 cn-window-drag px-4">
        CourseNest Private Educational Vault
      </div>

      {/* Right: Storage Status + Theme Studio + Window Controls */}
      <div className="flex items-center gap-2 shrink-0 cn-window-no-drag">
        {/* Storage State Pill */}
        <button
          onClick={handleReconnectStorage}
          title={
            storageConfig.volumeType === 'external'
              ? storageConfig.isMounted
                ? `Removable Drive Connected: ${storageConfig.externalMountPath}`
                : `Removable Drive Disconnected. Click to re-check connection.`
              : 'Internal Local Vault (Always Persistent)'
          }
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono border transition-all ${
            storageConfig.volumeType === 'external'
              ? storageConfig.isMounted
                ? 'bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border-[var(--cn-primary)]/40 hover:bg-[var(--cn-primary-tint)]/80'
                : 'bg-[var(--cn-warning-tint)] text-[var(--cn-warning)] border-[var(--cn-warning)]/40 animate-pulse hover:bg-[var(--cn-warning-tint)]/80'
              : 'bg-[var(--cn-surface)] text-[var(--cn-text-secondary)] border-[var(--cn-border)] hover:bg-[var(--cn-surface-hover)]'
          }`}
        >
          {storageConfig.volumeType === 'external' ? (
            storageConfig.isMounted ? (
              <>
                <IconDeviceFloppy size={11} className="text-[var(--cn-primary)]" />
                <span className="truncate max-w-[120px]">{isRechecking ? 'Checking...' : mountLabel}</span>
              </>
            ) : (
              <>
                <IconAlertTriangle size={11} className="text-[var(--cn-warning)]" />
                <span>{isRechecking ? 'Detecting...' : 'HDD Offline'}</span>
              </>
            )
          ) : (
            <>
              <IconCircleCheck size={11} className="text-[var(--cn-success)]" />
              <span>Internal Vault</span>
            </>
          )}
        </button>

        {/* Quick Search */}
        <button
          onClick={() => navigate('/library')}
          title="Search courses (Ctrl+K)"
          aria-label="Search courses"
          className="p-1 rounded-sm text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)] hover:bg-[var(--cn-surface-hover)] transition-colors"
        >
          <IconSearch size={13} />
        </button>

        {/* Theme Studio Trigger */}
        {onOpenThemeModal && (
          <button
            onClick={onOpenThemeModal}
            title="Theme & Aesthetic Studio"
            aria-label="Theme Studio"
            className="p-1 rounded-sm text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)] hover:bg-[var(--cn-surface-hover)] transition-colors"
          >
            <IconPalette size={13} />
          </button>
        )}

        {/* Quick Day/Night Toggle */}
        <button
          onClick={toggleQuickDark}
          title={currentTheme.isDark ? 'Daylight reading mode' : 'Dark focus mode'}
          aria-label="Toggle theme mode"
          className="p-1 rounded-sm text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)] hover:bg-[var(--cn-surface-hover)] transition-colors"
        >
          {currentTheme.isDark ? <IconSun size={13} /> : <IconMoon size={13} />}
        </button>

        {/* Native-grade Window Controls for Electron (Linux, Windows, macOS) */}
        {isElectron && (
          <div className="flex items-center ml-1 border-l border-[var(--cn-border)] pl-1 -mr-2">
            <button
              onClick={handleMinimize}
              title="Minimize window"
              aria-label="Minimize"
              className="w-8 h-8 flex items-center justify-center text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)] hover:bg-[var(--cn-surface-hover)] transition-colors"
            >
              <IconMinus size={13} strokeWidth={2} />
            </button>
            <button
              onClick={handleMaximize}
              title={isMaximized ? 'Restore window' : 'Maximize window'}
              aria-label="Maximize"
              className="w-8 h-8 flex items-center justify-center text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)] hover:bg-[var(--cn-surface-hover)] transition-colors"
            >
              {isMaximized ? <IconCopy size={12} strokeWidth={2} /> : <IconSquare size={12} strokeWidth={2} />}
            </button>
            <button
              onClick={handleClose}
              title="Close window"
              aria-label="Close"
              className="w-9 h-8 flex items-center justify-center text-[var(--cn-text-muted)] hover:text-white hover:bg-[#E81123] transition-colors"
            >
              <IconX size={13} strokeWidth={2} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
