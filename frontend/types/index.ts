export interface Task {
  _id?: string;
  title: string;
  description?: string;
  time: string;
  category: 'Work' | 'Health' | 'Food' | 'Personal';
  status: 'pending' | 'completed' | 'snoozed';
  reminderEnabled: boolean;
  createdAt: string;
  completedAt?: string;
  snoozedUntil?: string;
  notificationId?: string;
  ringtone?: string;
  voiceReadingEnabled?: boolean;
}

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
