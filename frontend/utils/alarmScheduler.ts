/**
 * Hybrid Alarm Scheduler
 * 
 * Combines:
 * 1. In-app timer (setTimeout) - For foreground alarm modal
 * 2. System-level notification - For background/killed app scenarios
 * 
 * The system notification uses full-screen intent to wake the device.
 */

import { Platform } from 'react-native';
import { 
  scheduleFullScreenAlarm, 
  cancelAlarm as cancelSystemAlarm,
  snoozeAlarm as snoozeSystemAlarm,
  startAlarmSound,
  stopAlarmSound,
  initializeAlarmSystem,
  getTriggeredAlarm,
  clearTriggeredAlarm,
} from './systemAlarmService';

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
}

// In-memory alarm storage
let scheduledAlarms: Map<string, ScheduledAlarm> = new Map();

// Callback when alarm triggers in-app
let onAlarmTriggerCallback: ((alarm: ScheduledAlarm) => void) | null = null;

// Track initialization
let isInitialized = false;

/**
 * Initialize the alarm scheduler
 */
export async function initAlarmScheduler(): Promise<void> {
  if (isInitialized) return;
  
  console.log('🔧 [SCHEDULER] Initializing hybrid alarm scheduler...');
  
  // Initialize system alarm service
  if (Platform.OS !== 'web') {
    await initializeAlarmSystem();
  }
  
  // Check for alarms that triggered while app was closed
  if (Platform.OS !== 'web') {
    const triggeredAlarm = await getTriggeredAlarm();
    if (triggeredAlarm && onAlarmTriggerCallback) {
      console.log('🔔 [SCHEDULER] Found alarm that triggered while closed:', triggeredAlarm.title);
      
      // Trigger the callback with the stored alarm data
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
      
      // Clear the triggered alarm data
      await clearTriggeredAlarm();
    }
  }
  
  isInitialized = true;
  console.log('✅ [SCHEDULER] Alarm scheduler initialized');
}

/**
 * Set callback for when alarm triggers
 */
export function setAlarmTriggerCallback(callback: (alarm: ScheduledAlarm) => void) {
  onAlarmTriggerCallback = callback;
  console.log('✅ [SCHEDULER] Alarm trigger callback registered');
}

/**
 * Schedule an alarm
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
  console.log(`   Trigger in: ${Math.round(msUntilTrigger / 1000)}s`);
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
  
  // 1. Schedule SYSTEM-LEVEL notification (works when app is closed)
  if (Platform.OS !== 'web') {
    try {
      const systemId = await scheduleFullScreenAlarm(taskId, title, triggerTime, {
        description,
        soundUrl,
        voiceUri,
        voiceReadingEnabled,
      });
      
      if (systemId) {
        alarm.systemNotificationId = systemId;
        console.log('✅ [SCHEDULER] System notification scheduled');
      }
    } catch (error) {
      console.error('⚠️ [SCHEDULER] System notification failed:', error);
    }
  }
  
  // 2. Schedule IN-APP timer (for showing custom modal when app is open)
  const timerId = setTimeout(() => {
    console.log('🔔🔔🔔 [SCHEDULER] ALARM TRIGGERED! 🔔🔔🔔');
    console.log(`   Task: ${alarm.title}`);
    
    // Cancel system notification since we're showing in-app modal
    if (alarm.systemNotificationId && Platform.OS !== 'web') {
      cancelSystemAlarm(taskId);
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
  
  console.log(`✅ [SCHEDULER] Alarm ${alarmId} scheduled`);
  return alarmId;
}

/**
 * Cancel alarm
 */
export function cancelAlarm(alarmId: string): boolean {
  const alarm = scheduledAlarms.get(alarmId);
  
  if (alarm) {
    if (alarm.timerId) clearTimeout(alarm.timerId);
    if (Platform.OS !== 'web') cancelSystemAlarm(alarm.taskId);
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
  
  if (Platform.OS !== 'web') cancelSystemAlarm(taskId);
  
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
  
  // Cancel existing
  cancelAlarmsForTask(taskId);
  
  // Schedule new
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
    if (Platform.OS !== 'web') cancelSystemAlarm(alarm.taskId);
  });
  scheduledAlarms.clear();
  console.log('✅ [SCHEDULER] All alarms cleared');
}

// Re-export sound functions
export { startAlarmSound, stopAlarmSound };
