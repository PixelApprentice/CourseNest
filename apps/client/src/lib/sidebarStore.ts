import { useState, useCallback } from 'react';

export const SIDEBAR_MIN_WIDTH = 180;
export const SIDEBAR_MAX_WIDTH = 420;
export const SIDEBAR_DEFAULT_WIDTH = 256;
export const SIDEBAR_RAIL_WIDTH = 64;

const STORAGE_KEY_WIDTH = 'coursenest_sidebar_width';
const STORAGE_KEY_COLLAPSED = 'coursenest_sidebar_collapsed';

export function useSidebarState() {
  const [width, setWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WIDTH);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= SIDEBAR_MIN_WIDTH && parsed <= SIDEBAR_MAX_WIDTH) {
          return parsed;
        }
      }
    } catch {}
    return SIDEBAR_DEFAULT_WIDTH;
  });

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_COLLAPSED) === 'true';
    } catch {
      return false;
    }
  });

  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const updateWidth = useCallback((newWidth: number) => {
    if (newWidth < SIDEBAR_MIN_WIDTH) {
      setIsCollapsed(true);
      try {
        localStorage.setItem(STORAGE_KEY_COLLAPSED, 'true');
      } catch {}
    } else {
      const clamped = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, newWidth));
      setWidth(clamped);
      setIsCollapsed(false);
      try {
        localStorage.setItem(STORAGE_KEY_WIDTH, String(clamped));
        localStorage.setItem(STORAGE_KEY_COLLAPSED, 'false');
      } catch {}
    }
  }, []);

  const resetWidth = useCallback(() => {
    setWidth(SIDEBAR_DEFAULT_WIDTH);
    setIsCollapsed(false);
    try {
      localStorage.setItem(STORAGE_KEY_WIDTH, String(SIDEBAR_DEFAULT_WIDTH));
      localStorage.setItem(STORAGE_KEY_COLLAPSED, 'false');
    } catch {}
  }, []);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_COLLAPSED, String(next));
      } catch {}
      return next;
    });
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (isCollapsed) return;
      if (width - 16 < SIDEBAR_MIN_WIDTH) {
        setIsCollapsed(true);
        try {
          localStorage.setItem(STORAGE_KEY_COLLAPSED, 'true');
        } catch {}
      } else {
        updateWidth(width - 16);
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (isCollapsed) {
        setIsCollapsed(false);
        try {
          localStorage.setItem(STORAGE_KEY_COLLAPSED, 'false');
        } catch {}
      } else {
        updateWidth(width + 16);
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleCollapse();
    } else if (e.key === 'Home') {
      e.preventDefault();
      updateWidth(SIDEBAR_MIN_WIDTH);
    } else if (e.key === 'End') {
      e.preventDefault();
      updateWidth(SIDEBAR_MAX_WIDTH);
    }
  }, [width, isCollapsed, updateWidth, toggleCollapse]);

  return {
    width: isCollapsed ? SIDEBAR_RAIL_WIDTH : width,
    rawWidth: width,
    isCollapsed,
    isDragging,
    setIsDragging,
    isMobileDrawerOpen,
    setIsMobileDrawerOpen,
    updateWidth,
    resetWidth,
    toggleCollapse,
    handleKeyDown,
  };
}
