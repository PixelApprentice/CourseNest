import type { UserId } from '../types/branded.js';
import type { UserRole } from '../enums/index.js';

export interface User {
  readonly id: UserId;
  email?: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
  isLocal: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface LocalProfile {
  userId: UserId;
  displayName: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  playbackSpeed: number;
  autoplayNext: boolean;
  notificationsEnabled: boolean;
}
