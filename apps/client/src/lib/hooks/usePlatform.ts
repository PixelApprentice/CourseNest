import { useMemo } from 'react';
import { detectPlatform, type Platform } from '../platform';

export function usePlatform(): Platform {
  return useMemo(() => detectPlatform(), []);
}
