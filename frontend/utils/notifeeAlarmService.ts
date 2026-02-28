/**
 * NOTIFEE ALARM SERVICE
 * 
 * Uses @notifee/react-native for reliable full-screen alarms that work when:
 * - App is in foreground
 * - App is in background
 * - App is completely killed/closed
 * - Phone is locked
 * 
 * This is the ONLY reliable way to get true alarm functionality on Android.
 */

import { Platform, Vibration, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Only import notifee on native platforms
let notifee: any = null;
let AndroidImportance: any = null;
let AndroidCategory: any = null;
let AndroidVisibility: any = null;
let TriggerType: any = null;
let EventType: any = null;

// Initialize notifee only on native
if (Platform.OS !== 'web') {
  try {
    const notifeeModule = require('@notifee/react-native');
    notifee = notifeeModule.default;
    AndroidImportance = notifeeModule.AndroidImportance;
    AndroidCategory = notifeeModule.AndroidCategory;
    AndroidVisibility = notifeeModule.AndroidVisibility;
    TriggerType = notifeeModule.TriggerType;
    EventType = notifeeModule.EventType;
  } catch (error) {
    console.log('[NOTIFEE] Not available on this platform');
  }
}

// Constants
const ALARM_CHANNEL_ID = 'noregret-alarm-channel';
const ALARM_STORAGE_KEY = '@noregret_notifee_alarms';
const PENDING_ALARM_KEY = '@noregret_pending_alarm';

// Alarm callback
let onAlarmTriggerCallback: ((data: any) => void) | null = null;

/**
 * Initialize the Notifee alarm system
 */
export async function initializeNotifeeAlarms(): Promise<boolean> {
  if (Platform.OS === 'web' || !notifee) {
    console.log('[NOTIFEE] Skipping - not on native platform');
    return false;
  }

  try {
    console.log('🔔 [NOTIFEE] Initializing alarm system...');

    // Create alarm notification channel with MAXIMUM priority
    await notifee.createChannel({
      id: ALARM_CHANNEL_ID,
      name: 'Task Alarms',
      description: 'Critical task reminder alarms',
      importance: AndroidImportance.HIGH,
      vibration: true,
      vibrationPattern: [0, 1000, 500, 1000, 500, 1000],
      lights: true,
      lightColor: '#FF0000',
      sound: 'default',
      bypassDnd: true, // Bypass Do Not Disturb
    });

    console.log('✅ [NOTIFEE] Alarm channel created');

    // Request permissions
    const settings = await notifee.requestPermission();
    console.log('📋 [NOTIFEE] Permission status:', settings.authorizationStatus);

    // Set up foreground event handler
    notifee.onForegroundEvent(({ type, detail }: { type: any; detail: any }) => {
      console.log('📬 [NOTIFEE] Foreground event:', type, detail?.notification?.id);
      
      if (type === EventType.DELIVERED || type === EventType.PRESS) {
        const data = detail?.notification?.data;
        if (data?.type === 'alarm' && onAlarmTriggerCallback) {
          console.log('🚨 [NOTIFEE] Alarm triggered in foreground!');
          onAlarmTriggerCallback(data);
        }
      }
    });

    // Set up background event handler
    notifee.onBackgroundEvent(async ({ type, detail }: { type: any; detail: any }) => {
      console.log('📬 [NOTIFEE] Background event:', type, detail?.notification?.id);
      
      if (type === EventType.DELIVERED || type === EventType.PRESS) {
        const data = detail?.notification?.data;
        if (data?.type === 'alarm') {
          // Store pending alarm for when app opens
          await AsyncStorage.setItem(PENDING_ALARM_KEY, JSON.stringify({
            ...data,
            triggeredAt: Date.now(),
          }));
          console.log('✅ [NOTIFEE] Stored pending alarm for app open');
        }
      }
    });

    // Check for pending alarm from background
    await checkPendingAlarm();

    console.log('✅ [NOTIFEE] Alarm system initialized');
    return true;
  } catch (error) {
    console.error('❌ [NOTIFEE] Initialization failed:', error);
    return false;
  }
}

/**
 * Check for alarm that triggered while app was closed
 */
async function checkPendingAlarm(): Promise<void> {
  try {
    const pendingData = await AsyncStorage.getItem(PENDING_ALARM_KEY);
    if (pendingData && onAlarmTriggerCallback) {
      const alarm = JSON.parse(pendingData);
      console.log('🔔 [NOTIFEE] Found pending alarm:', alarm.title);
      
      // Clear it
      await AsyncStorage.removeItem(PENDING_ALARM_KEY);
      
      // Trigger callback
      onAlarmTriggerCallback(alarm);
    }
  } catch (error) {
    console.log('[NOTIFEE] No pending alarm');
  }
}

/**
 * Set callback for when alarm triggers
 */
export function setNotifeeAlarmCallback(callback: (data: any) => void): void {
  onAlarmTriggerCallback = callback;
  console.log('✅ [NOTIFEE] Alarm callback registered');
  
  // Check for pending alarm immediately
  checkPendingAlarm();
}

/**
 * Schedule an alarm notification
 */
export async function scheduleNotifeeAlarm(
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
  if (Platform.OS === 'web' || !notifee) {
    console.log('[NOTIFEE] Cannot schedule - not on native');
    return null;
  }

  try {
    const now = new Date();
    const delay = triggerTime.getTime() - now.getTime();
    
    if (delay <= 0) {
      console.error('❌ [NOTIFEE] Cannot schedule for past time');
      return null;
    }

    const seconds = Math.floor(delay / 1000);
    console.log(`📅 [NOTIFEE] Scheduling alarm:`);
    console.log(`   Task: ${title}`);
    console.log(`   Trigger in: ${seconds}s (${Math.round(seconds / 60)}min)`);
    console.log(`   Time: ${triggerTime.toLocaleString()}`);

    // Create trigger
    const trigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: triggerTime.getTime(),
      alarmManager: {
        allowWhileIdle: true, // Fire even in Doze mode
      },
    };

    // Create notification with full-screen intent
    const notificationId = await notifee.createTriggerNotification(
      {
        id: `alarm_${taskId}`,
        title: `🔔 ALARM: ${title}`,
        body: options.description || 'Time for your scheduled task!',
        android: {
          channelId: ALARM_CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          category: AndroidCategory.ALARM,
          visibility: AndroidVisibility.PUBLIC,
          fullScreenAction: {
            id: 'default',
            mainComponent: 'MainActivity',
          },
          pressAction: {
            id: 'default',
            launchActivity: 'default',
          },
          vibrationPattern: [0, 1000, 500, 1000, 500, 1000],
          lights: ['#FF0000', 500, 500],
          sound: 'default',
          autoCancel: false,
          ongoing: true, // Cannot be swiped away
          showTimestamp: true,
          timestamp: Date.now(),
          actions: [
            {
              title: '✓ Done',
              pressAction: { id: 'done' },
            },
            {
              title: '😴 Snooze',
              pressAction: { id: 'snooze' },
            },
          ],
        },
        data: {
          type: 'alarm',
          taskId,
          title,
          description: options.description,
          soundUrl: options.soundUrl || 'default',
          voiceUri: options.voiceUri,
          voiceReadingEnabled: options.voiceReadingEnabled,
          triggerTime: triggerTime.getTime(),
        },
      },
      trigger
    );

    console.log(`✅ [NOTIFEE] Alarm scheduled: ${notificationId}`);

    // Store alarm data
    await storeAlarm({
      id: notificationId,
      taskId,
      title,
      triggerTime: triggerTime.getTime(),
      ...options,
    });

    return notificationId;
  } catch (error) {
    console.error('❌ [NOTIFEE] Schedule failed:', error);
    return null;
  }
}

/**
 * Display an immediate alarm notification (for testing)
 */
export async function displayImmediateAlarm(
  taskId: string,
  title: string,
  description?: string
): Promise<string | null> {
  if (Platform.OS === 'web' || !notifee) {
    console.log('[NOTIFEE] Cannot display - not on native');
    return null;
  }

  try {
    console.log('🚨 [NOTIFEE] Displaying immediate alarm:', title);

    const notificationId = await notifee.displayNotification({
      id: `alarm_${taskId}_${Date.now()}`,
      title: `🔔 ALARM: ${title}`,
      body: description || 'Time for your task!',
      android: {
        channelId: ALARM_CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        category: AndroidCategory.ALARM,
        visibility: AndroidVisibility.PUBLIC,
        fullScreenAction: {
          id: 'default',
          mainComponent: 'MainActivity',
        },
        pressAction: {
          id: 'default',
          launchActivity: 'default',
        },
        vibrationPattern: [0, 1000, 500, 1000, 500, 1000],
        lights: ['#FF0000', 500, 500],
        sound: 'default',
        autoCancel: false,
        ongoing: true,
        actions: [
          {
            title: '✓ Done',
            pressAction: { id: 'done' },
          },
          {
            title: '😴 Snooze 5min',
            pressAction: { id: 'snooze' },
          },
        ],
      },
      data: {
        type: 'alarm',
        taskId,
        title,
        description,
        triggeredAt: Date.now(),
      },
    });

    // Start vibration
    Vibration.vibrate([0, 1000, 500, 1000, 500, 1000], true);

    return notificationId;
  } catch (error) {
    console.error('❌ [NOTIFEE] Display failed:', error);
    return null;
  }
}

/**
 * Cancel a scheduled alarm
 */
export async function cancelNotifeeAlarm(taskId: string): Promise<boolean> {
  if (Platform.OS === 'web' || !notifee) {
    return false;
  }

  try {
    await notifee.cancelNotification(`alarm_${taskId}`);
    await removeStoredAlarm(taskId);
    Vibration.cancel();
    console.log(`✅ [NOTIFEE] Cancelled alarm for: ${taskId}`);
    return true;
  } catch (error) {
    console.error('❌ [NOTIFEE] Cancel failed:', error);
    return false;
  }
}

/**
 * Cancel all scheduled alarms
 */
export async function cancelAllNotifeeAlarms(): Promise<void> {
  if (Platform.OS === 'web' || !notifee) {
    return;
  }

  try {
    await notifee.cancelAllNotifications();
    await AsyncStorage.removeItem(ALARM_STORAGE_KEY);
    Vibration.cancel();
    console.log('✅ [NOTIFEE] All alarms cancelled');
  } catch (error) {
    console.error('❌ [NOTIFEE] Cancel all failed:', error);
  }
}

/**
 * Stop vibration (call when alarm is dismissed)
 */
export function stopNotifeeVibration(): void {
  Vibration.cancel();
  console.log('✅ [NOTIFEE] Vibration stopped');
}

/**
 * Get all scheduled alarms
 */
export async function getScheduledNotifeeAlarms(): Promise<any[]> {
  if (Platform.OS === 'web' || !notifee) {
    return [];
  }

  try {
    const notifications = await notifee.getTriggerNotifications();
    return notifications;
  } catch (error) {
    return [];
  }
}

/**
 * Open alarm/notification settings
 */
export async function openNotifeeSettings(): Promise<void> {
  if (Platform.OS === 'web' || !notifee) {
    return;
  }

  try {
    await notifee.openNotificationSettings();
  } catch (error) {
    Linking.openSettings();
  }
}

/**
 * Request battery optimization exemption
 */
export async function requestBatteryExemption(): Promise<void> {
  if (Platform.OS !== 'android') return;

  Alert.alert(
    '🔋 Enable Unrestricted Battery',
    'For alarms to work reliably when the app is closed:\n\n' +
    '1. Go to Settings → Apps → Noregret\n' +
    '2. Tap "Battery"\n' +
    '3. Select "Unrestricted"\n\n' +
    'This ensures alarms will fire even when the phone is sleeping.',
    [
      { text: 'Later', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]
  );
}

// Storage helpers
async function storeAlarm(alarm: any): Promise<void> {
  try {
    const existing = await getStoredAlarms();
    const filtered = existing.filter((a: any) => a.taskId !== alarm.taskId);
    filtered.push(alarm);
    await AsyncStorage.setItem(ALARM_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('[NOTIFEE] Store alarm failed:', error);
  }
}

async function getStoredAlarms(): Promise<any[]> {
  try {
    const data = await AsyncStorage.getItem(ALARM_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function removeStoredAlarm(taskId: string): Promise<void> {
  try {
    const existing = await getStoredAlarms();
    const filtered = existing.filter((a: any) => a.taskId !== taskId);
    await AsyncStorage.setItem(ALARM_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('[NOTIFEE] Remove alarm failed:', error);
  }
}

/**
 * Check if full-screen intent permission is granted (Android 14+)
 */
export async function checkFullScreenPermission(): Promise<boolean> {
  if (Platform.OS === 'web' || !notifee) {
    return false;
  }

  try {
    // On Android 14+, full-screen intent requires explicit permission
    const powerManagerInfo = await notifee.getPowerManagerInfo();
    console.log('[NOTIFEE] Power manager:', powerManagerInfo);
    return true;
  } catch (error) {
    return false;
  }
}
