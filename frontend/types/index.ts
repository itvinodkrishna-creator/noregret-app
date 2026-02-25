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
