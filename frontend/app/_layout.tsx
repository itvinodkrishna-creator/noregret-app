import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { useAppStore } from '../store/useAppStore';
import { AlarmModal } from '../components/AlarmModal';
import { setupNotificationListeners, playAlarmSound, stopAlarmSound } from '../utils/notifications';

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

function TabLayout() {
  const { theme } = useTheme();
  const [initializing, setInitializing] = useState(false);
  const [showAlarm, setShowAlarm] = useState(false);
  const [alarmTask, setAlarmTask] = useState<{ id: string; title: string; description?: string } | null>(null);
  const { tasks, completeTask, updateTask } = useAppStore();

  useEffect(() => {
    setInitializing(false);
    
    // Set up alarm notification listeners that automatically show alarm
    const unsubscribe = setupNotificationListeners((taskId: string, title: string, soundUrl?: string) => {
      console.log('🚨 ALARM TRIGGERED - Showing full screen alarm');
      const task = tasks.find(t => t._id === taskId);
      
      // Set alarm data - this will make modal visible
      setAlarmTask({
        id: taskId,
        title,
        description: task?.description,
      });
      setShowAlarm(true); // Show modal and keep it visible
      
      console.log('✅ Alarm modal state set to TRUE - should stay visible');
    });
    
    return unsubscribe;
  }, [tasks]);

  // Log when showAlarm changes
  useEffect(() => {
    console.log(`📊 Alarm modal visibility: ${showAlarm ? 'VISIBLE' : 'HIDDEN'}`);
  }, [showAlarm]);

  const handleDismissAlarm = async () => {
    console.log('🛑 STOP pressed - Dismissing alarm');
    await stopAlarmSound();
    setShowAlarm(false);
    if (alarmTask) {
      await completeTask(alarmTask.id);
    }
    setAlarmTask(null);
  };

  const handleSnoozeAlarm = async (minutes: number) => {
    console.log(`⏰ SNOOZE pressed - ${minutes} minutes`);
    await stopAlarmSound();
    setShowAlarm(false);
    if (alarmTask) {
      const task = tasks.find(t => t._id === alarmTask.id);
      if (task) {
        const snoozeTime = new Date(Date.now() + minutes * 60 * 1000);
        
        // Cancel old notification
        if (task.notificationId) {
          await cancelNotification(task.notificationId);
        }
        
        // Schedule new notification
        const { scheduleTaskNotification } = await import('../utils/notifications');
        const notificationId = await scheduleTaskNotification(
          alarmTask.id,
          task.title,
          snoozeTime,
          task.ringtone || 'default'
        );
        
        // Update task
        await updateTask(alarmTask.id, {
          status: 'snoozed',
          snoozedUntil: snoozeTime.toISOString(),
          notificationId,
        });
        
        console.log(`✅ Alarm snoozed for ${minutes} minutes`);
      }
    }
    setAlarmTask(null);
  };

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

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
    
    {/* Full-Screen Alarm Modal */}
    <AlarmModal
      visible={showAlarm}
      taskTitle={alarmTask?.title || ''}
      taskDescription={alarmTask?.description}
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
