import { useState } from 'react';
import { useTheme, type ThemeId, type ThemeCategory, type ThemeDefinition } from '../lib/themeManager';
import { 
  IconCheck, 
  IconMoonStars, 
  IconPalette, 
  IconMoon, 
  IconSun, 
  IconDeviceTv,
  IconHeart,
  IconLego,
  IconTerminal2,
  IconFlame,
  IconPlant2
} from '@tabler/icons-react';
import clsx from 'clsx';

interface ThemeSelectorGridProps {
  onThemeSelected?: (themeId: ThemeId) => void;
  compact?: boolean;
}

const CATEGORY_TABS: { id: ThemeCategory; label: string }[] = [
  { id: 'all', label: 'All Themes' },
  { id: 'halal', label: 'Halal Edition' },
  { id: 'kawaii_girls', label: 'Girls & Kawaii' },
  { id: 'kids_playful', label: 'Children & Kids' },
  { id: 'anime_manga', label: 'Anime & Manga' },
  { id: 'nature_cozy', label: 'Nature & Cozy' },
  { id: 'focus_studio', label: 'Focus & Dark' },
];

export function ThemeSelectorGrid({ onThemeSelected, compact = false }: ThemeSelectorGridProps) {
  const { themeId: activeThemeId, setTheme, availableThemes } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<ThemeCategory>('all');

  const filteredThemes = availableThemes.filter((t) => {
    if (selectedCategory === 'all') return true;
    return t.category === selectedCategory;
  });

  const handleSelect = (id: ThemeId) => {
    setTheme(id);
    onThemeSelected?.(id);
  };

  const getThemeIcon = (theme: ThemeDefinition) => {
    switch (theme.id) {
      case 'halal':
        return <IconMoonStars size={16} className="text-[#047857]" />;
      case 'sakura':
        return <IconHeart size={16} className="text-[#EC4899]" />;
      case 'toybox':
        return <IconLego size={16} className="text-[#0284C7]" />;
      case 'cyberpunk':
        return <IconTerminal2 size={16} className="text-[#00F0FF]" />;
      case 'manga':
        return <IconFlame size={16} className="text-[#DC2626]" />;
      case 'ghibli':
        return <IconPlant2 size={16} className="text-[#3B7A57]" />;
      case 'oled':
        return <IconMoon size={16} className="text-[#10B981]" />;
      case 'paper':
        return <IconSun size={16} className="text-[#3BA849]" />;
      case 'obsidian':
      default:
        return <IconDeviceTv size={16} className="text-[#57C564]" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Category Filter Pills */}
      {!compact && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-[var(--cn-border)]">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              data-category-id={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-mono font-medium whitespace-nowrap transition-all',
                selectedCategory === tab.id
                  ? 'bg-[var(--cn-primary)] text-[var(--cn-primary-text)] font-semibold shadow-xs'
                  : 'bg-[var(--cn-surface-subtle)] text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-hover)] hover:text-[var(--cn-text-primary)] border border-transparent'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Theme Cards Grid */}
      <div className={clsx('grid gap-4', compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}>
        {filteredThemes.map((theme) => {
          const isActive = activeThemeId === theme.id;

          return (
            <div
              key={theme.id}
              data-theme-id={theme.id}
              onClick={() => handleSelect(theme.id)}
              className={clsx(
                'group relative rounded-2xl border p-5 cursor-pointer transition-all duration-200 flex flex-col justify-between overflow-hidden',
                isActive
                  ? 'border-[var(--cn-primary)] bg-[var(--cn-surface)] shadow-md ring-2 ring-[var(--cn-primary)]/20'
                  : 'border-[var(--cn-border)] bg-[var(--cn-surface)] hover:border-[var(--cn-border)]/80 hover:bg-[var(--cn-surface-subtle)] hover:shadow-xs'
              )}
              style={{
                borderRadius:
                  theme.borderRadiusMode === 'bubbly'
                    ? '24px'
                    : theme.borderRadiusMode === 'sharp'
                    ? '8px'
                    : theme.borderRadiusMode === 'pebble'
                    ? '18px'
                    : '14px',
              }}
            >
              {/* Header: Icon, Name & Badge */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="p-2 rounded-xl flex items-center justify-center shrink-0 border"
                      style={{
                        backgroundColor: theme.palette.bg,
                        borderColor: theme.palette.border,
                      }}
                    >
                      {getThemeIcon(theme)}
                    </div>
                    <div>
                      <h3
                        className="text-sm font-bold tracking-tight text-[var(--cn-text-primary)] group-hover:text-[var(--cn-primary)] transition-colors"
                        style={{ fontFamily: theme.fonts.display }}
                      >
                        {theme.name}
                      </h3>
                      <p className="text-[11px] text-[var(--cn-text-muted)] line-clamp-1">{theme.tagline}</p>
                    </div>
                  </div>

                  {isActive && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--cn-primary)] text-[var(--cn-primary-text)] shadow-xs shrink-0">
                      <IconCheck size={12} strokeWidth={3} />
                      Active
                    </span>
                  )}
                </div>

                <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--cn-text-muted)] pt-1">
                  {theme.audienceLabel}
                </p>
              </div>

              {/* Theme Live Visual Swatch Preview */}
              <div className="mt-4 pt-4 border-t border-[var(--cn-border)]/60 space-y-3">
                {/* 4-Color Swatch Bar */}
                <div
                  className="p-2.5 rounded-xl border flex items-center justify-between gap-2 shadow-inner"
                  style={{
                    backgroundColor: theme.palette.bg,
                    borderColor: theme.palette.border,
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-4 h-4 rounded-full border border-black/10 shadow-xs"
                      style={{ backgroundColor: theme.palette.primary }}
                      title="Primary brand"
                    />
                    <span
                      className="w-4 h-4 rounded-full border border-black/10 shadow-xs"
                      style={{ backgroundColor: theme.palette.accent }}
                      title="Accent"
                    />
                    <span
                      className="w-4 h-4 rounded-full border border-black/10 shadow-xs"
                      style={{ backgroundColor: theme.palette.surface }}
                      title="Surface"
                    />
                  </div>

                  <span
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md"
                    style={{
                      color: theme.palette.text,
                      backgroundColor: theme.palette.surface,
                      borderColor: theme.palette.border,
                    }}
                  >
                    {theme.fonts.display}
                  </span>
                </div>

                {/* Apply Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(theme.id);
                  }}
                  className={clsx(
                    'w-full py-2 px-3 rounded-lg text-xs font-mono font-medium transition-all active:scale-[0.98] flex items-center justify-center gap-1.5',
                    isActive
                      ? 'bg-[var(--cn-primary)] text-[var(--cn-primary-text)] font-semibold shadow-xs'
                      : 'border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)] text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface)] hover:text-[var(--cn-text-primary)]'
                  )}
                >
                  {isActive ? (
                    <>
                      <IconCheck size={14} />
                      <span>Current Active Theme</span>
                    </>
                  ) : (
                    <>
                      <IconPalette size={14} />
                      <span>Apply Theme</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
