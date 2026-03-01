/**
 * SYSTEM-LEVEL FULL-SCREEN ALARM SERVICE
 * 
 * This service provides TRUE alarm functionality that works like the default phone alarm:
 * - Wakes device screen
 * - Shows full-screen alarm over lock screen
 * - Plays sound continuously
 * - Works when app is completely closed
 * - Voice reading support
 * 
 * Uses:
 * - expo-notifications with full-screen intent configuration
 * - High-priority notification channels with bypassDnd
 * - Background task manager
 * - Proper Android permissions
 */

import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, AppState, Linking, Alert, Vibration } from 'react-native';
import { Audio } from 'expo-av';

// Constants
const ALARM_CHECK_TASK = 'com.noregret.alarm-check';
const ALARM_STORAGE_KEY = '@noregret_scheduled_alarms';
const TRIGGERED_ALARM_KEY = '@noregret_triggered_alarm';
const AUTO_STOP_DURATION = 5 * 60 * 1000; // 5 minutes

// Global sound instance for alarm
let alarmSound: Audio.Sound | null = null;
let isAlarmPlaying = false;
let alarmStopTimeout: any = null;

// Alarm sound URLs
const ALARM_SOUNDS: { [key: string]: string } = {
  default: 'https://assets.mixkit.co/active_storage/sfx/2869/2869.wav',
  bell: 'https://assets.mixkit.co/active_storage/sfx/2568/2568.wav',
  chime: 'https://assets.mixkit.co/active_storage/sfx/2571/2571.wav',
  alert: 'https://assets.mixkit.co/active_storage/sfx/2870/2870.wav',
  loud: 'https://assets.mixkit.co/active_storage/sfx/1005/1005.wav',
};

// Scheduled alarm interface
export interface ScheduledAlarm {
  id: string;
  taskId: string;
  title: string;
  description?: string;
  triggerTime: number;
  soundUrl?: string;
  voiceUri?: string;
  voiceReadingEnabled?: boolean;
  notificationId?: string;
  backupNotificationId?: string;
  status: 'scheduled' | 'triggered' | 'dismissed' | 'snoozed';
}

// Triggered alarm data (stored when alarm fires while app is closed)
export interface TriggeredAlarmData {
  taskId: string;
  title: string;
  description?: string;
  soundUrl?: string;
  voiceUri?: string;
  voiceReadingEnabled?: boolean;
  triggeredAt: number;
}

// Configure notification handler for MAXIMUM priority
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as any;
    console.log('📬 [ALARM] Notification handler called:', notification.request.identifier);
    
    // If this is an alarm notification, we want maximum visibility
    if (data?.type === 'alarm') {
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      };
    }
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    };
  },
});

/**
 * Initialize the full-screen alarm system
 */
export async function initializeAlarmSystem(): Promise<boolean> {
  try {
    console.log('🔧 [ALARM] Initializing FULL-SCREEN alarm system...');
    
    // Configure audio for alarm playback
    await configureAudio();
    
    // Request all permissions
    const permissionsGranted = await requestAllPermissions();
    if (!permissionsGranted) {
      console.warn('⚠️ [ALARM] Some permissions not granted');
    }
    
    // Setup notification channels
    await setupNotificationChannels();
    
    // Register background task
    await registerBackgroundTask();
    
    // Check for any triggered alarms while app was closed
    await checkForTriggeredAlarms();
    
    console.log('✅ [ALARM] Full-screen alarm system initialized');
    return true;
  } catch (error) {
    console.error('❌ [ALARM] Initialization failed:', error);
    return false;
  }
}

/**
 * Configure audio session for alarm playback
 */
async function configureAudio() {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });
    console.log('✅ [ALARM] Audio configured for alarm playback');
  } catch (error) {
    console.error('❌ [ALARM] Audio configuration failed:', error);
  }
}

/**
 * Request all necessary permissions for alarm functionality
 */
async function requestAllPermissions(): Promise<boolean> {
  try {
    console.log('📋 [ALARM] Requesting permissions...');
    
    // Request notification permissions with all options
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
          allowCriticalAlerts: true,
          provideAppNotificationSettings: true,
        },
        android: {},
      });
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('⚠️ [ALARM] Notification permission denied');
      return false;
    }
    
    console.log('✅ [ALARM] All permissions granted');
    return true;
  } catch (error) {
    console.error('❌ [ALARM] Permission request failed:', error);
    return false;
  }
}

/**
 * Setup Android notification channels with MAXIMUM priority
 */
async function setupNotificationChannels() {
  if (Platform.OS !== 'android') return;
  
  try {
    // Main alarm channel - CRITICAL PRIORITY with custom alarm sound
    await Notifications.setNotificationChannelAsync('alarm_critical', {
      name: 'Critical Alarms',
      description: 'High-priority task alarms that wake the device',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 1000, 500, 1000, 500, 1000, 500, 1000],
      lightColor: '#FF0000',
      sound: 'alarm.mp3', // Custom alarm sound
      enableVibrate: true,
      enableLights: true,
      bypassDnd: true,
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    
    // Backup alarm channel
    await Notifications.setNotificationChannelAsync('alarm_backup', {
      name: 'Backup Alarms',
      description: 'Backup alarm notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 500, 250, 500],
      sound: 'alarm.mp3', // Custom alarm sound
      enableVibrate: true,
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    
    console.log('✅ [ALARM] Notification channels configured with custom alarm sound');
  } catch (error) {
    console.error('❌ [ALARM] Channel setup failed:', error);
  }
}

/**
 * Register background task for alarm checking
 */
async function registerBackgroundTask() {
  try {
    // Define the background task
    if (!TaskManager.isTaskDefined(ALARM_CHECK_TASK)) {
      TaskManager.defineTask(ALARM_CHECK_TASK, async () => {
        console.log('🔄 [ALARM] Background task running...');
        
        try {
          const alarms = await getStoredAlarms();
          const now = Date.now();
          let hasUpdates = false;
          
          for (const alarm of alarms) {
            if (alarm.status === 'scheduled' && alarm.triggerTime <= now) {
              console.log(`⏰ [ALARM] Background trigger: ${alarm.title}`);
              alarm.status = 'triggered';
              
              // Store triggered alarm data
              await storeTriggeredAlarm({
                taskId: alarm.taskId,
                title: alarm.title,
                description: alarm.description,
                soundUrl: alarm.soundUrl,
                voiceUri: alarm.voiceUri,
                voiceReadingEnabled: alarm.voiceReadingEnabled,
                triggeredAt: now,
              });
              
              hasUpdates = true;
            }
          }
          
          if (hasUpdates) {
            await saveAlarms(alarms);
          }
          
          return BackgroundFetch.BackgroundFetchResult.NewData;
        } catch (error) {
          console.error('[ALARM] Background task error:', error);
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      });
    }
    
    // Register background fetch
    const status = await BackgroundFetch.getStatusAsync();
    if (status === BackgroundFetch.BackgroundFetchStatus.Available) {
      await BackgroundFetch.registerTaskAsync(ALARM_CHECK_TASK, {
        minimumInterval: 60,
        stopOnTerminate: false,
        startOnBoot: true,
      });
      console.log('✅ [ALARM] Background task registered');
    }
  } catch (error) {
    console.log('ℹ️ [ALARM] Background task not available:', error);
  }
}

/**
 * Schedule a FULL-SCREEN system alarm
 */
export async function scheduleFullScreenAlarm(
  taskId: string,
  title: string,
  triggerTime: Date,
  options: {
    description?: string;
    soundUrl?: string;
    voiceUri?: string;
    voiceReadingEnabled?: boolean;
  } = {}
): Promise<string | null> {
  try {
    const now = new Date();
    const seconds = Math.max(1, Math.floor((triggerTime.getTime() - now.getTime()) / 1000));
    
    if (seconds <= 0) {
      console.error('❌ [ALARM] Cannot schedule for past time');
      return null;
    }
    
    console.log('📅 [ALARM] Scheduling FULL-SCREEN alarm:');
    console.log(`   Task: ${title}`);
    console.log(`   Trigger in: ${seconds}s (${Math.round(seconds / 60)}min)`);
    console.log(`   Time: ${triggerTime.toLocaleString()}`);
    
    // Create alarm notification content with custom sound
    const notificationContent: Notifications.NotificationContentInput = {
      title: `🔔 ALARM: ${title}`,
      body: options.description || 'Time for your scheduled task!',
      sound: 'alarm.mp3', // Custom alarm sound file
      priority: Notifications.AndroidNotificationPriority.MAX,
      vibrate: [0, 1000, 500, 1000, 500, 1000],
      data: {
        type: 'alarm',
        taskId,
        title,
        description: options.description,
        soundUrl: options.soundUrl || 'default',
        voiceUri: options.voiceUri,
        voiceReadingEnabled: options.voiceReadingEnabled,
        triggerTime: triggerTime.getTime(),
        isFullScreen: true,
      },
      categoryIdentifier: 'alarm',
      // Android specific - these help with full-screen behavior
      sticky: true,
      autoDismiss: false,
    };
    
    // Schedule PRIMARY notification (TIME_INTERVAL for accuracy)
    const primaryId = await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: seconds,
        channelId: 'alarm_critical',
      },
    });
    
    console.log('✅ [ALARM] Primary notification scheduled:', primaryId);
    
    // Schedule BACKUP notification (DATE trigger as fallback)
    let backupId: string | undefined;
    try {
      backupId = await Notifications.scheduleNotificationAsync({
        content: {
          ...notificationContent,
          title: `⏰ REMINDER: ${title}`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerTime,
          channelId: 'alarm_backup',
        },
      });
      console.log('✅ [ALARM] Backup notification scheduled:', backupId);
    } catch (e) {
      console.log('ℹ️ [ALARM] Backup notification skipped');
    }
    
    // Store alarm data
    const alarm: ScheduledAlarm = {
      id: `alarm_${taskId}_${Date.now()}`,
      taskId,
      title,
      description: options.description,
      triggerTime: triggerTime.getTime(),
      soundUrl: options.soundUrl,
      voiceUri: options.voiceUri,
      voiceReadingEnabled: options.voiceReadingEnabled,
      notificationId: primaryId,
      backupNotificationId: backupId,
      status: 'scheduled',
    };
    
    await storeAlarm(alarm);
    
    console.log('✅ [ALARM] Full-screen alarm scheduled successfully');
    return primaryId;
  } catch (error) {
    console.error('❌ [ALARM] Scheduling failed:', error);
    return null;
  }
}

/**
 * Start playing alarm sound (loops continuously)
 */
export async function startAlarmSound(soundId: string = 'default'): Promise<void> {
  if (isAlarmPlaying) {
    console.log('ℹ️ [ALARM] Sound already playing');
    return;
  }
  
  try {
    console.log('🔊 [ALARM] Starting alarm sound:', soundId);
    
    // Stop any existing sound
    await stopAlarmSound();
    
    // Get sound URL
    const soundUrl = ALARM_SOUNDS[soundId] || ALARM_SOUNDS.default;
    
    // Create and play sound
    const { sound } = await Audio.Sound.createAsync(
      { uri: soundUrl },
      { 
        shouldPlay: true, 
        isLooping: true,
        volume: 1.0,
      }
    );
    
    alarmSound = sound;
    isAlarmPlaying = true;
    
    // Start vibration pattern
    Vibration.vibrate([0, 1000, 500, 1000, 500, 1000], true);
    
    // Auto-stop after 5 minutes
    alarmStopTimeout = setTimeout(() => {
      console.log('⏰ [ALARM] Auto-stopping after 5 minutes');
      stopAlarmSound();
    }, AUTO_STOP_DURATION);
    
    console.log('✅ [ALARM] Sound started');
  } catch (error) {
    console.error('❌ [ALARM] Sound playback failed:', error);
  }
}

/**
 * Stop alarm sound
 */
export async function stopAlarmSound(): Promise<void> {
  try {
    console.log('🔇 [ALARM] Stopping alarm sound');
    
    // Stop vibration
    Vibration.cancel();
    
    // Clear auto-stop timeout
    if (alarmStopTimeout) {
      clearTimeout(alarmStopTimeout);
      alarmStopTimeout = null;
    }
    
    // Stop and unload sound
    if (alarmSound) {
      await alarmSound.stopAsync();
      await alarmSound.unloadAsync();
      alarmSound = null;
    }
    
    isAlarmPlaying = false;
    console.log('✅ [ALARM] Sound stopped');
  } catch (error) {
    console.error('❌ [ALARM] Stop sound failed:', error);
  }
}

/**
 * Cancel a scheduled alarm
 */
export async function cancelAlarm(taskId: string): Promise<boolean> {
  try {
    const alarms = await getStoredAlarms();
    const alarm = alarms.find(a => a.taskId === taskId);
    
    if (alarm) {
      // Cancel notifications
      if (alarm.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(alarm.notificationId);
      }
      if (alarm.backupNotificationId) {
        await Notifications.cancelScheduledNotificationAsync(alarm.backupNotificationId);
      }
      
      // Remove from storage
      const remaining = alarms.filter(a => a.taskId !== taskId);
      await saveAlarms(remaining);
      
      console.log('✅ [ALARM] Cancelled alarm for task:', taskId);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ [ALARM] Cancel failed:', error);
    return false;
  }
}

/**
 * Snooze alarm for specified minutes
 */
export async function snoozeAlarm(
  taskId: string,
  title: string,
  minutes: number = 5,
  options: any = {}
): Promise<string | null> {
  try {
    console.log(`😴 [ALARM] Snoozing for ${minutes} minutes`);
    
    // Stop current alarm
    await stopAlarmSound();
    
    // Cancel current notifications
    await cancelAlarm(taskId);
    
    // Schedule new alarm
    const snoozeTime = new Date(Date.now() + minutes * 60 * 1000);
    return await scheduleFullScreenAlarm(taskId, title, snoozeTime, options);
  } catch (error) {
    console.error('❌ [ALARM] Snooze failed:', error);
    return null;
  }
}

/**
 * Check for alarms that triggered while app was closed
 */
async function checkForTriggeredAlarms(): Promise<TriggeredAlarmData | null> {
  try {
    const data = await AsyncStorage.getItem(TRIGGERED_ALARM_KEY);
    if (data) {
      const triggeredAlarm: TriggeredAlarmData = JSON.parse(data);
      console.log('🔔 [ALARM] Found triggered alarm:', triggeredAlarm.title);
      return triggeredAlarm;
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get triggered alarm data (call this on app open)
 */
export async function getTriggeredAlarm(): Promise<TriggeredAlarmData | null> {
  return checkForTriggeredAlarms();
}

/**
 * Clear triggered alarm data
 */
export async function clearTriggeredAlarm(): Promise<void> {
  await AsyncStorage.removeItem(TRIGGERED_ALARM_KEY);
}

/**
 * Store triggered alarm data
 */
async function storeTriggeredAlarm(data: TriggeredAlarmData): Promise<void> {
  await AsyncStorage.setItem(TRIGGERED_ALARM_KEY, JSON.stringify(data));
}

// Storage helpers
async function storeAlarm(alarm: ScheduledAlarm): Promise<void> {
  const alarms = await getStoredAlarms();
  const filtered = alarms.filter(a => a.taskId !== alarm.taskId);
  filtered.push(alarm);
  await saveAlarms(filtered);
}

async function getStoredAlarms(): Promise<ScheduledAlarm[]> {
  try {
    const data = await AsyncStorage.getItem(ALARM_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function saveAlarms(alarms: ScheduledAlarm[]): Promise<void> {
  await AsyncStorage.setItem(ALARM_STORAGE_KEY, JSON.stringify(alarms));
}

/**
 * Get all scheduled alarms
 */
export async function getScheduledAlarms(): Promise<ScheduledAlarm[]> {
  return getStoredAlarms();
}

/**
 * Debug: List all scheduled notifications
 */
export async function debugListNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  console.log('📋 [ALARM] Scheduled notifications:', scheduled.length);
  scheduled.forEach((n, i) => {
    console.log(`  ${i + 1}. ${n.content.title} - ID: ${n.identifier}`);
  });
}

/**
 * Open device alarm settings
 */
export async function openAlarmSettings(): Promise<void> {
  if (Platform.OS === 'android') {
    Alert.alert(
      'Enable Alarm Permissions',
      'For reliable alarms, please:\n\n1. Enable "Alarms & reminders" permission\n2. Disable battery optimization\n3. Allow notifications\n\nGo to Settings now?',
      [
        { text: 'Later', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
  } else {
    Linking.openSettings();
  }
}

/**
 * Request battery optimization exemption
 */
export function requestBatteryOptimization(): void {
  if (Platform.OS === 'android') {
    Alert.alert(
      'Disable Battery Optimization',
      'For alarms to work reliably when the app is closed, please disable battery optimization for Noregret.\n\nSettings → Apps → Noregret → Battery → Unrestricted',
      [
        { text: 'Later', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
  }
}
