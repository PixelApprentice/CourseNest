import { NavLink } from 'react-router-dom';
import { Home, Library, Upload, Settings, ShieldCheck, Database, Terminal, Sparkles } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { useVaultCourses, getVaultAnalytics } from '../lib/courseStore';

const navItems = [
  { to: '/', icon: Home, label: 'Overview' },
  { to: '/welcome', icon: Sparkles, label: 'Platform Showcase' },
  { to: '/library', icon: Library, label: 'My Courses' },
  { to: '/import', icon: Upload, label: 'Add Materials' },
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/logs', icon: Terminal, label: 'System Logs' },
] as const;

export function Sidebar() {
  const { courses } = useVaultCourses();
  const analytics = getVaultAnalytics();

  return (
    <aside className="flex flex-col w-64 border-r border-[var(--cn-border)] bg-[var(--cn-surface)] select-none">
      {/* Brand Header with Bespoke Geometric Codex Mark */}
      <div className="h-16 px-5 border-b border-[var(--cn-border)] flex items-center justify-between">
        <BrandLogo size="md" />
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1.5">
        <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider uppercase text-[var(--cn-text-muted)] font-mono">
          Workspace
        </div>

        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] font-semibold shadow-xs'
                  : 'text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)] hover:text-[var(--cn-text-primary)]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[var(--cn-primary)]" />
                )}
                <Icon size={16} className={isActive ? 'text-[var(--cn-primary)]' : 'text-[var(--cn-text-muted)] group-hover:text-[var(--cn-text-primary)] transition-colors'} />
                <span className="flex-1">{label}</span>
                {to === '/library' && courses.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[var(--cn-surface-subtle)] text-[var(--cn-text-muted)] border border-[var(--cn-border)]">
                    {courses.length}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Vault Telemetry Widget */}
      <div className="p-4 mx-3 mb-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-bg)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database size={13} className="text-[var(--cn-primary)]" />
            <span className="text-[11px] font-semibold text-[var(--cn-text-primary)]">Offline Vault</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--cn-success-tint)] text-[var(--cn-success)] border border-[var(--cn-success)]/30 font-medium">
            Active
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <p className="text-[10px] text-[var(--cn-text-muted)]">Courses</p>
            <p className="font-mono font-semibold text-[var(--cn-text-primary)]">{analytics.totalCourses}</p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--cn-text-muted)]">Lessons</p>
            <p className="font-mono font-semibold text-[var(--cn-text-primary)]">{analytics.totalLessons}</p>
          </div>
        </div>

        <div className="pt-2 border-t border-[var(--cn-border)]/60 flex items-center justify-between text-[10px] text-[var(--cn-text-muted)]">
          <span className="flex items-center gap-1">
            <ShieldCheck size={11} className="text-[var(--cn-success)]" />
            Private & Offline
          </span>
          <span className="font-mono font-medium text-[var(--cn-text-secondary)]">{analytics.estimatedStorageMB} MB</span>
        </div>
      </div>
    </aside>
  );
}
