import { create } from 'zustand';
import { Task, FoodPlan, UserPreferences, UserStats } from '../types';
import * as storage from '../utils/storage';
import { format, parseISO, differenceInDays } from 'date-fns';

// Draft task interface for auto-save
interface DraftTask {
  title: string;
  description: string;
  category: string;
  date: string;
  time: string;
  reminderEnabled: boolean;
  ringtone: string;
  voiceReadingEnabled: boolean;
  lastUpdated: string;
}

interface AppState {
  tasks: Task[];
  foodPlans: FoodPlan[];
  preferences: UserPreferences;
  stats: UserStats;
  loading: boolean;
  draftTask: DraftTask | null;
  
  // Actions
  loadData: () => Promise<void>;
  
  // Task actions
  addTask: (task: Omit<Task, '_id' | 'createdAt'>) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  markTaskAsDone: (taskId: string) => Promise<void>;
  markTaskAsAttempted: (taskId: string) => Promise<void>;
  markTaskAsMissed: (taskId: string) => Promise<void>;
  rescheduleTask: (taskId: string, newTime: Date) => Promise<void>;
  snoozeTask: (taskId: string, minutes: number) => Promise<void>;
  checkMissedTasks: () => Promise<void>;
  
  // Draft actions
  saveDraft: (draft: DraftTask) => void;
  clearDraft: () => void;
  restoreDraft: () => DraftTask | null;
  
  // Food plan actions
  addFoodPlan: (foodPlan: Omit<FoodPlan, '_id' | 'createdAt'>) => Promise<void>;
  updateFoodPlan: (foodPlanId: string, updates: Partial<FoodPlan>) => Promise<void>;
  
  // Preferences actions
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  
  // Stats actions
  updateStats: () => Promise<void>;
  
  // Helper functions
  getTodayTasks: () => Task[];
  getUpcomingTasks: () => Task[];
  getPendingTasks: () => Task[];
  getCompletedTasks: () => Task[];
  getCompletionRate: (date?: string) => number;
  getTasksByCategory: (category: string) => Task[];
}

export const useAppStore = create<AppState>()((set, get) => ({
      tasks: [],
      foodPlans: [],
      preferences: { 
        darkMode: true, 
        notificationFrequency: 5,
        soundEnabled: true,
        vibrationEnabled: true,
        voiceReadingEnabled: false,
      },
      stats: {
        currentStreak: 0,
        longestStreak: 0,
        totalTasksCompleted: 0,
        completionRates: {},
        lastUpdated: new Date().toISOString(),
      },
      loading: false,
      draftTask: null,
      
      loadData: async () => {
        set({ loading: true });
        try {
          const [tasks, foodPlans, preferences, stats] = await Promise.all([
            storage.getTasks(),
            storage.getFoodPlans(),
            storage.getPreferences(),
            storage.getStats(),
          ]);
          set({ 
            tasks, 
            foodPlans, 
            preferences: {
              ...{ darkMode: true, notificationFrequency: 5, soundEnabled: true, vibrationEnabled: true, voiceReadingEnabled: false },
              ...preferences,
            }, 
            stats, 
            loading: false 
          });
        } catch (error) {
          console.error('Error loading data:', error);
          set({ loading: false });
        }
      },
      
      addTask: async (taskData) => {
        const newTask: Task = {
          ...taskData,
          _id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          status: 'pending',
        };
        
        await storage.addTask(newTask);
        set(state => ({ tasks: [...state.tasks, newTask], draftTask: null }));
      },
      
      updateTask: async (taskId, updates) => {
        await storage.updateTask(taskId, updates);
        set(state => ({
          tasks: state.tasks.map(task => 
            task._id === taskId ? { ...task, ...updates } : task
          )
        }));
      },
      
      deleteTask: async (taskId) => {
        await storage.deleteTask(taskId);
        set(state => ({ tasks: state.tasks.filter(task => task._id !== taskId) }));
      },
      
      completeTask: async (taskId) => {
        const completedAt = new Date().toISOString();
        await storage.updateTask(taskId, { status: 'done', completedAt });
        set(state => ({
          tasks: state.tasks.map(task => 
            task._id === taskId ? { ...task, status: 'done', completedAt } : task
          )
        }));
        
        // Update stats after completing a task
        await get().updateStats();
      },
      
      markTaskAsDone: async (taskId) => {
        const completedAt = new Date().toISOString();
        await storage.updateTask(taskId, { status: 'done', completedAt });
        set(state => ({
          tasks: state.tasks.map(task => 
            task._id === taskId ? { ...task, status: 'done', completedAt } : task
          )
        }));
        await get().updateStats();
      },
      
      markTaskAsAttempted: async (taskId) => {
        const completedAt = new Date().toISOString();
        await storage.updateTask(taskId, { status: 'attempted', completedAt });
        set(state => ({
          tasks: state.tasks.map(task => 
            task._id === taskId ? { ...task, status: 'attempted', completedAt } : task
          )
        }));
        await get().updateStats();
      },
      
      markTaskAsMissed: async (taskId) => {
        await storage.updateTask(taskId, { status: 'missed' });
        set(state => ({
          tasks: state.tasks.map(task => 
            task._id === taskId ? { ...task, status: 'missed' } : task
          )
        }));
      },
      
      rescheduleTask: async (taskId, newTime) => {
        await storage.updateTask(taskId, { 
          time: newTime.toISOString(), 
          status: 'pending',
          snoozedUntil: undefined 
        });
        set(state => ({
          tasks: state.tasks.map(task => 
            task._id === taskId ? { ...task, time: newTime.toISOString(), status: 'pending', snoozedUntil: undefined } : task
          )
        }));
      },
      
      snoozeTask: async (taskId, minutes) => {
        const snoozedUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
        await storage.updateTask(taskId, { status: 'snoozed', snoozedUntil });
        set(state => ({
          tasks: state.tasks.map(task => 
            task._id === taskId ? { ...task, status: 'snoozed', snoozedUntil } : task
          )
        }));
      },
      
      checkMissedTasks: async () => {
        const now = new Date();
        const { tasks } = get();
        
        // Find pending tasks that are past their time (with 5 minute grace period)
        const missedTasks = tasks.filter(task => {
          if (task.status !== 'pending') return false;
          const taskTime = new Date(task.time);
          const gracePeriod = 5 * 60 * 1000; // 5 minutes
          return now.getTime() > taskTime.getTime() + gracePeriod;
        });
        
        // Mark them as missed
        for (const task of missedTasks) {
          if (task._id) {
            await get().markTaskAsMissed(task._id);
          }
        }
      },
      
      // Draft management
      saveDraft: (draft) => {
        set({ draftTask: { ...draft, lastUpdated: new Date().toISOString() } });
        console.log('📝 Draft saved');
      },
      
      clearDraft: () => {
        set({ draftTask: null });
        console.log('🗑️ Draft cleared');
      },
      
      restoreDraft: () => {
        return get().draftTask;
      },
      
      addFoodPlan: async (foodPlanData) => {
        const newFoodPlan: FoodPlan = {
          ...foodPlanData,
          _id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          eaten: false,
          skipped: false,
        };
        
        await storage.addFoodPlan(newFoodPlan);
        set(state => ({ foodPlans: [...state.foodPlans, newFoodPlan] }));
      },
      
      updateFoodPlan: async (foodPlanId, updates) => {
        await storage.updateFoodPlan(foodPlanId, updates);
        set(state => ({
          foodPlans: state.foodPlans.map(fp => 
            fp._id === foodPlanId ? { ...fp, ...updates } : fp
          )
        }));
      },
      
      updatePreferences: async (updates) => {
        const newPreferences = { ...get().preferences, ...updates };
        await storage.savePreferences(newPreferences);
        set({ preferences: newPreferences });
      },
      
      updateStats: async () => {
        const { tasks, stats } = get();
        const today = format(new Date(), 'yyyy-MM-dd');
        
        // Calculate today's completion rate
        const todayTasks = tasks.filter(task => {
          const taskDate = format(parseISO(task.time), 'yyyy-MM-dd');
          return taskDate === today;
        });
        
        const completedToday = todayTasks.filter(task => task.status === 'completed').length;
        const completionRate = todayTasks.length > 0 ? completedToday / todayTasks.length : 0;
        
        // Update completion rates
        const completionRates = { ...stats.completionRates, [today]: completionRate };
        
        // Calculate streak
        let currentStreak = 0;
        const sortedDates = Object.keys(completionRates).sort().reverse();
        
        for (const date of sortedDates) {
          if (completionRates[date] > 0) {
            const daysDiff = differenceInDays(new Date(), parseISO(date));
            if (daysDiff === currentStreak) {
              currentStreak++;
            } else {
              break;
            }
          }
        }
        
        const longestStreak = Math.max(currentStreak, stats.longestStreak);
        const totalTasksCompleted = tasks.filter(t => t.status === 'completed').length;
        
        const newStats: UserStats = {
          ...stats,
          currentStreak,
          longestStreak,
          totalTasksCompleted,
          completionRates,
          lastUpdated: new Date().toISOString(),
        };
        
        await storage.saveStats(newStats);
        set({ stats: newStats });
      },
      
      getTodayTasks: () => {
        const today = format(new Date(), 'yyyy-MM-dd');
        return get().tasks.filter(task => {
          const taskDate = format(parseISO(task.time), 'yyyy-MM-dd');
          return taskDate === today;
        }).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
      },
      
      getUpcomingTasks: () => {
        const tomorrow = format(new Date(Date.now() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
        return get().tasks.filter(task => {
          const taskDate = format(parseISO(task.time), 'yyyy-MM-dd');
          return taskDate >= tomorrow && task.status === 'pending';
        }).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
      },
      
      getCompletionRate: (date?: string) => {
        const targetDate = date || format(new Date(), 'yyyy-MM-dd');
        const { tasks } = get();
        
        const dateTasks = tasks.filter(task => {
          const taskDate = format(parseISO(task.time), 'yyyy-MM-dd');
          return taskDate === targetDate;
        });
        
        if (dateTasks.length === 0) return 0;
        
        const completed = dateTasks.filter(task => task.status === 'done' || task.status === 'attempted').length;
        return (completed / dateTasks.length) * 100;
      },
      
      getPendingTasks: () => {
        return get().tasks.filter(task => 
          task.status === 'pending' || task.status === 'snoozed'
        ).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
      },
      
      getCompletedTasks: () => {
        return get().tasks.filter(task => 
          task.status === 'done' || task.status === 'attempted' || task.status === 'missed'
        ).sort((a, b) => new Date(b.completedAt || b.time).getTime() - new Date(a.completedAt || a.time).getTime());
      },
      
      getTasksByCategory: (category: string) => {
        return get().tasks.filter(task => task.category === category);
      },
    }));
