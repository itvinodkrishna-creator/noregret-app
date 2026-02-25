import { Platform } from 'react-native';
import { Task, FoodPlan, UserPreferences, UserStats } from '../types';

// Web-compatible storage implementation
const createWebStorage = () => {
  if (typeof window === 'undefined') {
    // Server-side rendering fallback
    return {
      getItem: async () => null,
      setItem: async () => {},
      removeItem: async () => {},
      multiRemove: async () => {},
    };
  }

  return {
    getItem: async (key: string): Promise<string | null> => {
      try {
        return window.localStorage.getItem(key);
      } catch (error) {
        console.warn('localStorage getItem error:', error);
        return null;
      }
    },
    setItem: async (key: string, value: string): Promise<void> => {
      try {
        window.localStorage.setItem(key, value);
      } catch (error) {
        console.warn('localStorage setItem error:', error);
      }
    },
    removeItem: async (key: string): Promise<void> => {
      try {
        window.localStorage.removeItem(key);
      } catch (error) {
        console.warn('localStorage removeItem error:', error);
      }
    },
    multiRemove: async (keys: string[]): Promise<void> => {
      try {
        keys.forEach(key => window.localStorage.removeItem(key));
      } catch (error) {
        console.warn('localStorage multiRemove error:', error);
      }
    },
  };
};

// Dynamically import AsyncStorage only for native platforms
const getStorage = async () => {
  if (Platform.OS === 'web') {
    return createWebStorage();
  }
  
  try {
    const AsyncStorage = await import('@react-native-async-storage/async-storage');
    return AsyncStorage.default;
  } catch (error) {
    console.warn('AsyncStorage import failed, falling back to web storage:', error);
    return createWebStorage();
  }
};

const KEYS = {
  TASKS: '@lifetracker:tasks',
  FOOD_PLANS: '@lifetracker:food_plans',
  PREFERENCES: '@lifetracker:preferences',
  STATS: '@lifetracker:stats',
};

// Initialize storage on first use
let storageInstance: any = null;

const getStorageInstance = async () => {
  if (!storageInstance) {
    storageInstance = await getStorage();
  }
  return storageInstance;
};

// Task Storage
export const getTasks = async (): Promise<Task[]> => {
  try {
    const storage = await getStorageInstance();
    const data = await storage.getItem(KEYS.TASKS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting tasks:', error);
    return [];
  }
};

export const saveTasks = async (tasks: Task[]): Promise<void> => {
  try {
    const storage = await getStorageInstance();
    await storage.setItem(KEYS.TASKS, JSON.stringify(tasks));
  } catch (error) {
    console.error('Error saving tasks:', error);
  }
};

export const addTask = async (task: Task): Promise<void> => {
  const tasks = await getTasks();
  tasks.push(task);
  await saveTasks(tasks);
};

export const updateTask = async (taskId: string, updates: Partial<Task>): Promise<void> => {
  const tasks = await getTasks();
  const index = tasks.findIndex(t => t._id === taskId);
  if (index !== -1) {
    tasks[index] = { ...tasks[index], ...updates };
    await saveTasks(tasks);
  }
};

export const deleteTask = async (taskId: string): Promise<void> => {
  const tasks = await getTasks();
  const filtered = tasks.filter(t => t._id !== taskId);
  await saveTasks(filtered);
};

// Food Plan Storage
export const getFoodPlans = async (): Promise<FoodPlan[]> => {
  try {
    const storage = await getStorageInstance();
    const data = await storage.getItem(KEYS.FOOD_PLANS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting food plans:', error);
    return [];
  }
};

export const saveFoodPlans = async (foodPlans: FoodPlan[]): Promise<void> => {
  try {
    const storage = await getStorageInstance();
    await storage.setItem(KEYS.FOOD_PLANS, JSON.stringify(foodPlans));
  } catch (error) {
    console.error('Error saving food plans:', error);
  }
};

export const addFoodPlan = async (foodPlan: FoodPlan): Promise<void> => {
  const foodPlans = await getFoodPlans();
  foodPlans.push(foodPlan);
  await saveFoodPlans(foodPlans);
};

export const updateFoodPlan = async (foodPlanId: string, updates: Partial<FoodPlan>): Promise<void> => {
  const foodPlans = await getFoodPlans();
  const index = foodPlans.findIndex(fp => fp._id === foodPlanId);
  if (index !== -1) {
    foodPlans[index] = { ...foodPlans[index], ...updates };
    await saveFoodPlans(foodPlans);
  }
};

// Preferences Storage
export const getPreferences = async (): Promise<UserPreferences> => {
  try {
    const storage = await getStorageInstance();
    const data = await storage.getItem(KEYS.PREFERENCES);
    return data ? JSON.parse(data) : { darkMode: true, notificationFrequency: 5 };
  } catch (error) {
    console.error('Error getting preferences:', error);
    return { darkMode: true, notificationFrequency: 5 };
  }
};

export const savePreferences = async (preferences: UserPreferences): Promise<void> => {
  try {
    const storage = await getStorageInstance();
    await storage.setItem(KEYS.PREFERENCES, JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving preferences:', error);
  }
};

// Stats Storage
export const getStats = async (): Promise<UserStats> => {
  try {
    const storage = await getStorageInstance();
    const data = await storage.getItem(KEYS.STATS);
    return data ? JSON.parse(data) : {
      currentStreak: 0,
      longestStreak: 0,
      totalTasksCompleted: 0,
      completionRates: {},
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error getting stats:', error);
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalTasksCompleted: 0,
      completionRates: {},
      lastUpdated: new Date().toISOString(),
    };
  }
};

export const saveStats = async (stats: UserStats): Promise<void> => {
  try {
    const storage = await getStorageInstance();
    await storage.setItem(KEYS.STATS, JSON.stringify(stats));
  } catch (error) {
    console.error('Error saving stats:', error);
  }
};

// Clear all data
export const clearAllData = async (): Promise<void> => {
  try {
    const storage = await getStorageInstance();
    await storage.multiRemove([KEYS.TASKS, KEYS.FOOD_PLANS, KEYS.PREFERENCES, KEYS.STATS]);
  } catch (error) {
    console.error('Error clearing data:', error);
  }
};
