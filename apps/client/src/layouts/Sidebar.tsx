import { NavLink } from 'react-router-dom';
import { Home, Library, Upload, Settings, BookOpen } from 'lucide-react';
import { APP_NAME } from '@coursenest/config';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/library', icon: Library, label: 'Course Library' },
  { to: '/import', icon: Upload, label: 'Import Materials' },
  { to: '/settings', icon: Settings, label: 'Settings' },
] as const;

export function Sidebar() {
  return (
    <aside className="flex flex-col w-60 border-r border-[var(--cn-border)] bg-[var(--cn-surface)] select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-2.5 h-14 px-5 border-b border-[var(--cn-border)]">
        <div className="w-8 h-8 rounded-lg bg-[var(--cn-primary)] text-white flex items-center justify-center font-bold">
          <BookOpen size={18} />
        </div>
        <div>
          <h1 className="text-sm font-bold text-[var(--cn-text-primary)] leading-tight">{APP_NAME}</h1>
          <p className="text-[10px] text-[var(--cn-text-muted)] font-medium tracking-wide uppercase">Local Studio</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--cn-primary-tint)] text-[var(--cn-primary)]'
                  : 'text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)] hover:text-[var(--cn-text-primary)]'
              }`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-[var(--cn-border)] text-xs text-[var(--cn-text-muted)]">
        <p className="font-medium text-[var(--cn-text-secondary)]">Local-First Storage</p>
        <p className="text-[11px] mt-0.5">Offline ready & private</p>
      </div>
    </aside>
  );
}
