import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task, FoodPlan, UserPreferences, UserStats, TodoItem } from '../types';
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
  todoItems: TodoItem[]; // To-Do List items
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
  
  // To-Do List actions
  addTodoItem: (title: string, time?: string) => void;
  toggleTodoItem: (id: string) => void;
  deleteTodoItem: (id: string) => void;
  updateTodoItem: (id: string, updates: Partial<TodoItem>) => void;
  reorderTodoItems: (items: TodoItem[]) => void;
  getWaitingTodos: () => TodoItem[];
  getDoneTodos: () => TodoItem[];
  addTodoComment: (todoId: string, text: string) => void;
  deleteTodoComment: (todoId: string, commentId: string) => void;
  
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
  getAttemptedTasks: () => Task[];
  getRescheduledTasks: () => Task[];
  getMissedTasks: () => Task[];
  getTasksByStatus: (status: string) => Task[];
  markTaskAlarmTriggered: (taskId: string) => Promise<void>;
  getCompletionRate: (date?: string) => number;
  getTasksByCategory: (category: string) => Task[];
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      tasks: [],
      foodPlans: [],
      todoItems: [], // To-Do List items
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
          status: 'rescheduled',
          snoozedUntil: undefined 
        });
        set(state => ({
          tasks: state.tasks.map(task => 
            task._id === taskId ? { ...task, time: newTime.toISOString(), status: 'rescheduled', snoozedUntil: undefined } : task
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
        
        const completedToday = todayTasks.filter(task => task.status === 'done').length;
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
        const totalTasksCompleted = tasks.filter(t => t.status === 'done' || t.status === 'attempted').length;
        
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
          task.status === 'done'
        ).sort((a, b) => new Date(b.completedAt || b.time).getTime() - new Date(a.completedAt || a.time).getTime());
      },
      
      getAttemptedTasks: () => {
        return get().tasks.filter(task => 
          task.status === 'attempted'
        ).sort((a, b) => new Date(b.completedAt || b.time).getTime() - new Date(a.completedAt || a.time).getTime());
      },
      
      getRescheduledTasks: () => {
        return get().tasks.filter(task => 
          task.status === 'rescheduled'
        ).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
      },
      
      getMissedTasks: () => {
        return get().tasks.filter(task => 
          task.status === 'missed'
        ).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      },
      
      markTaskAlarmTriggered: async (taskId) => {
        await storage.updateTask(taskId, { alarmTriggered: true });
        set(state => ({
          tasks: state.tasks.map(task => 
            task._id === taskId ? { ...task, alarmTriggered: true } : task
          )
        }));
      },
      
      getTasksByStatus: (status: string) => {
        switch(status) {
          case 'pending':
            return get().getPendingTasks();
          case 'completed':
            return get().getCompletedTasks();
          case 'attempted':
            return get().getAttemptedTasks();
          case 'rescheduled':
            return get().getRescheduledTasks();
          case 'missed':
            return get().getMissedTasks();
          default:
            return get().tasks;
        }
      },
      
      getTasksByCategory: (category: string) => {
        return get().tasks.filter(task => task.category === category);
      },
      
      // To-Do List actions
      addTodoItem: (title: string, time?: string) => {
        const newItem: TodoItem = {
          _id: `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title,
          time,
          completed: false,
          createdAt: new Date().toISOString(),
          order: get().todoItems.length,
          comments: [], // Initialize with empty comments
        };
        set({ todoItems: [...get().todoItems, newItem] });
      },
      
      toggleTodoItem: (id: string) => {
        set({
          todoItems: get().todoItems.map(item =>
            item._id === id
              ? {
                  ...item,
                  completed: !item.completed,
                  completedAt: !item.completed ? new Date().toISOString() : undefined,
                }
              : item
          ),
        });
      },
      
      deleteTodoItem: (id: string) => {
        set({ todoItems: get().todoItems.filter(item => item._id !== id) });
      },
      
      updateTodoItem: (id: string, updates: Partial<TodoItem>) => {
        set({
          todoItems: get().todoItems.map(item =>
            item._id === id ? { ...item, ...updates } : item
          ),
        });
      },
      
      reorderTodoItems: (items: TodoItem[]) => {
        set({ todoItems: items });
      },
      
      getWaitingTodos: () => {
        return get().todoItems
          .filter(item => !item.completed)
          .sort((a, b) => a.order - b.order);
      },
      
      getDoneTodos: () => {
        return get().todoItems
          .filter(item => item.completed)
          .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
      },
      
      addTodoComment: (todoId: string, text: string) => {
        const newComment = {
          _id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          text,
          createdAt: new Date().toISOString(),
        };
        set({
          todoItems: get().todoItems.map(item =>
            item._id === todoId
              ? { ...item, comments: [...(item.comments || []), newComment] }
              : item
          ),
        });
      },
      
      deleteTodoComment: (todoId: string, commentId: string) => {
        set({
          todoItems: get().todoItems.map(item =>
            item._id === todoId
              ? { ...item, comments: (item.comments || []).filter(c => c._id !== commentId) }
              : item
          ),
        });
      },
    }),
    {
      name: 'noregret-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        tasks: state.tasks,
        foodPlans: state.foodPlans,
        todoItems: state.todoItems,
        preferences: state.preferences,
        stats: state.stats,
        draftTask: state.draftTask,
      }),
    }
  )
);
