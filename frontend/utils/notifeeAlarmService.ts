/**
 * ENHANCED ALARM SERVICE
 * 
 * Uses expo-notifications with maximum reliability settings for background alarms.
 * This service works when:
 * - App is in foreground
 * - App is in background
 * - App is completely killed/closed (using exact alarms + high priority channels)
 * - Phone is locked
 */

import { Platform, Vibration, Linking, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants
const ALARM_CHANNEL_ID = 'noregret-alarm-channel';
const PENDING_ALARM_KEY = '@noregret_pending_alarm_v2';

// Alarm callback
let onAlarmTriggerCallback: ((data: any) => void) | null = null;

/**
 * Initialize the enhanced alarm system
 */
export async function initializeNotifeeAlarms(): Promise<boolean> {
  if (Platform.OS === 'web') {
    console.log('[ENHANCED-ALARM] Skipping - not on native platform');
    return false;
  }

  try {
    console.log('🔔 [ENHANCED-ALARM] Initializing alarm system...');

    // Create alarm notification channel with MAXIMUM priority for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
        name: 'Task Alarms',
        description: 'Critical task reminder alarms that wake the device',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 1000, 500, 1000, 500, 1000],
        lightColor: '#FF0000',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        bypassDnd: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        showBadge: true,
      });
      console.log('✅ [ENHANCED-ALARM] Alarm channel created with MAX importance');
    }

    // Request permissions
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowCriticalAlerts: true,
      },
      android: {},
    });
    console.log('📋 [ENHANCED-ALARM] Permission status:', status);

    // Check for pending alarm from when app was closed
    await checkPendingAlarm();

    console.log('✅ [ENHANCED-ALARM] Alarm system initialized');
    return true;
  } catch (error) {
    console.error('❌ [ENHANCED-ALARM] Initialization failed:', error);
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
      console.log('🔔 [ENHANCED-ALARM] Found pending alarm:', alarm.title);
      
      // Clear it
      await AsyncStorage.removeItem(PENDING_ALARM_KEY);
      
      // Trigger callback
      setTimeout(() => {
        if (onAlarmTriggerCallback) {
          onAlarmTriggerCallback(alarm);
        }
      }, 500);
    }
  } catch (error) {
    console.log('[ENHANCED-ALARM] No pending alarm');
  }
}

/**
 * Set callback for when alarm triggers
 */
export function setNotifeeAlarmCallback(callback: (data: any) => void): void {
  onAlarmTriggerCallback = callback;
  console.log('✅ [ENHANCED-ALARM] Alarm callback registered');
  
  // Check for pending alarm immediately
  checkPendingAlarm();
}

/**
 * Schedule an alarm notification with maximum priority
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
  if (Platform.OS === 'web') {
    console.log('[ENHANCED-ALARM] Cannot schedule - not on native');
    return null;
  }

  try {
    const now = new Date();
    const delay = triggerTime.getTime() - now.getTime();
    
    if (delay <= 0) {
      console.error('❌ [ENHANCED-ALARM] Cannot schedule for past time');
      return null;
    }

    const seconds = Math.floor(delay / 1000);
    console.log(`📅 [ENHANCED-ALARM] Scheduling alarm:`);
    console.log(`   Task: ${title}`);
    console.log(`   Trigger in: ${seconds}s (${Math.round(seconds / 60)}min)`);
    console.log(`   Time: ${triggerTime.toLocaleString()}`);

    // Schedule notification with EXACT timing and CUSTOM ALARM SOUND
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🔔 ALARM: ${title}`,
        body: options.description || 'Time for your scheduled task!',
        sound: 'alarm.mp3', // Use custom alarm sound
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 1000, 500, 1000, 500, 1000],
        sticky: true,
        autoDismiss: false,
        categoryIdentifier: 'alarm',
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
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerTime,
        channelId: ALARM_CHANNEL_ID,
      },
    });

    console.log(`✅ [ENHANCED-ALARM] Alarm scheduled: ${notificationId}`);
    return notificationId;
  } catch (error) {
    console.error('❌ [ENHANCED-ALARM] Schedule failed:', error);
    return null;
  }
}

/**
 * Cancel a scheduled alarm
 */
export async function cancelNotifeeAlarm(taskId: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  try {
    // Get all scheduled notifications and cancel those matching taskId
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      const data = notification.content.data as any;
      if (data?.taskId === taskId) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        console.log(`✅ [ENHANCED-ALARM] Cancelled notification: ${notification.identifier}`);
      }
    }
    
    Vibration.cancel();
    return true;
  } catch (error) {
    console.error('❌ [ENHANCED-ALARM] Cancel failed:', error);
    return false;
  }
}

/**
 * Stop vibration (call when alarm is dismissed)
 */
export function stopNotifeeVibration(): void {
  Vibration.cancel();
  console.log('✅ [ENHANCED-ALARM] Vibration stopped');
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

/**
 * Store alarm data when it triggers (for when app opens later)
 */
export async function storePendingAlarmData(data: any): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_ALARM_KEY, JSON.stringify({
      ...data,
      triggeredAt: Date.now(),
    }));
    console.log('✅ [ENHANCED-ALARM] Stored pending alarm data');
  } catch (error) {
    console.error('[ENHANCED-ALARM] Failed to store pending alarm:', error);
  }
}
