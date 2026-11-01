import { useState, useEffect, type ReactNode } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ThemeScenicBackdrop } from '../components/ThemeScenicBackdrop';
import { ThemeSelectorModal } from '../components/ThemeSelectorModal';
import { AppTitleBar } from '../components/AppTitleBar';
import { YouTubeMiniPlayer } from '../components/YouTubeMiniPlayer';
import { useStorageConfig, toggleMountStatus } from '../lib/storageConfig';
import { reconcileVaultStorage } from '../lib/courseStore';
import { addNotification } from '../lib/notificationStore';
import { 
  IconLayoutDashboard, 
  IconBooks, 
  IconUpload, 
  IconSettings
} from '@tabler/icons-react';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const { config: storageConfig } = useStorageConfig();
  const location = useLocation();

  const isLessonPlayerPage = location.pathname.includes('/lesson/');

  // Global hotplug watcher: automatically detects when external HDD is connected or disconnected
  useEffect(() => {
    const electron = (window as any).electron || (window as any).__ELECTRON__;
    if (!electron?.storage || storageConfig.volumeType !== 'external') return;

    let isChecking = false;
    const probeVolume = async () => {
      if (isChecking) return;
      isChecking = true;
      try {
        const mountPath = storageConfig.externalMountPath;
        if (!mountPath) return;

        const res = await electron.storage.checkVolumeAccess(mountPath);
        if (res.isMounted !== storageConfig.isMounted) {
          toggleMountStatus(res.isMounted);
          await reconcileVaultStorage(mountPath);
          if (res.isMounted) {
            addNotification({
              title: 'External Storage Connected',
              message: `Removable drive connected at "${mountPath}". Offline courses are ready.`,
              priority: 'normal',
              category: 'backup',
            });
          } else {
            addNotification({
              title: 'External Storage Disconnected',
              message: `Removable drive was unplugged. Course notes and progress are safe.`,
              priority: 'high',
              category: 'backup',
            });
          }
        }
      } catch {} finally {
        isChecking = false;
      }
    };

    // Instant real-time native volume change listener (udev / dbus / proc)
    const cleanupMountListener = electron.storage.onMountsChanged
      ? electron.storage.onMountsChanged(probeVolume)
      : undefined;

    // Fast check on window focus (e.g. user plugged in USB drive and clicked back to app)
    window.addEventListener('focus', probeVolume);

    // Periodic heartbeat check every 3 seconds
    const interval = setInterval(probeVolume, 3000);

    return () => {
      if (cleanupMountListener) cleanupMountListener();
      window.removeEventListener('focus', probeVolume);
      clearInterval(interval);
    };
  }, [storageConfig.volumeType, storageConfig.externalMountPath, storageConfig.isMounted]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-(--cn-bg) text-(--cn-text-primary) antialiased relative">
      {/* Bespoke Theme Atmospheric Scenic Backdrop (Halal Mosque Skyline, Sakura Garden, Ghibli, Manga, Cyberpunk) */}
      <ThemeScenicBackdrop />

      {/* Floating YouTube-Style Picture-in-Picture Mini Player */}
      <YouTubeMiniPlayer />

      {/* Theme Studio Modal */}
      <ThemeSelectorModal isOpen={isThemeModalOpen} onClose={() => setIsThemeModalOpen(false)} />

      {/* Unified Custom Frameless Titlebar & Utility Toolbar */}
      <AppTitleBar onOpenThemeModal={() => setIsThemeModalOpen(true)} />

      {/* Main App Body Row */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex shrink-0">
          <Sidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Scrollable Main Region */}
          <main className={`flex-1 ${isLessonPlayerPage ? 'overflow-hidden' : 'overflow-y-auto pb-16 md:pb-0'}`}>
            {children}
          </main>

          {/* Mobile bottom navigation bar (Hidden on Lesson Player) */}
          {!isLessonPlayerPage && (
            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-(--cn-surface) border-t border-(--cn-border) flex items-center justify-around z-30">
              <Link
                to="/"
                className={`flex flex-col items-center gap-1 text-[11px] ${
                  location.pathname === '/' ? 'text-(--cn-primary) font-semibold' : 'text-(--cn-text-muted)'
                }`}
              >
                <IconLayoutDashboard size={18} />
                Overview
              </Link>
              <Link
                to="/library"
                className={`flex flex-col items-center gap-1 text-[11px] ${
                  location.pathname.startsWith('/library') ? 'text-(--cn-primary) font-semibold' : 'text-(--cn-text-muted)'
                }`}
              >
                <IconBooks size={18} />
                Vault
              </Link>
              <Link
                to="/import"
                className={`flex flex-col items-center gap-1 text-[11px] ${
                  location.pathname.startsWith('/import') ? 'text-(--cn-primary) font-semibold' : 'text-(--cn-text-muted)'
                }`}
              >
                <IconUpload size={18} />
                Add Courses
              </Link>
              <Link
                to="/settings"
                className={`flex flex-col items-center gap-1 text-[11px] ${
                  location.pathname.startsWith('/settings') ? 'text-(--cn-primary) font-semibold' : 'text-(--cn-text-muted)'
                }`}
              >
                <IconSettings size={18} />
                Settings
              </Link>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
