import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { useAppStore } from '../store/useAppStore';
import { AlarmModal } from '../components/AlarmModal';
import { 
  setAlarmTriggerCallback, 
  snoozeAlarm as snoozeAlarmScheduler,
  cancelAlarmsForTask,
  scheduleAlarm 
} from '../utils/alarmScheduler';
import { 
  playAlarmSound, 
  stopAlarmSound,
  setupNotificationCategories,
  registerForPushNotificationsAsync,
} from '../utils/notifications';
import { initClickSound } from '../utils/sounds';
import { initVoiceReader } from '../utils/voiceReader';

const TabIcon = ({ name, color, size, focused }: { name: string; color: string; size: number; focused: boolean }) => (
  <View style={[styles.tabIconContainer, focused && styles.tabIconFocused]}>
    <Ionicons name={name as any} size={size} color={color} />
  </View>
);

// Alarm state interface
interface AlarmState {
  visible: boolean;
  taskId: string;
  title: string;
  description?: string;
  soundUrl: string;
  voiceReadingEnabled: boolean;
}

function TabLayout() {
  const { theme } = useTheme();
  const { tasks, completeTask, updateTask, loadData, preferences, markTaskAsDone, markTaskAsAttempted, rescheduleTask, checkMissedTasks, markTaskAlarmTriggered } = useAppStore();
  
  // Use useRef to keep alarm state stable across re-renders
  const [alarmState, setAlarmState] = useState<AlarmState | null>(null);
  const alarmStateRef = useRef<AlarmState | null>(null);
  
  // Track if we've set up the callback
  const callbackSetRef = useRef(false);

  // Load data and setup on mount
  useEffect(() => {
    loadData();
    initClickSound();
    initVoiceReader();
  }, []);

  // Setup alarm trigger callback ONCE on mount
  useEffect(() => {
    if (callbackSetRef.current) return;
    callbackSetRef.current = true;
    
    console.log('🔔 Setting up Noregret alarm system...');
    
    // Request notification permissions (for native)
    registerForPushNotificationsAsync();
    setupNotificationCategories();
    
    // Set the callback that will be called when an alarm triggers
    setAlarmTriggerCallback((alarm) => {
      console.log('🚨🚨🚨 ALARM CALLBACK TRIGGERED! 🚨🚨🚨');
      console.log(`   Task: ${alarm.title}`);
      console.log(`   ID: ${alarm.taskId}`);
      
      // Find the task to get voice reading setting and recorded voice
      const task = useAppStore.getState().tasks.find(t => t._id === alarm.taskId);
      const voiceEnabled = task?.voiceReadingEnabled || useAppStore.getState().preferences.voiceReadingEnabled || false;
      const voiceUri = task?.voiceUri; // Recorded voice message
      
      const newState: AlarmState = {
        visible: true,
        taskId: alarm.taskId,
        title: alarm.title,
        description: alarm.description,
        soundUrl: voiceUri || alarm.soundUrl, // Use recorded voice if available, else ringtone
        voiceReadingEnabled: voiceEnabled && !voiceUri, // Disable TTS if we have a recorded voice
      };
      
      // Play alarm sound with the selected ringtone OR the recorded voice
      if (voiceUri) {
        console.log('🎤 Playing recorded voice message:', voiceUri);
        playAlarmSound(voiceUri);
      } else {
        console.log('🔊 Playing ringtone:', alarm.soundUrl);
        playAlarmSound(alarm.soundUrl);
      }
      
      // Mark task as alarm triggered (shows check mark icon)
      useAppStore.getState().markTaskAlarmTriggered(alarm.taskId);
      
      // Update state to show modal
      alarmStateRef.current = newState;
      setAlarmState(newState);
      
      console.log('✅ Alarm modal should now be VISIBLE');
      console.log(`   Voice recording: ${voiceUri ? 'YES' : 'NO'}`);
      console.log(`   Voice reading (TTS): ${voiceEnabled && !voiceUri ? 'ON' : 'OFF'}`);
    });
    
    console.log('✅ Noregret alarm system initialized');
    
    // Cleanup on unmount
    return () => {
      callbackSetRef.current = false;
    };
  }, []);

  // Handle dismiss (STOP button - now goes to completion question)
  const handleDismissAlarm = useCallback(async () => {
    console.log('🛑 Alarm dismissed');
    
    await stopAlarmSound();
    
    const currentAlarm = alarmStateRef.current;
    if (currentAlarm) {
      // Cancel any remaining alarms for this task
      cancelAlarmsForTask(currentAlarm.taskId);
    }
    
    alarmStateRef.current = null;
    setAlarmState(null);
    
    console.log('✅ Alarm modal hidden');
  }, []);

  // Handle mark as done
  const handleMarkDone = useCallback(async () => {
    console.log('✅ Task marked as DONE');
    
    const currentAlarm = alarmStateRef.current;
    if (currentAlarm) {
      await markTaskAsDone(currentAlarm.taskId);
      cancelAlarmsForTask(currentAlarm.taskId);
    }
  }, [markTaskAsDone]);

  // Handle mark as attempted
  const handleMarkAttempted = useCallback(async () => {
    console.log('🔵 Task marked as ATTEMPTED');
    
    const currentAlarm = alarmStateRef.current;
    if (currentAlarm) {
      await markTaskAsAttempted(currentAlarm.taskId);
      cancelAlarmsForTask(currentAlarm.taskId);
    }
  }, [markTaskAsAttempted]);

  // Handle reschedule
  const handleReschedule = useCallback(async (newTime: Date) => {
    console.log('📅 Task rescheduled to:', newTime);
    
    const currentAlarm = alarmStateRef.current;
    if (currentAlarm) {
      cancelAlarmsForTask(currentAlarm.taskId);
      await rescheduleTask(currentAlarm.taskId, newTime);
      
      // Schedule new alarm
      const task = tasks.find(t => t._id === currentAlarm.taskId);
      if (task?.reminderEnabled) {
        scheduleAlarm(
          currentAlarm.taskId,
          currentAlarm.title,
          newTime,
          task.ringtone || 'default'
        );
      }
    }
  }, [rescheduleTask, tasks]);

  // Handle keep pending
  const handleKeepPending = useCallback(async () => {
    console.log('⏳ Task kept in pending');
    
    const currentAlarm = alarmStateRef.current;
    if (currentAlarm) {
      cancelAlarmsForTask(currentAlarm.taskId);
      // Task stays as pending, no status change needed
    }
  }, []);

  // Handle auto-stop (5 minutes without action)
  const handleAutoStop = useCallback(async () => {
    console.log('⏰ Alarm auto-stopped after 5 minutes - marking as MISSED');
    
    await stopAlarmSound();
    
    const currentAlarm = alarmStateRef.current;
    if (currentAlarm) {
      // Mark task as missed since no action was taken
      await updateTask(currentAlarm.taskId, {
        status: 'missed',
      });
      cancelAlarmsForTask(currentAlarm.taskId);
    }
    
    alarmStateRef.current = null;
    setAlarmState(null);
  }, [updateTask]);

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
            height: 70,
            paddingBottom: 16,
            paddingTop: 10,
            marginHorizontal: 0,
            elevation: 0,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
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
            title: 'Home',
            tabBarIcon: ({ color, size, focused }) => (
              <TabIcon name="home" color={color} size={size} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="tasks"
          options={{
            title: 'Tasks',
            tabBarIcon: ({ color, size, focused }) => (
              <TabIcon name="checkmark-circle" color={color} size={size} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: 'Stats',
            tabBarIcon: ({ color, size, focused }) => (
              <TabIcon name="bar-chart" color={color} size={size} focused={focused} />
            ),
          }}
        />
        {/* Hide food and settings from tab bar - accessed via other means */}
        <Tabs.Screen
          name="food"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            href: null,
          }}
        />
      </Tabs>
      
      {/* Full-Screen Alarm Modal */}
      <AlarmModal
        visible={alarmState?.visible || false}
        taskTitle={alarmState?.title || ''}
        taskDescription={alarmState?.description}
        taskId={alarmState?.taskId || ''}
        voiceReadingEnabled={alarmState?.voiceReadingEnabled || false}
        onDismiss={handleDismissAlarm}
        onSnooze={handleSnoozeAlarm}
        onMarkDone={handleMarkDone}
        onMarkAttempted={handleMarkAttempted}
        onReschedule={handleReschedule}
        onKeepPending={handleKeepPending}
        onAutoStop={handleAutoStop}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    padding: 4,
    borderRadius: 12,
  },
  tabIconFocused: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
});

export default function Layout() {
  return (
    <ThemeProvider>
      <TabLayout />
    </ThemeProvider>
  );
}
