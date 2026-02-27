export interface Task {
  _id?: string;
  title: string;
  description?: string;
  time: string;
  category: 'Work' | 'Health' | 'Food' | 'Personal';
  status: 'pending' | 'done' | 'attempted' | 'missed' | 'snoozed' | 'rescheduled';
  reminderEnabled: boolean;
  createdAt: string;
  completedAt?: string;
  snoozedUntil?: string;
  notificationId?: string;
  ringtone?: string;
  voiceReadingEnabled?: boolean;
}

// Status configuration for display
export const STATUS_CONFIG = {
  pending: {
    color: '#F59E0B', // Amber
    icon: 'time-outline',
    label: 'Pending',
  },
  done: {
    color: '#10B981', // Green
    icon: 'checkmark-circle',
    label: 'Done',
  },
  attempted: {
    color: '#3B82F6', // Blue
    icon: 'checkmark-done',
    label: 'Attempted',
  },
  missed: {
    color: '#EF4444', // Red
    icon: 'close-circle',
    label: 'Missed',
  },
  snoozed: {
    color: '#8B5CF6', // Purple
    icon: 'alarm',
    label: 'Snoozed',
  },
  rescheduled: {
    color: '#06B6D4', // Cyan
    icon: 'calendar-outline',
    label: 'Rescheduled',
  },
} as const;

export type TaskStatus = keyof typeof STATUS_CONFIG;

export interface FoodPlan {
  _id?: string;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner';
  items: string[];
  eaten: boolean;
  skipped: boolean;
  createdAt: string;
}

export interface UserPreferences {
  _id?: string;
  darkMode: boolean;
  notificationFrequency: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  voiceReadingEnabled?: boolean;
  lastActivity?: string;
}

export interface UserStats {
  _id?: string;
  currentStreak: number;
  longestStreak: number;
  totalTasksCompleted: number;
  completionRates: { [date: string]: number };
  lastUpdated: string;
}

export interface DailyStats {
  date: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
}

// Category colors and icons
export const CATEGORY_CONFIG = {
  Work: {
    color: '#8B5CF6', // Purple
    icon: 'briefcase',
    label: 'Work',
  },
  Health: {
    color: '#10B981', // Green
    icon: 'fitness',
    label: 'Health',
  },
  Food: {
    color: '#F97316', // Orange
    icon: 'restaurant',
    label: 'Food',
  },
  Personal: {
    color: '#3B82F6', // Blue
    icon: 'person',
    label: 'Personal',
  },
} as const;

export type CategoryType = keyof typeof CATEGORY_CONFIG;
