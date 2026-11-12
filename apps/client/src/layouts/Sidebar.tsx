import { NavLink } from 'react-router-dom';
import { 
  IconLayoutDashboard, 
  IconBooks, 
  IconUpload, 
  IconSettings, 
  IconSparkles,
  IconChevronLeft,
  IconChevronRight
} from '@tabler/icons-react';
import { BrandLogo } from '../components/BrandLogo';
import { ThemeBackdropPattern } from '../components/ThemeBackdropPattern';
import { useVaultCourses } from '../lib/courseStore';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export function Sidebar({ isCollapsed = false, onToggleCollapse, className = '' }: SidebarProps) {
  const { courses } = useVaultCourses();

  const navItems = [
    { to: '/', icon: IconLayoutDashboard, label: 'Overview' },
    { to: '/library', icon: IconBooks, label: 'My Courses' },
    { to: '/import', icon: IconUpload, label: 'Import Materials' },
    { to: '/studio', icon: IconSparkles, label: 'Course Studio' },
    { to: '/settings', icon: IconSettings, label: 'Settings' },
  ];

  return (
    <aside 
      className={`flex flex-col h-full bg-[var(--cn-surface)] select-none transition-[width] duration-200 ease-out overflow-hidden relative ${className}`}
      aria-label="Main Navigation"
    >
      {/* Theme Backdrop Pattern Overlay on Sidebar Surface */}
      <ThemeBackdropPattern className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none" idPrefix="sidebar" />

      <div className="relative z-10 flex flex-col h-full min-h-0">
        {/* Aligned Header matching Navbar height cleanly (Fixes Seam) */}
        <div className={`h-11 shrink-0 border-b border-[var(--cn-border)] flex items-center justify-between transition-all ${
          isCollapsed ? 'px-2 justify-center' : 'px-4'
        }`}>
          <BrandLogo size="sm" showBadge={false} showText={!isCollapsed} />
          {!isCollapsed && onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Collapse sidebar to icon rail"
              aria-label="Collapse sidebar to icon rail"
              className="p-1 rounded-md text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)] hover:bg-[var(--cn-surface-hover)] transition-colors"
            >
              <IconChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Primary Navigation */}
        <nav className={`flex-1 space-y-1 overflow-y-auto ${isCollapsed ? 'px-1.5 py-3' : 'px-3 py-4'}`}>
          {!isCollapsed && (
            <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider uppercase text-[var(--cn-text-muted)] font-mono">
              Workspace
            </div>
          )}

          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={isCollapsed ? label : undefined}
              className={({ isActive }) =>
                `group relative flex items-center rounded-xl text-xs font-medium transition-[background-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.97] ${
                  isCollapsed
                    ? 'justify-center p-2.5 my-1'
                    : 'gap-3 px-3.5 py-2.5'
                } ${
                  isActive
                    ? 'bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] font-semibold shadow-xs'
                    : 'text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)] hover:text-[var(--cn-text-primary)]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[var(--cn-primary)] ${isCollapsed ? 'w-1' : 'w-1'}`} />
                  )}
                  <Icon size={18} className={isActive ? 'text-[var(--cn-primary)]' : 'text-[var(--cn-text-muted)] group-hover:text-[var(--cn-text-primary)] transition-colors shrink-0'} />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 truncate">{label}</span>
                      {to === '/library' && courses.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[var(--cn-surface-subtle)] text-[var(--cn-text-muted)] border border-[var(--cn-border)]">
                          {courses.length}
                        </span>
                      )}
                    </>
                  )}
                  {isCollapsed && to === '/library' && courses.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--cn-primary)]" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer Navigation Action */}
        {isCollapsed ? (
          <div className="p-2 border-t border-[var(--cn-border)]/60 flex flex-col items-center gap-2">
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Expand sidebar"
                aria-label="Expand sidebar"
                className="p-2 rounded-lg text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)] hover:bg-[var(--cn-surface-hover)] transition-colors cursor-pointer"
              >
                <IconChevronRight size={16} />
              </button>
            )}
          </div>
        ) : (
          onToggleCollapse && (
            <div className="p-3 border-t border-[var(--cn-border)]/60">
              <button
                type="button"
                onClick={onToggleCollapse}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)] hover:bg-[var(--cn-surface-hover)] transition-colors w-full cursor-pointer"
              >
                <IconChevronLeft size={16} />
                <span>Collapse sidebar</span>
              </button>
            </div>
          )
        )}
      </div>
    </aside>
  );
}
