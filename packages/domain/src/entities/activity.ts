import type { ActivityId } from '../types/branded.js';
import type { QuestionType } from '../enums/index.js';

export type ActivityType = 'quiz' | 'assignment' | 'coding_exercise' | 'reading_ack' | 'practical' | 'instructor_reviewed';

export interface Activity {
  readonly id: ActivityId;
  type: ActivityType;
  title: string;
  description?: string;
  maxAttempts?: number;
  passingScore?: number;
  timeLimitMinutes?: number;
  isRequired: boolean;
  questions?: Question[];
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options?: QuestionOption[];
  correctAnswer?: string | string[];
  points: number;
  explanation?: string;
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}
