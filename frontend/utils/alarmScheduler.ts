/**
 * Hybrid Alarm Scheduler
 * 
 * Combines:
 * 1. In-app timer (setTimeout) - For foreground alarm modal
 * 2. Notifee notifications - For TRUE background/killed app alarms
 * 
 * Uses @notifee/react-native for reliable full-screen alarms on Android.
 */

import { Platform, Vibration } from 'react-native';
import { Audio } from 'expo-av';
import { 
  scheduleFullScreenAlarm, 
  cancelAlarm as cancelSystemAlarm,
  snoozeAlarm as snoozeSystemAlarm,
  initializeAlarmSystem,
  getTriggeredAlarm,
  clearTriggeredAlarm,
} from './systemAlarmService';
import {
  initializeNotifeeAlarms,
  scheduleNotifeeAlarm,
  cancelNotifeeAlarm,
  setNotifeeAlarmCallback,
  stopNotifeeVibration,
  requestBatteryExemption,
} from './notifeeAlarmService';

// Alarm sound management
let alarmSound: Audio.Sound | null = null;
let isAlarmPlaying = false;

// Alarm sound URLs
const ALARM_SOUNDS: { [key: string]: string } = {
  default: 'https://assets.mixkit.co/active_storage/sfx/2869/2869.wav',
  bell: 'https://assets.mixkit.co/active_storage/sfx/2568/2568.wav',
  chime: 'https://assets.mixkit.co/active_storage/sfx/2571/2571.wav',
  alert: 'https://assets.mixkit.co/active_storage/sfx/2870/2870.wav',
  loud: 'https://assets.mixkit.co/active_storage/sfx/1005/1005.wav',
};

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
    
    // Configure audio for alarm playback
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });
    
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
    stopNotifeeVibration();
    
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

interface ScheduledAlarm {
  id: string;
  taskId: string;
  title: string;
  description?: string;
  triggerTime: Date;
  soundUrl: string;
  voiceUri?: string;
  voiceReadingEnabled?: boolean;
  timerId?: any;
  systemNotificationId?: string;
  notifeeId?: string;
}

// In-memory alarm storage
let scheduledAlarms: Map<string, ScheduledAlarm> = new Map();

// Callback when alarm triggers in-app
let onAlarmTriggerCallback: ((alarm: ScheduledAlarm) => void) | null = null;

// Track initialization
let isInitialized = false;
let batteryPromptShown = false;

/**
 * Initialize the alarm scheduler
 */
export async function initAlarmScheduler(): Promise<void> {
  if (isInitialized) return;
  
  console.log('🔧 [SCHEDULER] Initializing hybrid alarm scheduler...');
  
  // Initialize both alarm services on native
  if (Platform.OS !== 'web') {
    // Initialize expo-notifications based service
    await initializeAlarmSystem();
    
    // Initialize Notifee (more reliable for killed app)
    await initializeNotifeeAlarms();
    
    // Set up Notifee callback for background alarms
    setNotifeeAlarmCallback((data) => {
      console.log('🔔 [SCHEDULER] Notifee alarm callback:', data.title);
      
      if (onAlarmTriggerCallback) {
        onAlarmTriggerCallback({
          id: `notifee_${data.taskId}`,
          taskId: data.taskId,
          title: data.title,
          description: data.description,
          triggerTime: new Date(data.triggeredAt || Date.now()),
          soundUrl: data.soundUrl || 'default',
          voiceUri: data.voiceUri,
          voiceReadingEnabled: data.voiceReadingEnabled,
        });
      }
    });
    
    // Show battery optimization prompt once
    if (!batteryPromptShown) {
      batteryPromptShown = true;
      // Delay to not interrupt initial load
      setTimeout(() => {
        requestBatteryExemption();
      }, 5000);
    }
  }
  
  // Check for alarms that triggered while app was closed (expo-notifications)
  if (Platform.OS !== 'web') {
    const triggeredAlarm = await getTriggeredAlarm();
    if (triggeredAlarm && onAlarmTriggerCallback) {
      console.log('🔔 [SCHEDULER] Found expo-notifications alarm:', triggeredAlarm.title);
      
      onAlarmTriggerCallback({
        id: `triggered_${triggeredAlarm.taskId}`,
        taskId: triggeredAlarm.taskId,
        title: triggeredAlarm.title,
        description: triggeredAlarm.description,
        triggerTime: new Date(triggeredAlarm.triggeredAt),
        soundUrl: triggeredAlarm.soundUrl || 'default',
        voiceUri: triggeredAlarm.voiceUri,
        voiceReadingEnabled: triggeredAlarm.voiceReadingEnabled,
      });
      
      await clearTriggeredAlarm();
    }
  }
  
  isInitialized = true;
  console.log('✅ [SCHEDULER] Alarm scheduler initialized with Notifee + expo-notifications');
}

/**
 * Set callback for when alarm triggers
 */
export function setAlarmTriggerCallback(callback: (alarm: ScheduledAlarm) => void) {
  onAlarmTriggerCallback = callback;
  console.log('✅ [SCHEDULER] Alarm trigger callback registered');
}

/**
 * Schedule an alarm - uses BOTH Notifee and expo-notifications for maximum reliability
 */
export async function scheduleAlarm(
  taskId: string,
  title: string,
  triggerTime: Date,
  soundUrl: string = 'default',
  description?: string,
  voiceUri?: string,
  voiceReadingEnabled?: boolean
): Promise<string> {
  const alarmId = `alarm_${taskId}_${Date.now()}`;
  const now = new Date();
  const msUntilTrigger = triggerTime.getTime() - now.getTime();
  
  console.log('⏰ [SCHEDULER] Scheduling alarm:');
  console.log(`   Task: ${title}`);
  console.log(`   Trigger in: ${Math.round(msUntilTrigger / 1000)}s (${Math.round(msUntilTrigger / 60000)}min)`);
  console.log(`   Time: ${triggerTime.toLocaleTimeString()}`);
  
  if (msUntilTrigger <= 0) {
    throw new Error('Cannot schedule alarm for past time');
  }
  
  const alarm: ScheduledAlarm = {
    id: alarmId,
    taskId,
    title,
    description,
    triggerTime,
    soundUrl,
    voiceUri,
    voiceReadingEnabled,
  };
  
  if (Platform.OS !== 'web') {
    // 1. Schedule with NOTIFEE (primary - most reliable for killed app)
    try {
      const notifeeId = await scheduleNotifeeAlarm(taskId, title, triggerTime, {
        description,
        soundUrl,
        voiceUri,
        voiceReadingEnabled,
      });
      
      if (notifeeId) {
        alarm.notifeeId = notifeeId;
        console.log('✅ [SCHEDULER] Notifee alarm scheduled:', notifeeId);
      }
    } catch (error) {
      console.error('⚠️ [SCHEDULER] Notifee scheduling failed:', error);
    }
    
    // 2. Schedule with expo-notifications (backup)
    try {
      const systemId = await scheduleFullScreenAlarm(taskId, title, triggerTime, {
        description,
        soundUrl,
        voiceUri,
        voiceReadingEnabled,
      });
      
      if (systemId) {
        alarm.systemNotificationId = systemId;
        console.log('✅ [SCHEDULER] expo-notifications alarm scheduled:', systemId);
      }
    } catch (error) {
      console.error('⚠️ [SCHEDULER] expo-notifications failed:', error);
    }
  }
  
  // 3. Schedule IN-APP timer (for showing custom modal when app is open)
  const timerId = setTimeout(() => {
    console.log('🔔🔔🔔 [SCHEDULER] IN-APP ALARM TRIGGERED! 🔔🔔🔔');
    console.log(`   Task: ${alarm.title}`);
    
    // Cancel system notifications since we're showing in-app modal
    if (Platform.OS !== 'web') {
      if (alarm.notifeeId) cancelNotifeeAlarm(taskId);
      if (alarm.systemNotificationId) cancelSystemAlarm(taskId);
    }
    
    // Remove from scheduled
    scheduledAlarms.delete(alarmId);
    
    // Trigger callback
    if (onAlarmTriggerCallback) {
      onAlarmTriggerCallback(alarm);
    }
  }, msUntilTrigger);
  
  alarm.timerId = timerId;
  scheduledAlarms.set(alarmId, alarm);
  
  console.log(`✅ [SCHEDULER] Alarm ${alarmId} scheduled (Notifee + expo-notifications + in-app timer)`);
  return alarmId;
}

/**
 * Cancel alarm
 */
export function cancelAlarm(alarmId: string): boolean {
  const alarm = scheduledAlarms.get(alarmId);
  
  if (alarm) {
    if (alarm.timerId) clearTimeout(alarm.timerId);
    if (Platform.OS !== 'web') {
      cancelNotifeeAlarm(alarm.taskId);
      cancelSystemAlarm(alarm.taskId);
    }
    scheduledAlarms.delete(alarmId);
    console.log(`✅ [SCHEDULER] Cancelled: ${alarmId}`);
    return true;
  }
  
  return false;
}

/**
 * Cancel alarms for task
 */
export function cancelAlarmsForTask(taskId: string): number {
  let count = 0;
  
  scheduledAlarms.forEach((alarm, alarmId) => {
    if (alarm.taskId === taskId) {
      if (alarm.timerId) clearTimeout(alarm.timerId);
      scheduledAlarms.delete(alarmId);
      count++;
    }
  });
  
  if (Platform.OS !== 'web') {
    cancelNotifeeAlarm(taskId);
    cancelSystemAlarm(taskId);
  }
  
  console.log(`✅ [SCHEDULER] Cancelled ${count} alarms for task ${taskId}`);
  return count;
}

/**
 * Snooze alarm
 */
export async function snoozeAlarm(
  taskId: string,
  title: string,
  minutes: number,
  options: any = {}
): Promise<string | null> {
  console.log(`😴 [SCHEDULER] Snoozing ${title} for ${minutes}min`);
  
  // Cancel existing alarms
  cancelAlarmsForTask(taskId);
  
  // Schedule new alarm
  const snoozeTime = new Date(Date.now() + minutes * 60 * 1000);
  
  try {
    return await scheduleAlarm(
      taskId,
      title,
      snoozeTime,
      options.soundUrl || 'default',
      options.description,
      options.voiceUri,
      options.voiceReadingEnabled
    );
  } catch (error) {
    console.error('❌ [SCHEDULER] Snooze failed:', error);
    return null;
  }
}

/**
 * Get all scheduled alarms
 */
export function getScheduledAlarms(): ScheduledAlarm[] {
  return Array.from(scheduledAlarms.values());
}

/**
 * Clear all alarms
 */
export function clearAllAlarms(): void {
  scheduledAlarms.forEach((alarm) => {
    if (alarm.timerId) clearTimeout(alarm.timerId);
    if (Platform.OS !== 'web') {
      cancelNotifeeAlarm(alarm.taskId);
      cancelSystemAlarm(alarm.taskId);
    }
  });
  scheduledAlarms.clear();
  console.log('✅ [SCHEDULER] All alarms cleared');
}

// Export for external use
export { requestBatteryExemption };
