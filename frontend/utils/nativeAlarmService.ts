/**
 * NATIVE ALARM SERVICE
 * 
 * Uses expo-alarm-module which leverages Android's native AlarmManager.
 * This provides TRUE alarm functionality that works even when:
 * - App is completely closed/killed
 * - Phone is locked
 * - Battery saver is on
 * 
 * The alarm will:
 * - Wake the device screen
 * - Show a full-screen alarm UI
 * - Play sound at maximum volume
 * - Vibrate continuously
 */

import { Platform } from 'react-native';

// Only import on native platforms
let scheduleAlarm: any = null;
let cancelAlarm: any = null;
let getAllAlarms: any = null;
let stopAlarm: any = null;

if (Platform.OS !== 'web') {
  try {
    const alarmModule = require('expo-alarm-module');
    scheduleAlarm = alarmModule.scheduleAlarm;
    cancelAlarm = alarmModule.cancelAlarm;
    getAllAlarms = alarmModule.getAllAlarms;
    stopAlarm = alarmModule.stopAlarm;
  } catch (error) {
    console.log('[NATIVE-ALARM] expo-alarm-module not available:', error);
  }
}

/**
 * Schedule a native alarm that works when app is closed
 */
export async function scheduleNativeAlarm(
  taskId: string,
  title: string,
  triggerTime: Date,
  options: {
    description?: string;
  } = {}
): Promise<boolean> {
  if (Platform.OS === 'web' || !scheduleAlarm) {
    console.log('[NATIVE-ALARM] Not available on this platform');
    return false;
  }

  try {
    const now = new Date();
    if (triggerTime <= now) {
      console.error('[NATIVE-ALARM] Cannot schedule for past time');
      return false;
    }

    console.log(`📅 [NATIVE-ALARM] Scheduling alarm:`);
    console.log(`   Task: ${title}`);
    console.log(`   Time: ${triggerTime.toLocaleString()}`);
    console.log(`   In: ${Math.round((triggerTime.getTime() - now.getTime()) / 60000)} minutes`);

    // Schedule using expo-alarm-module
    await scheduleAlarm({
      uid: `noregret_${taskId}`,
      day: triggerTime,
      title: `🔔 ${title}`,
      description: options.description || 'Time for your task!',
      snoozeInterval: 5, // 5 minutes snooze
      repeating: false,
      active: true,
    });

    console.log(`✅ [NATIVE-ALARM] Alarm scheduled successfully`);
    return true;
  } catch (error) {
    console.error('❌ [NATIVE-ALARM] Failed to schedule:', error);
    return false;
  }
}

/**
 * Cancel a native alarm
 */
export async function cancelNativeAlarm(taskId: string): Promise<boolean> {
  if (Platform.OS === 'web' || !cancelAlarm) {
    return false;
  }

  try {
    await cancelAlarm(`noregret_${taskId}`);
    console.log(`✅ [NATIVE-ALARM] Cancelled alarm for: ${taskId}`);
    return true;
  } catch (error) {
    console.error('❌ [NATIVE-ALARM] Failed to cancel:', error);
    return false;
  }
}

/**
 * Stop a currently ringing alarm
 */
export async function stopNativeAlarm(): Promise<boolean> {
  if (Platform.OS === 'web' || !stopAlarm) {
    return false;
  }

  try {
    await stopAlarm();
    console.log(`✅ [NATIVE-ALARM] Stopped ringing alarm`);
    return true;
  } catch (error) {
    console.error('❌ [NATIVE-ALARM] Failed to stop:', error);
    return false;
  }
}

/**
 * Get all scheduled native alarms
 */
export async function getAllNativeAlarms(): Promise<any[]> {
  if (Platform.OS === 'web' || !getAllAlarms) {
    return [];
  }

  try {
    const alarms = await getAllAlarms();
    return alarms || [];
  } catch (error) {
    console.error('❌ [NATIVE-ALARM] Failed to get alarms:', error);
    return [];
  }
}

/**
 * Check if native alarm is available
 */
export function isNativeAlarmAvailable(): boolean {
  return Platform.OS !== 'web' && scheduleAlarm !== null;
}
