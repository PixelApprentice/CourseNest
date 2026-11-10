import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ThemeScenicBackdrop } from '../components/ThemeScenicBackdrop';
import { ThemeSelectorModal } from '../components/ThemeSelectorModal';
import { AppTitleBar } from '../components/AppTitleBar';
import { YouTubeMiniPlayer } from '../components/YouTubeMiniPlayer';
import { reconcileVaultStorage } from '../lib/courseStore';
import { addNotification } from '../lib/notificationStore';
import { useSidebarState, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH } from '../lib/sidebarStore';
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
  const location = useLocation();
  const isLessonPlayerPage = location.pathname.includes('/lesson/');

  // Resizable & Collapsible Sidebar State (Fixes Step 5)
  const {
    width: sidebarWidth,
    rawWidth,
    isCollapsed,
    isDragging,
    setIsDragging,
    isMobileDrawerOpen,
    setIsMobileDrawerOpen,
    updateWidth,
    resetWidth,
    toggleCollapse,
    handleKeyDown,
  } = useSidebarState();

  // Close mobile drawer on navigation
  useEffect(() => {
    setIsMobileDrawerOpen(false);
  }, [location.pathname, setIsMobileDrawerOpen]);

  // Pointer drag event listener with smooth window tracking
  const handleResizePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const startX = e.clientX;
    const initialWidth = isCollapsed ? SIDEBAR_MIN_WIDTH : rawWidth;

    const onPointerMove = (moveEvt: PointerEvent) => {
      const deltaX = moveEvt.clientX - startX;
      updateWidth(initialWidth + deltaX);
    };

    const onPointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }, [isCollapsed, rawWidth, setIsDragging, updateWidth]);

  // Global hotplug watcher: automatically detects when external volumes are connected or disconnected
  useEffect(() => {
    const electron = (window as any).electron || (window as any).__ELECTRON__;
    if (!electron?.storage) return;

    let isChecking = false;
    const probeVolume = async () => {
      if (isChecking) return;
      isChecking = true;
      try {
        await reconcileVaultStorage();
      } catch {} finally {
        isChecking = false;
      }
    };

    // Listen to native volume mounted / unmounted events
    const unsubMounted = electron.storage.onVolumeMounted?.((vol: any) => {
      addNotification({
        title: 'External Storage Connected',
        message: `Volume "${vol.label || vol.uuid || 'Removable Drive'}" connected at ${vol.mountPath}. Offline courses are ready.`,
        priority: 'normal',
        category: 'backup',
      });
      reconcileVaultStorage(vol.mountPath);
    });

    const unsubUnmounted = electron.storage.onVolumeUnmounted?.((vol: any) => {
      addNotification({
        title: 'External Storage Disconnected',
        message: `Volume "${vol.label || vol.uuid || 'Removable Drive'}" was unplugged. Course notes and progress are safe.`,
        priority: 'high',
        category: 'backup',
      });
      reconcileVaultStorage();
    });

    // Native mounts change listener fallback
    const cleanupMountListener = electron.storage.onMountsChanged
      ? electron.storage.onMountsChanged(probeVolume)
      : undefined;

    // Fast check on window focus (e.g. user plugged in USB drive and clicked back to app)
    window.addEventListener('focus', probeVolume);

    // Periodic heartbeat check every 4 seconds
    const interval = setInterval(probeVolume, 4000);

    return () => {
      if (unsubMounted) unsubMounted();
      if (unsubUnmounted) unsubUnmounted();
      if (cleanupMountListener) cleanupMountListener();
      window.removeEventListener('focus', probeVolume);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-(--cn-bg) text-(--cn-text-primary) antialiased relative">
      {/* Bespoke Theme Atmospheric Scenic Backdrop (Halal Mosque Skyline, Sakura Garden, Ghibli, Manga, Cyberpunk) */}
      <ThemeScenicBackdrop />

      {/* Floating YouTube-Style Picture-in-Picture Mini Player */}
      <YouTubeMiniPlayer />

      {/* Theme Studio Modal */}
      <ThemeSelectorModal isOpen={isThemeModalOpen} onClose={() => setIsThemeModalOpen(false)} />

      {/* Unified Custom Frameless Titlebar & Utility Toolbar */}
      <AppTitleBar 
        onOpenThemeModal={() => setIsThemeModalOpen(true)}
        onToggleMobileMenu={() => setIsMobileDrawerOpen((prev) => !prev)}
      />

      {/* Main App Body Row */}
      <div 
        className="flex flex-1 min-h-0 overflow-hidden relative"
        style={{
          ['--sidebar-width' as any]: `${sidebarWidth}px`,
        }}
      >
        {/* Mobile Slide-Over Drawer (< 768px) */}
        {isMobileDrawerOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex animate-in fade-in duration-150">
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setIsMobileDrawerOpen(false)}
              aria-hidden="true"
            />
            <div className="relative w-72 max-w-[85vw] h-full bg-[var(--cn-surface)] shadow-2xl z-10 flex flex-col border-r border-[var(--cn-border)] animate-in slide-in-from-left duration-200">
              <Sidebar isCollapsed={false} className="w-full h-full" onToggleCollapse={() => setIsMobileDrawerOpen(false)} />
            </div>
          </div>
        )}

        {/* Desktop Sidebar with Resizable Container */}
        <div 
          className="hidden md:flex shrink-0 h-full relative"
          style={{ width: sidebarWidth }}
        >
          <Sidebar 
            isCollapsed={isCollapsed} 
            onToggleCollapse={toggleCollapse}
            className="w-full h-full border-r border-[var(--cn-border)]"
          />

          {/* Sidebar Resize Handle */}
          <div
            role="separator"
            tabIndex={0}
            aria-orientation="vertical"
            aria-label="Resize Sidebar"
            aria-valuenow={sidebarWidth}
            aria-valuemin={SIDEBAR_MIN_WIDTH}
            aria-valuemax={SIDEBAR_MAX_WIDTH}
            onPointerDown={handleResizePointerDown}
            onDoubleClick={resetWidth}
            onKeyDown={handleKeyDown}
            className={`absolute top-0 right-0 bottom-0 w-2 -mr-1 z-30 cursor-col-resize select-none flex items-center justify-center transition-colors group/resizer focus-visible:outline-none focus-visible:bg-[var(--cn-primary)] ${
              isDragging ? 'bg-[var(--cn-primary)]' : 'bg-transparent hover:bg-[var(--cn-primary)]/40'
            }`}
            title="Drag to resize sidebar (double-click to reset, arrow keys when focused)"
          >
            <span className="w-0.5 h-6 bg-[var(--cn-border)] group-hover/resizer:bg-[var(--cn-primary)] rounded-full transition-colors" />
          </div>
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
