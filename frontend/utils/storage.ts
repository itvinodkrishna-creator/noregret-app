import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task, FoodPlan, UserPreferences, UserStats } from '../types';

const KEYS = {
  TASKS: '@lifetracker:tasks',
  FOOD_PLANS: '@lifetracker:food_plans',
  PREFERENCES: '@lifetracker:preferences',
  STATS: '@lifetracker:stats',
};

// Task Storage
export const getTasks = async (): Promise<Task[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.TASKS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting tasks:', error);
    return [];
  }
};

export const saveTasks = async (tasks: Task[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
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
    const data = await AsyncStorage.getItem(KEYS.FOOD_PLANS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting food plans:', error);
    return [];
  }
};

export const saveFoodPlans = async (foodPlans: FoodPlan[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.FOOD_PLANS, JSON.stringify(foodPlans));
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
    const data = await AsyncStorage.getItem(KEYS.PREFERENCES);
    return data ? JSON.parse(data) : { darkMode: true, notificationFrequency: 5 };
  } catch (error) {
    console.error('Error getting preferences:', error);
    return { darkMode: true, notificationFrequency: 5 };
  }
};

export const savePreferences = async (preferences: UserPreferences): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.PREFERENCES, JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving preferences:', error);
  }
};

// Stats Storage
export const getStats = async (): Promise<UserStats> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.STATS);
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
    await AsyncStorage.setItem(KEYS.STATS, JSON.stringify(stats));
  } catch (error) {
    console.error('Error saving stats:', error);
  }
};

// Clear all data
export const clearAllData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([KEYS.TASKS, KEYS.FOOD_PLANS, KEYS.PREFERENCES, KEYS.STATS]);
  } catch (error) {
    console.error('Error clearing data:', error);
  }
};
