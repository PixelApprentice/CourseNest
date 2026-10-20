import { useState, useEffect, type ReactNode } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { 
  Wifi, 
  WifiOff, 
  Search, 
  Moon, 
  Sun, 
  Home, 
  Library, 
  Upload, 
  Settings,
  BookOpen
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

  // Determine page title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Home';
    if (path.startsWith('/library')) return 'Course Library';
    if (path.startsWith('/import')) return 'Import Materials';
    if (path.startsWith('/course/')) return 'Course Overview';
    if (path.startsWith('/settings')) return 'Settings';
    return APP_NAME;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--cn-bg)] text-[var(--cn-text-primary)]">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar with context, offline status, theme, search */}
        <header className="h-14 px-6 border-b border-[var(--cn-border)] bg-[var(--cn-surface)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="md:hidden font-semibold text-[var(--cn-primary)] flex items-center gap-2">
              <BookOpen size={20} />
              {APP_NAME}
            </span>
            <span className="hidden md:inline-block text-sm font-medium text-[var(--cn-text-muted)]">
              /
            </span>
            <h1 className="text-sm font-semibold text-[var(--cn-text-primary)]">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Offline status badge — always pairs icon with clear text */}
            <div 
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isOnline
                  ? 'bg-[var(--cn-success-tint)] text-[var(--cn-success)] border-[var(--cn-success)]/30'
                  : 'bg-[var(--cn-warning-tint)] text-[var(--cn-warning)] border-[var(--cn-warning)]/40'
              }`}
              title={isOnline ? 'Online — local courses remain fully offline capable' : 'Offline — all downloaded materials are available'}
            >
              {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
              <span>{isOnline ? 'Local & Synced' : 'Offline Mode'}</span>
            </div>

            {/* Quick search link */}
            <Link
              to="/library"
              className="p-2 rounded-lg text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)] hover:text-[var(--cn-text-primary)] transition-colors"
              title="Search courses"
              aria-label="Search courses"
            >
              <Search size={17} />
            </Link>

            {/* Theme switcher */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)] hover:text-[var(--cn-text-primary)] transition-colors"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle color theme"
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </header>

        {/* Scrollable Main Region */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>

        {/* Mobile bottom navigation bar for phones/tablets */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-[var(--cn-surface)] border-t border-[var(--cn-border)] flex items-center justify-around z-20">
          <Link
            to="/"
            className={`flex flex-col items-center gap-1 text-xs ${
              location.pathname === '/' ? 'text-[var(--cn-primary)] font-semibold' : 'text-[var(--cn-text-muted)]'
            }`}
          >
            <Home size={18} />
            Home
          </Link>
          <Link
            to="/library"
            className={`flex flex-col items-center gap-1 text-xs ${
              location.pathname.startsWith('/library') ? 'text-[var(--cn-primary)] font-semibold' : 'text-[var(--cn-text-muted)]'
            }`}
          >
            <Library size={18} />
            Courses
          </Link>
          <Link
            to="/import"
            className={`flex flex-col items-center gap-1 text-xs ${
              location.pathname.startsWith('/import') ? 'text-[var(--cn-primary)] font-semibold' : 'text-[var(--cn-text-muted)]'
            }`}
          >
            <Upload size={18} />
            Import
          </Link>
          <Link
            to="/settings"
            className={`flex flex-col items-center gap-1 text-xs ${
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
