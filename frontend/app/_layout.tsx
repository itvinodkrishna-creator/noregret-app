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
  const { tasks, completeTask, snoozeTask: storeSnoozeTask } = useAppStore();

  useEffect(() => {
    // Don't load data on initial mount to avoid blocking
    setInitializing(false);
    
    // Set up alarm notification listeners
    const unsubscribe = setupNotificationListeners((taskId: string, title: string) => {
      const task = tasks.find(t => t._id === taskId);
      setAlarmTask({
        id: taskId,
        title,
        description: task?.description,
      });
      setShowAlarm(true);
      // Start playing alarm sound
      playAlarmSound();
    });
    
    return unsubscribe;
  }, [tasks]);

  const handleDismissAlarm = async () => {
    await stopAlarmSound();
    setShowAlarm(false);
    setAlarmTask(null);
    if (alarmTask) {
      await completeTask(alarmTask.id);
    }
  };

  const handleSnoozeAlarm = async (minutes: number) => {
    await stopAlarmSound();
    setShowAlarm(false);
    if (alarmTask) {
      await storeSnoozeTask(alarmTask.id, minutes);
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
  );
}

export default function Layout() {
  return (
    <ThemeProvider>
      <TabLayout />
    </ThemeProvider>
  );
}
