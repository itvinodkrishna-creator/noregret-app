import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { useAppStore } from '../store/useAppStore';
import { AlarmModal } from '../components/AlarmModal';
import { 
  setAlarmTriggerCallback, 
  snoozeAlarm as snoozeAlarmScheduler,
  cancelAlarmsForTask 
} from '../utils/alarmScheduler';
import { 
  playAlarmSound, 
  stopAlarmSound,
  setupNotificationCategories,
  registerForPushNotificationsAsync,
} from '../utils/notifications';

const HomeIcon = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="home" size={size} color={color} />
);

const TasksIcon = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="checkmark-circle" size={size} color={color} />
);

const FoodIcon = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="restaurant" size={size} color={color} />
);

const StatsIcon = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="bar-chart" size={size} color={color} />
);

// Alarm state interface
interface AlarmState {
  visible: boolean;
  taskId: string;
  title: string;
  description?: string;
  soundUrl: string;
}

function TabLayout() {
  const { theme } = useTheme();
  const { tasks, completeTask, updateTask } = useAppStore();
  
  // Use useRef to keep alarm state stable across re-renders
  const [alarmState, setAlarmState] = useState<AlarmState | null>(null);
  const alarmStateRef = useRef<AlarmState | null>(null);
  
  // Track if we've set up the callback
  const callbackSetRef = useRef(false);

  // Setup alarm trigger callback ONCE on mount
  useEffect(() => {
    if (callbackSetRef.current) return;
    callbackSetRef.current = true;
    
    console.log('🔔 Setting up alarm system...');
    
    // Request notification permissions (for native)
    registerForPushNotificationsAsync();
    setupNotificationCategories();
    
    // Set the callback that will be called when an alarm triggers
    setAlarmTriggerCallback((alarm) => {
      console.log('🚨🚨🚨 ALARM CALLBACK TRIGGERED! 🚨🚨🚨');
      console.log(`   Task: ${alarm.title}`);
      console.log(`   ID: ${alarm.taskId}`);
      
      const newState: AlarmState = {
        visible: true,
        taskId: alarm.taskId,
        title: alarm.title,
        description: alarm.description,
        soundUrl: alarm.soundUrl,
      };
      
      // Play alarm sound
      playAlarmSound(alarm.soundUrl);
      
      // Update state to show modal
      alarmStateRef.current = newState;
      setAlarmState(newState);
      
      console.log('✅ Alarm modal should now be VISIBLE');
    });
    
    console.log('✅ Alarm system initialized');
    
    // Cleanup on unmount
    return () => {
      callbackSetRef.current = false;
    };
  }, []);

  // Log alarm state changes
  useEffect(() => {
    console.log(`📊 Alarm state changed: ${alarmState?.visible ? 'VISIBLE' : 'HIDDEN'}`);
  }, [alarmState?.visible]);

  // Handle dismiss (STOP button)
  const handleDismissAlarm = useCallback(async () => {
    console.log('🛑 STOP pressed - Dismissing alarm');
    
    await stopAlarmSound();
    
    const currentAlarm = alarmStateRef.current;
    if (currentAlarm) {
      // Mark task as completed
      await completeTask(currentAlarm.taskId);
      // Cancel any remaining alarms for this task
      cancelAlarmsForTask(currentAlarm.taskId);
    }
    
    alarmStateRef.current = null;
    setAlarmState(null);
    
    console.log('✅ Alarm dismissed, modal hidden');
  }, [completeTask]);

  // Handle snooze
  const handleSnoozeAlarm = useCallback(async (minutes: number) => {
    console.log(`⏰ SNOOZE pressed - ${minutes} minutes`);
    
    await stopAlarmSound();
    
    const currentAlarm = alarmStateRef.current;
    if (currentAlarm) {
      // Schedule a new alarm
      const newAlarmId = snoozeAlarmScheduler(
        currentAlarm.taskId,
        currentAlarm.title,
        minutes,
        currentAlarm.soundUrl,
        currentAlarm.description
      );
      
      // Update task status
      const snoozeTime = new Date(Date.now() + minutes * 60 * 1000);
      await updateTask(currentAlarm.taskId, {
        status: 'snoozed',
        snoozedUntil: snoozeTime.toISOString(),
        notificationId: newAlarmId,
      });
      
      console.log(`✅ Alarm snoozed for ${minutes} minutes`);
    }
    
    alarmStateRef.current = null;
    setAlarmState(null);
    
    console.log('✅ Alarm modal hidden, snooze scheduled');
  }, [updateTask]);

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textSecondary,
          tabBarStyle: {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            tabBarIcon: HomeIcon,
          }}
        />
        <Tabs.Screen
          name="tasks"
          options={{
            title: 'Tasks',
            tabBarIcon: TasksIcon,
          }}
        />
        <Tabs.Screen
          name="food"
          options={{
            title: 'Food',
            tabBarIcon: FoodIcon,
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: 'Stats',
            tabBarIcon: StatsIcon,
          }}
        />
      </Tabs>
      
      {/* Full-Screen Alarm Modal - Always rendered, visibility controlled by state */}
      <AlarmModal
        visible={alarmState?.visible || false}
        taskTitle={alarmState?.title || ''}
        taskDescription={alarmState?.description}
        onDismiss={handleDismissAlarm}
        onSnooze={handleSnoozeAlarm}
      />
    </>
  );
}

export default function Layout() {
  return (
    <ThemeProvider>
      <TabLayout />
    </ThemeProvider>
  );
}
