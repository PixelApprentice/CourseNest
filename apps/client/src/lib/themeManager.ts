import { useState, useEffect } from 'react';

export type ThemeId =
  | 'obsidian'
  | 'halal'
  | 'sakura'
  | 'toybox'
  | 'cyberpunk'
  | 'manga'
  | 'ghibli'
  | 'oled'
  | 'paper';

export type ThemeCategory =
  | 'all'
  | 'halal'
  | 'kawaii_girls'
  | 'kids_playful'
  | 'anime_manga'
  | 'nature_cozy'
  | 'focus_studio';

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  tagline: string;
  audienceLabel: string;
  category: ThemeCategory;
  isDark: boolean;
  fonts: {
    display: string;
    body: string;
    mono: string;
  };
  palette: {
    bg: string;
    surface: string;
    border: string;
    primary: string;
    accent: string;
    text: string;
  };
  borderRadiusMode: 'bubbly' | 'rounded' | 'sharp' | 'pebble' | 'standard';
  patternType: 'arabesque' | 'petals' | 'confetti' | 'grid' | 'screentone' | 'botanical' | 'dots' | 'none';
  loaderType: 'star8' | 'blossom' | 'blocks' | 'radar' | 'speedline' | 'leaf' | 'orbit';
  badgeLabel: string;
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'obsidian',
    name: 'Obsidian Moss',
    tagline: 'Deep Focus & Minimalist Velvet',
    audienceLabel: 'STEM, Engineering & Deep Work',
    category: 'focus_studio',
    isDark: true,
    fonts: {
      display: 'DM Sans',
      body: 'DM Sans',
      mono: 'JetBrains Mono',
    },
    palette: {
      bg: '#0A0A0B',
      surface: '#121316',
      border: '#202328',
      primary: '#57C564',
      accent: '#F59E0B',
      text: '#F8FAFC',
    },
    borderRadiusMode: 'standard',
    patternType: 'dots',
    loaderType: 'orbit',
    badgeLabel: 'Default Studio',
  },
  {
    id: 'halal',
    name: 'Halal Serenity',
    tagline: 'Islamic Geometric Harmony & Modesty',
    audienceLabel: 'Islamic & Contemplative Learners',
    category: 'halal',
    isDark: false,
    fonts: {
      display: 'Plus Jakarta Sans',
      body: 'DM Sans',
      mono: 'JetBrains Mono',
    },
    palette: {
      bg: '#FBF9F4',
      surface: '#FFFFFF',
      border: '#E3DCce',
      primary: '#047857',
      accent: '#D97706',
      text: '#1B2E26',
    },
    borderRadiusMode: 'rounded',
    patternType: 'arabesque',
    loaderType: 'star8',
    badgeLabel: 'Halal Edition',
  },
  {
    id: 'sakura',
    name: 'Sakura Bloom',
    tagline: 'Kawaii Pastel & Floral Cozy',
    audienceLabel: 'Girls & Pastel Aesthetic Lovers',
    category: 'kawaii_girls',
    isDark: false,
    fonts: {
      display: 'Nunito',
      body: 'Nunito',
      mono: 'JetBrains Mono',
    },
    palette: {
      bg: '#FFF5F7',
      surface: '#FFFFFF',
      border: '#FBCFE8',
      primary: '#EC4899',
      accent: '#A855F7',
      text: '#831843',
    },
    borderRadiusMode: 'bubbly',
    patternType: 'petals',
    loaderType: 'blossom',
    badgeLabel: 'Kawaii Pastel',
  },
  {
    id: 'toybox',
    name: 'Toybox Bubbly',
    tagline: 'Tactile Claymorphism & Sunny Joy',
    audienceLabel: 'Children & Playful Elementary',
    category: 'kids_playful',
    isDark: false,
    fonts: {
      display: 'Fredoka',
      body: 'Nunito',
      mono: 'JetBrains Mono',
    },
    palette: {
      bg: '#FEFCE8',
      surface: '#FFFFFF',
      border: '#FDE047',
      primary: '#0284C7',
      accent: '#F59E0B',
      text: '#1E293B',
    },
    borderRadiusMode: 'bubbly',
    patternType: 'confetti',
    loaderType: 'blocks',
    badgeLabel: 'Kids Edition',
  },
  {
    id: 'cyberpunk',
    name: 'Neo-Tokyo Mecha',
    tagline: 'High-Tech HUD & Electric Neon',
    audienceLabel: 'Boys & Anime Sci-Fi Enthusiasts',
    category: 'anime_manga',
    isDark: true,
    fonts: {
      display: 'Chakra Petch',
      body: 'Chakra Petch',
      mono: 'JetBrains Mono',
    },
    palette: {
      bg: '#080A10',
      surface: '#0F131F',
      border: '#1E2640',
      primary: '#00F0FF',
      accent: '#FF007F',
      text: '#F0F6FC',
    },
    borderRadiusMode: 'sharp',
    patternType: 'grid',
    loaderType: 'radar',
    badgeLabel: 'Anime Mecha',
  },
  {
    id: 'manga',
    name: 'Manga Screentone',
    tagline: 'Dynamic Ink & Halftone Action',
    audienceLabel: 'Shonen Anime & Comic Fans',
    category: 'anime_manga',
    isDark: false,
    fonts: {
      display: 'DM Sans',
      body: 'DM Sans',
      mono: 'JetBrains Mono',
    },
    palette: {
      bg: '#FAFAFA',
      surface: '#FFFFFF',
      border: '#18181B',
      primary: '#DC2626',
      accent: '#F97316',
      text: '#09090B',
    },
    borderRadiusMode: 'sharp',
    patternType: 'screentone',
    loaderType: 'speedline',
    badgeLabel: 'Manga Comic',
  },
  {
    id: 'ghibli',
    name: 'Ghibli Nature',
    tagline: 'Warm Watercolor & Whimsical Foliage',
    audienceLabel: 'Cottagecore & Cozy Whimsy',
    category: 'nature_cozy',
    isDark: false,
    fonts: {
      display: 'Plus Jakarta Sans',
      body: 'Plus Jakarta Sans',
      mono: 'JetBrains Mono',
    },
    palette: {
      bg: '#F5F2EB',
      surface: '#FCFAF6',
      border: '#DCD5C5',
      primary: '#3B7A57',
      accent: '#C2593F',
      text: '#2C2621',
    },
    borderRadiusMode: 'pebble',
    patternType: 'botanical',
    loaderType: 'leaf',
    badgeLabel: 'Ghibli Whimsy',
  },
  {
    id: 'oled',
    name: 'OLED Midnight',
    tagline: 'Pure #000000 Battery Saver',
    audienceLabel: 'Night Shift & OLED Tablets',
    category: 'focus_studio',
    isDark: true,
    fonts: {
      display: 'DM Sans',
      body: 'DM Sans',
      mono: 'JetBrains Mono',
    },
    palette: {
      bg: '#000000',
      surface: '#0A0A0A',
      border: '#222222',
      primary: '#10B981',
      accent: '#3B82F6',
      text: '#FFFFFF',
    },
    borderRadiusMode: 'standard',
    patternType: 'none',
    loaderType: 'orbit',
    badgeLabel: 'OLED Pure Black',
  },
  {
    id: 'paper',
    name: 'Clean Daylight',
    tagline: 'Crisp Editorial Paper Daylight',
    audienceLabel: 'High-Brightness Reading',
    category: 'focus_studio',
    isDark: false,
    fonts: {
      display: 'Plus Jakarta Sans',
      body: 'DM Sans',
      mono: 'JetBrains Mono',
    },
    palette: {
      bg: '#F8F9FA',
      surface: '#FFFFFF',
      border: '#E2E5E9',
      primary: '#3BA849',
      accent: '#D97706',
      text: '#121417',
    },
    borderRadiusMode: 'standard',
    patternType: 'none',
    loaderType: 'orbit',
    badgeLabel: 'Daylight Mode',
  },
];

const THEME_STORAGE_KEY = 'coursenest_active_theme_v3';

export function getThemeById(id: string): ThemeDefinition {
  return THEMES.find((t) => t.id === id) || THEMES[0]!;
}

export function getCurrentThemeId(): ThemeId {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId;
    if (saved && THEMES.some((t) => t.id === saved)) {
      return saved;
    }
    // Backward compatibility with legacy cn-theme ('dark' | 'light')
    const legacy = localStorage.getItem('cn-theme');
    if (legacy === 'light') return 'paper';
    if (legacy === 'dark') return 'obsidian';
  } catch {}
  return 'obsidian';
}

export function applyTheme(themeId: ThemeId): void {
  try {
    const theme = getThemeById(themeId);
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
    localStorage.setItem('cn-theme', theme.isDark ? 'dark' : 'light');

    document.documentElement.setAttribute('data-theme', themeId);
    if (theme.isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    window.dispatchEvent(
      new CustomEvent('coursenest_theme_changed', {
        detail: { themeId, theme },
      }),
    );
  } catch (err) {
    console.warn('Failed to apply theme:', err);
  }
}

export function useTheme() {
  const [themeId, setThemeId] = useState<ThemeId>(getCurrentThemeId);

  useEffect(() => {
    // Initial sync
    const current = getCurrentThemeId();
    document.documentElement.setAttribute('data-theme', current);
    const def = getThemeById(current);
    if (def.isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ themeId: ThemeId }>;
      if (customEvent.detail?.themeId) {
        setThemeId(customEvent.detail.themeId);
      } else {
        setThemeId(getCurrentThemeId());
      }
    };

    window.addEventListener('coursenest_theme_changed', handleThemeChange);
    return () => {
      window.removeEventListener('coursenest_theme_changed', handleThemeChange);
    };
  }, []);

  const currentTheme = getThemeById(themeId);

  const setTheme = (nextId: ThemeId) => {
    applyTheme(nextId);
    setThemeId(nextId);
  };

  return {
    themeId,
    currentTheme,
    setTheme,
    availableThemes: THEMES,
  };
}
