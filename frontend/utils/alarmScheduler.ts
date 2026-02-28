/**
 * Hybrid Alarm Scheduler
 * 
 * This module provides a dual alarm system:
 * 1. In-app timer (setTimeout) - for when app is in foreground
 * 2. System-level notification - for when app is closed/background
 * 
 * The system notification will wake the device and play sound even if app is killed.
 */

import { Platform } from 'react-native';
import { scheduleSystemAlarm, cancelSystemAlarm, initializeAlarmSystem } from './systemAlarmService';

interface ScheduledAlarm {
  id: string;
  taskId: string;
  title: string;
  description?: string;
  triggerTime: Date;
  soundUrl: string;
  voiceUri?: string;
  voiceReadingEnabled?: boolean;
  timerId?: any; // Use any for cross-platform compatibility
  systemNotificationId?: string; // ID of the system notification for background
}

// Store scheduled alarms in memory
let scheduledAlarms: Map<string, ScheduledAlarm> = new Map();

// Callback for when alarm triggers (in-app)
let onAlarmTriggerCallback: ((alarm: ScheduledAlarm) => void) | null = null;

// Track if system is initialized
let systemInitialized = false;

/**
 * Initialize the alarm system (call this on app start)
 */
export async function initAlarmScheduler(): Promise<void> {
  if (!systemInitialized) {
    await initializeAlarmSystem();
    systemInitialized = true;
  }
}

/**
 * Set the callback function that will be called when an alarm triggers in-app
 */
export function setAlarmTriggerCallback(callback: (alarm: ScheduledAlarm) => void) {
  onAlarmTriggerCallback = callback;
  console.log('✅ Alarm trigger callback registered');
}

/**
 * Schedule an alarm to trigger at a specific time
 * This schedules BOTH:
 * 1. An in-app timer for foreground display
 * 2. A system-level notification for background/killed app
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
  
  console.log('⏰ Scheduling HYBRID alarm:');
  console.log(`   Task: ${title}`);
  console.log(`   Task ID: ${taskId}`);
  console.log(`   Current time: ${now.toLocaleTimeString()}`);
  console.log(`   Trigger time: ${triggerTime.toLocaleTimeString()}`);
  console.log(`   Seconds until trigger: ${Math.round(msUntilTrigger / 1000)}`);
  console.log(`   Voice URI: ${voiceUri ? 'YES' : 'NO'}`);
  
  // Don't schedule if time is in the past
  if (msUntilTrigger <= 0) {
    console.error('❌ Cannot schedule alarm for past time!');
    throw new Error('Cannot schedule alarm for past time');
  }
  
  // Create the alarm object
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
  
  // Schedule native notification for background (native platforms only)
  // This ensures alarm plays even if app is closed
  if (Platform.OS !== 'web') {
    try {
      const nativeId = await scheduleBackgroundAlarm(
        taskId,
        title,
        description || 'Time for your task!',
        triggerTime,
        soundUrl
      );
      if (nativeId) {
        alarm.nativeNotificationId = nativeId;
        console.log('✅ Native background notification also scheduled:', nativeId);
      }
    } catch (error) {
      console.error('⚠️ Could not schedule native notification:', error);
    }
  }
  
  // Set up the timer to trigger the alarm (for when app is in foreground)
  const timerId = setTimeout(() => {
    console.log('🔔🔔🔔 ALARM TRIGGERED! 🔔🔔🔔');
    console.log(`   Task: ${alarm.title}`);
    console.log(`   Scheduled for: ${alarm.triggerTime.toLocaleTimeString()}`);
    console.log(`   Actual time: ${new Date().toLocaleTimeString()}`);
    
    // Cancel the native notification if app is open (we'll show our custom modal instead)
    if (alarm.nativeNotificationId && Platform.OS !== 'web') {
      cancelNotification(alarm.nativeNotificationId);
    }
    
    // Remove from scheduled alarms
    scheduledAlarms.delete(alarmId);
    
    // Call the trigger callback
    if (onAlarmTriggerCallback) {
      onAlarmTriggerCallback(alarm);
    } else {
      console.error('❌ No alarm trigger callback registered!');
    }
  }, msUntilTrigger);
  
  alarm.timerId = timerId;
  
  // Store the alarm
  scheduledAlarms.set(alarmId, alarm);
  
  console.log(`✅ Alarm scheduled with ID: ${alarmId}`);
  console.log(`   Will trigger in ${Math.round(msUntilTrigger / 1000)} seconds`);
  
  return alarmId;
}

/**
 * Cancel a scheduled alarm
 */
export function cancelAlarm(alarmId: string): boolean {
  const alarm = scheduledAlarms.get(alarmId);
  
  if (alarm) {
    if (alarm.timerId) {
      clearTimeout(alarm.timerId);
    }
    // Also cancel native notification if exists
    if (alarm.nativeNotificationId && Platform.OS !== 'web') {
      cancelNotification(alarm.nativeNotificationId);
    }
    scheduledAlarms.delete(alarmId);
    console.log(`✅ Alarm cancelled: ${alarmId}`);
    return true;
  }
  
  console.log(`⚠️ Alarm not found: ${alarmId}`);
  return false;
}

/**
 * Cancel all alarms for a specific task
 */
export function cancelAlarmsForTask(taskId: string): number {
  let cancelled = 0;
  
  scheduledAlarms.forEach((alarm, alarmId) => {
    if (alarm.taskId === taskId) {
      if (alarm.timerId) {
        clearTimeout(alarm.timerId);
      }
      // Also cancel native notification if exists
      if (alarm.nativeNotificationId && Platform.OS !== 'web') {
        cancelNotification(alarm.nativeNotificationId);
      }
      scheduledAlarms.delete(alarmId);
      cancelled++;
    }
  });
  
  console.log(`✅ Cancelled ${cancelled} alarms for task ${taskId}`);
  return cancelled;
}

/**
 * Get all scheduled alarms
 */
export function getScheduledAlarms(): ScheduledAlarm[] {
  return Array.from(scheduledAlarms.values());
}

/**
 * Clear all scheduled alarms
 */
export function clearAllAlarms(): void {
  scheduledAlarms.forEach((alarm) => {
    if (alarm.timerId) {
      clearTimeout(alarm.timerId);
    }
  });
  scheduledAlarms.clear();
  console.log('✅ All alarms cleared');
}

/**
 * Snooze an alarm by a specified number of minutes
 */
export function snoozeAlarm(
  taskId: string,
  title: string,
  minutes: number,
  soundUrl: string = 'default',
  description?: string
): string {
  const snoozeTime = new Date(Date.now() + minutes * 60 * 1000);
  
  console.log(`⏰ Snoozing alarm for ${minutes} minutes`);
  console.log(`   New trigger time: ${snoozeTime.toLocaleTimeString()}`);
  
  return scheduleAlarm(taskId, title, snoozeTime, soundUrl, description);
}
