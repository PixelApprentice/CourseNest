import { NavLink } from 'react-router-dom';
import { 
  IconLayoutDashboard, 
  IconBooks, 
  IconUpload, 
  IconSettings, 
  IconSparkles,
  IconDatabase,
  IconShieldCheck
} from '@tabler/icons-react';
import { BrandLogo } from '../components/BrandLogo';
import { useVaultCourses, getVaultAnalytics } from '../lib/courseStore';

const navItems = [
  { to: '/', icon: IconLayoutDashboard, label: 'Overview' },
  { to: '/library', icon: IconBooks, label: 'My Courses' },
  { to: '/studio', icon: IconSparkles, label: 'Course Studio' },
  { to: '/import', icon: IconUpload, label: 'Add Materials' },
  { to: '/settings', icon: IconSettings, label: 'Settings & Logs' },
] as const;

export function Sidebar() {
  const { courses } = useVaultCourses();
  const analytics = getVaultAnalytics();

  return (
    <aside className="flex flex-col w-64 border-r border-(--cn-border) bg-(--cn-surface) select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-(--cn-border) flex items-center justify-between">
        <BrandLogo size="md" showBadge={true} />
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1.5">
        <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider uppercase text-(--cn-text-muted) font-mono">
          Workspace
        </div>

        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-[background-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.98] ${
                isActive
                  ? 'bg-(--cn-primary-tint) text-(--cn-primary) font-semibold shadow-xs'
                  : 'text-(--cn-text-secondary) hover:bg-(--cn-surface-subtle) hover:text-(--cn-text-primary)'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-(--cn-primary)" />
                )}
                <Icon size={18} className={isActive ? 'text-(--cn-primary)' : 'text-(--cn-text-muted) group-hover:text-(--cn-text-primary) transition-colors'} />
                <span className="flex-1">{label}</span>
                {to === '/library' && courses.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-(--cn-surface-subtle) text-(--cn-text-muted) border border-(--cn-border)">
                    {courses.length}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Vault Telemetry Widget */}
      <div className="p-4 mx-3 mb-4 rounded-xl border border-(--cn-border) bg-(--cn-bg) space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconDatabase size={15} className="text-(--cn-primary)" />
            <span className="text-[11px] font-semibold text-(--cn-text-primary)">Vault Storage</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-(--cn-success-tint) text-(--cn-success) border border-(--cn-success)/30 font-medium">
            Active
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <p className="text-[10px] text-(--cn-text-muted)">Courses</p>
            <p className="font-mono font-semibold text-(--cn-text-primary)">{analytics.totalCourses}</p>
          </div>
          <div>
            <p className="text-[10px] text-(--cn-text-muted)">Lessons</p>
            <p className="font-mono font-semibold text-(--cn-text-primary)">{analytics.totalLessons}</p>
          </div>
        </div>

        <div className="pt-2 border-t border-(--cn-border)/60 flex items-center justify-between text-[10px] text-(--cn-text-muted)">
          <span className="flex items-center gap-1">
            <IconShieldCheck size={13} className="text-(--cn-success)" />
            Encrypted Local
          </span>
          <span className="font-mono font-medium text-(--cn-text-secondary)">{analytics.estimatedStorageMB} MB</span>
        </div>
      </div>
    </aside>
  );
}
