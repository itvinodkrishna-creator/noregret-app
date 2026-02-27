/**
 * Web-compatible Alarm Scheduler
 * 
 * Since expo-notifications scheduled notifications don't work reliably on web,
 * this module provides a timer-based alarm system that works across all platforms.
 * 
 * For native apps, it ALSO schedules a native notification as backup for when 
 * the app is closed.
 */

import { Platform } from 'react-native';
import { scheduleBackgroundAlarm, cancelNotification } from './notifications';

interface ScheduledAlarm {
  id: string;
  taskId: string;
  title: string;
  description?: string;
  triggerTime: Date;
  soundUrl: string;
  timerId?: any; // Use any for cross-platform compatibility
  nativeNotificationId?: string; // ID of the native notification for background
}

// Store scheduled alarms in memory
let scheduledAlarms: Map<string, ScheduledAlarm> = new Map();

// Callback for when alarm triggers
let onAlarmTriggerCallback: ((alarm: ScheduledAlarm) => void) | null = null;

/**
 * Set the callback function that will be called when an alarm triggers
 */
export function setAlarmTriggerCallback(callback: (alarm: ScheduledAlarm) => void) {
  onAlarmTriggerCallback = callback;
  console.log('✅ Alarm trigger callback registered');
}

/**
 * Schedule an alarm to trigger at a specific time
 * This schedules both a timer (for when app is open) and a native notification (for background)
 */
export async function scheduleAlarm(
  taskId: string,
  title: string,
  triggerTime: Date,
  soundUrl: string = 'default',
  description?: string
): Promise<string> {
  const alarmId = `alarm_${taskId}_${Date.now()}`;
  
  const now = new Date();
  const msUntilTrigger = triggerTime.getTime() - now.getTime();
  
  console.log('⏰ Scheduling alarm:');
  console.log(`   Task: ${title}`);
  console.log(`   Current time: ${now.toLocaleTimeString()}`);
  console.log(`   Trigger time: ${triggerTime.toLocaleTimeString()}`);
  console.log(`   Ms until trigger: ${msUntilTrigger}`);
  console.log(`   Minutes until trigger: ${Math.round(msUntilTrigger / 60000)}`);
  
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
