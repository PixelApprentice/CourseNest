import { useState, useEffect, type ReactNode } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BrandLogo } from '../components/BrandLogo';
import { NotificationDropdown } from '../components/NotificationDropdown';
import { 
  Search, 
  Moon, 
  Sun, 
  Home, 
  Library, 
  Upload, 
  Settings
} from 'lucide-react';
import { APP_NAME } from '@coursenest/config';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isDark, setIsDark] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial theme check
    const savedTheme = localStorage.getItem('cn-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = !isDark;
    setIsDark(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme ? 'dark' : 'light');
    localStorage.setItem('cn-theme', nextTheme ? 'dark' : 'light');
  };

  // Determine page title & breadcrumb
  const getPageContext = () => {
    const path = location.pathname;
    if (path === '/') return { section: 'Home', title: 'Learning Overview' };
    if (path === '/welcome' || path === '/landing') return { section: 'About', title: 'Platform Showcase' };
    if (path.startsWith('/library')) return { section: 'Courses', title: 'My Library' };
    if (path.startsWith('/import')) return { section: 'Materials', title: 'Add Courses' };
    if (path.startsWith('/course/')) return { section: 'Courses', title: 'Course Details' };
    if (path.startsWith('/settings')) return { section: 'Preferences', title: 'Settings' };
    if (path.startsWith('/logs')) return { section: 'Diagnostics', title: 'System Logs' };
    return { section: 'CourseNest', title: APP_NAME };
  };

  const context = getPageContext();

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--cn-bg)] text-[var(--cn-text-primary)] antialiased">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
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
            {/* Offline Vault Indicator */}
            <div 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-medium border ${
                isOnline
                  ? 'bg-[var(--cn-surface-subtle)] text-[var(--cn-text-secondary)] border-[var(--cn-border)]'
                  : 'bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border-[var(--cn-primary)]/40'
              }`}
              title="CourseNest runs entirely on your local machine without tracking or internet requirements"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--cn-primary)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--cn-primary)]"></span>
              </span>
              <span className="text-[11px] font-semibold tracking-wide">
                LOCAL VAULT {isOnline ? 'READY' : 'OFFLINE'}
              </span>
            </div>

            {/* Quick search button */}
            <Link
              to="/library"
              className="p-2 rounded-lg text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)] hover:text-[var(--cn-text-primary)] border border-transparent hover:border-[var(--cn-border)] transition-colors"
              title="Search courses"
              aria-label="Search courses"
            >
              <Search size={16} />
            </Link>

            {/* Notification Center */}
            <NotificationDropdown />

            {/* Theme switcher */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)] hover:text-[var(--cn-text-primary)] border border-transparent hover:border-[var(--cn-border)] transition-colors"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle color theme"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        {/* Scrollable Main Region */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>

        {/* Mobile bottom navigation bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[var(--cn-surface)] border-t border-[var(--cn-border)] flex items-center justify-around z-30">
          <Link
            to="/"
            className={`flex flex-col items-center gap-1 text-[11px] ${
              location.pathname === '/' ? 'text-[var(--cn-primary)] font-semibold' : 'text-[var(--cn-text-muted)]'
            }`}
          >
            <Home size={18} />
            Overview
          </Link>
          <Link
            to="/library"
            className={`flex flex-col items-center gap-1 text-[11px] ${
              location.pathname.startsWith('/library') ? 'text-[var(--cn-primary)] font-semibold' : 'text-[var(--cn-text-muted)]'
            }`}
          >
            <Library size={18} />
            Vault
          </Link>
          <Link
            to="/import"
            className={`flex flex-col items-center gap-1 text-[11px] ${
              location.pathname.startsWith('/import') ? 'text-[var(--cn-primary)] font-semibold' : 'text-[var(--cn-text-muted)]'
            }`}
          >
            <Upload size={18} />
            Add Courses
          </Link>
          <Link
            to="/settings"
            className={`flex flex-col items-center gap-1 text-[11px] ${
              location.pathname.startsWith('/settings') ? 'text-[var(--cn-primary)] font-semibold' : 'text-[var(--cn-text-muted)]'
            }`}
          >
            <Settings size={18} />
            Settings
          </Link>
        </nav>
      </div>
    </div>
  );
}
