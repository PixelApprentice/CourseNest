import { useState, type ReactNode } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BrandLogo } from '../components/BrandLogo';
import { NotificationDropdown } from '../components/NotificationDropdown';
import { ThemeScenicBackdrop } from '../components/ThemeScenicBackdrop';
import { ThemeSelectorModal } from '../components/ThemeSelectorModal';
import { useTheme } from '../lib/themeManager';
import { 
  IconSearch, 
  IconMoon, 
  IconSun, 
  IconPalette,
  IconLayoutDashboard, 
  IconBooks, 
  IconUpload, 
  IconSettings
} from '@tabler/icons-react';
import { APP_NAME } from '@coursenest/config';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const { currentTheme, setTheme } = useTheme();
  const location = useLocation();

  const toggleQuickDark = () => {
    if (currentTheme.isDark) {
      setTheme('paper');
    } else {
      setTheme('obsidian');
    }
  };

  const getPageContext = () => {
    const path = location.pathname;
    if (path === '/') return { section: 'Home', title: 'Learning Overview' };
    if (path === '/welcome' || path === '/landing') return { section: 'About', title: 'Platform Showcase' };
    if (path.startsWith('/library')) return { section: 'Courses', title: 'My Library' };
    if (path.startsWith('/studio') || path.startsWith('/create')) return { section: 'Authoring', title: 'Course Studio' };
    if (path.startsWith('/import')) return { section: 'Materials', title: 'Add Courses' };
    if (path.startsWith('/course/')) return { section: 'Courses', title: 'Course Details' };
    if (path.startsWith('/settings')) return { section: 'Preferences', title: 'Settings & Logs' };
    if (path.startsWith('/logs')) return { section: 'Diagnostics', title: 'System Logs' };
    return { section: 'CourseNest', title: APP_NAME };
  };

  const context = getPageContext();
  const isLessonPlayerPage = location.pathname.includes('/lesson/');

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--cn-bg)] text-[var(--cn-text-primary)] antialiased relative">
      {/* Dynamic Theme Atmospheric Scenic Backdrop */}
      <ThemeScenicBackdrop />

      {/* Theme Studio Modal */}
      <ThemeSelectorModal isOpen={isThemeModalOpen} onClose={() => setIsThemeModalOpen(false)} />

      {/* Desktop Sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar (Hidden on Lesson Player to prevent double header stacking) */}
        {!isLessonPlayerPage && (
          <header className="h-16 px-6 border-b border-[var(--cn-border)] bg-[var(--cn-surface)] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="md:hidden">
                <BrandLogo size="sm" showBadge={false} />
              </div>

              <div className="hidden md:flex items-center gap-2 text-xs text-[var(--cn-text-muted)] font-mono">
                <span>{context.section}</span>
                <span>/</span>
                <span className="font-sans font-semibold text-[var(--cn-text-primary)] text-sm">{context.title}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Quick search button */}
              <Link
                to="/library"
                className="p-2 rounded-lg text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)] hover:text-[var(--cn-text-primary)] border border-transparent hover:border-[var(--cn-border)] transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-90"
                title="Search courses"
                aria-label="Search courses"
              >
                <IconSearch size={16} />
              </Link>

              {/* Notification Center */}
              <NotificationDropdown />

              {/* Theme & Aesthetic Studio Trigger */}
              <button
                data-testid="theme-studio-btn"
                onClick={() => setIsThemeModalOpen(true)}
                className="p-2 rounded-lg text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)] hover:text-[var(--cn-text-primary)] border border-transparent hover:border-[var(--cn-border)] transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-90 relative"
                title="Open Theme & Aesthetic Studio"
                aria-label="Open Theme & Aesthetic Studio"
              >
                <IconPalette size={16} />
              </button>

              {/* Quick Dark/Light Toggle */}
              <button
                onClick={toggleQuickDark}
                className="p-2 rounded-lg text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)] hover:text-[var(--cn-text-primary)] border border-transparent hover:border-[var(--cn-border)] transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-90"
                title={currentTheme.isDark ? 'Switch to daylight reading' : 'Switch to dark focus'}
                aria-label="Toggle color theme"
              >
                {currentTheme.isDark ? <IconSun size={16} /> : <IconMoon size={16} />}
              </button>
            </div>
          </header>
        )}

        {/* Scrollable Main Region (Dedicated single scroll context for Lesson Player) */}
        <main className={`flex-1 ${isLessonPlayerPage ? 'overflow-hidden' : 'overflow-y-auto pb-16 md:pb-0'}`}>
          {children}
        </main>

        {/* Mobile bottom navigation bar (Hidden on Lesson Player) */}
        {!isLessonPlayerPage && (
          <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[var(--cn-surface)] border-t border-[var(--cn-border)] flex items-center justify-around z-30">
          <Link
            to="/"
            className={`flex flex-col items-center gap-1 text-[11px] ${
              location.pathname === '/' ? 'text-[var(--cn-primary)] font-semibold' : 'text-[var(--cn-text-muted)]'
            }`}
          >
            <IconLayoutDashboard size={18} />
            Overview
          </Link>
          <Link
            to="/library"
            className={`flex flex-col items-center gap-1 text-[11px] ${
              location.pathname.startsWith('/library') ? 'text-[var(--cn-primary)] font-semibold' : 'text-[var(--cn-text-muted)]'
            }`}
          >
            <IconBooks size={18} />
            Vault
          </Link>
          <Link
            to="/import"
            className={`flex flex-col items-center gap-1 text-[11px] ${
              location.pathname.startsWith('/import') ? 'text-[var(--cn-primary)] font-semibold' : 'text-[var(--cn-text-muted)]'
            }`}
          >
            <IconUpload size={18} />
            Add Courses
          </Link>
          <Link
            to="/settings"
            className={`flex flex-col items-center gap-1 text-[11px] ${
              location.pathname.startsWith('/settings') ? 'text-[var(--cn-primary)] font-semibold' : 'text-[var(--cn-text-muted)]'
            }`}
          >
            <IconSettings size={18} />
            Settings
          </Link>
        </nav>
        )}
      </div>
    </div>
  );
}
