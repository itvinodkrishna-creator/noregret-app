import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { AudioPlayer, useAudioPlayer } from 'expo-audio';

// Configure notification to show and play sound
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Global audio player
let audioPlayer: AudioPlayer | null = null;
let isPlaying = false;

// Built-in alarm sounds (we'll use beep sounds that work)
const BUILT_IN_SOUNDS = {
  default: 'https://assets.mixkit.co/active_storage/sfx/2869/2869.wav', // Alarm beep
  bell: 'https://assets.mixkit.co/active_storage/sfx/2568/2568.wav', // Bell
  chime: 'https://assets.mixkit.co/active_storage/sfx/2571/2571.wav', // Chime  
  alert: 'https://assets.mixkit.co/active_storage/sfx/2870/2870.wav', // Alert beep
};

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('alarm', {
      name: 'Task Alarms',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
      bypassDnd: true,
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      return false;
    }
    
    return true;
  }
  
  return false;
}

export async function scheduleTaskNotification(
  taskId: string,
  title: string,
  time: Date,
  sound: string = 'default'
): Promise<string> {
  try {
    // Schedule persistent notification with action buttons
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ ALARM - TASK REMINDER',
        body: `🔔 ${title}\n\nTap to open alarm`,
        data: { 
          taskId, 
          action: 'alarm',
          taskTitle: title,
          soundUrl: sound,
          alarmTime: time.toISOString(),
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 500, 200, 500, 200, 500, 200, 500],
        badge: 1,
        autoDismiss: false, // Don't auto-dismiss
        sticky: true,
        ...(Platform.OS === 'android' && {
          androidMode: Notifications.AndroidNotificationVisibility.PUBLIC,
        }),
        // Add action buttons for Android
        categoryIdentifier: 'alarm',
      },
      trigger: {
        date: time,
        channelId: 'alarm',
        repeats: false,
      },
    });

    console.log(`✅ Alarm scheduled for ${time.toISOString()}, ID: ${notificationId}`);
    return notificationId;
  } catch (error) {
    console.error('❌ Error scheduling notification:', error);
    throw error;
  }
}

// Set up notification categories with actions
export async function setupNotificationCategories() {
  try {
    // Set up actions for the notification
    await Notifications.setNotificationCategoryAsync('alarm', [
      {
        identifier: 'stop',
        buttonTitle: '🛑 STOP',
        options: {
          opensAppToForeground: true,
          isDestructive: true,
          isAuthenticationRequired: false,
        },
      },
      {
        identifier: 'snooze5',
        buttonTitle: '⏰ Snooze 5min',
        options: {
          opensAppToForeground: false,
          isDestructive: false,
          isAuthenticationRequired: false,
        },
      },
      {
        identifier: 'snooze10',
        buttonTitle: '⏰ Snooze 10min',
        options: {
          opensAppToForeground: false,
          isDestructive: false,
          isAuthenticationRequired: false,
        },
      },
    ]);
    
    console.log('✅ Notification action buttons configured');
  } catch (error) {
    console.error('Error setting up notification categories:', error);
  }
}

export async function cancelNotification(notificationId: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    await Notifications.dismissNotificationAsync(notificationId);
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
}

export async function snoozeNotification(
  taskId: string,
  title: string,
  minutes: number,
  soundUrl?: string
): Promise<string> {
  const snoozeTime = new Date(Date.now() + minutes * 60 * 1000);
  return scheduleTaskNotification(taskId, title, snoozeTime, soundUrl || 'default');
}

export async function getAllScheduledNotifications() {
  return await Notifications.getAllScheduledNotificationsAsync();
}

// Play alarm sound with looping
export async function playAlarmSound(soundUrl: string = 'default') {
  try {
    await stopAlarmSound();

    // Get the sound URL
    const audioUrl = soundUrl.startsWith('http') 
      ? soundUrl 
      : BUILT_IN_SOUNDS[soundUrl as keyof typeof BUILT_IN_SOUNDS] || BUILT_IN_SOUNDS.default;

    console.log('🔊 Playing alarm sound:', audioUrl);

    // Use expo-audio correctly
    const { useAudioPlayer } = await import('expo-audio');
    
    // For now, we'll use a simpler approach - play via Audio component
    // This works better cross-platform
    const { Audio } = await import('expo-av');
    
    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUrl },
      { 
        shouldPlay: true,
        isLooping: true,
        volume: 1.0,
      },
      null,
      false
    );

    audioPlayer = sound as any;
    isPlaying = true;
    
    console.log('✅ Alarm sound playing (looping)');
  } catch (error) {
    console.error('❌ Error playing alarm sound:', error);
    // Fallback - at least log that we tried
    isPlaying = false;
  }
}

export async function stopAlarmSound() {
  try {
    if (audioPlayer) {
      await (audioPlayer as any).stopAsync();
      await (audioPlayer as any).unloadAsync();
      audioPlayer = null;
      isPlaying = false;
      console.log('✅ Alarm sound stopped');
    }
  } catch (error) {
    console.error('Error stopping alarm sound:', error);
    audioPlayer = null;
    isPlaying = false;
  }
}

export function isAlarmPlaying(): boolean {
  return isPlaying;
}

// Set up notification listeners with sound playback
export function setupNotificationListeners(
  onAlarmTrigger: (taskId: string, title: string, soundUrl?: string) => void
) {
  // Handle notification received (app in foreground)
  const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
    const data = notification.request.content.data;
    if (data.action === 'alarm') {
      console.log('🔔 Alarm notification received (foreground)');
      const soundUrl = data.soundUrl as string || 'default';
      playAlarmSound(soundUrl);
      onAlarmTrigger(data.taskId as string, data.taskTitle as string, soundUrl);
    }
  });

  // Handle notification tapped (app in background/closed)
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(async response => {
    const data = response.notification.request.content.data;
    const actionIdentifier = response.actionIdentifier;

    if (data.action === 'alarm') {
      console.log('👆 Alarm notification tapped:', actionIdentifier);
      
      if (actionIdentifier === 'stop' || actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        const soundUrl = data.soundUrl as string || 'default';
        playAlarmSound(soundUrl);
        onAlarmTrigger(data.taskId as string, data.taskTitle as string, soundUrl);
      } else if (actionIdentifier === 'wait') {
        // Snooze for 5 minutes
        await snoozeNotification(data.taskId as string, data.taskTitle as string, 5, data.soundUrl as string);
      }
    }
  });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

export async function requestExactAlarmPermission() {
  if (Platform.OS === 'android' && Platform.Version >= 31) {
    try {
      console.log('ℹ️ Exact alarm permission needed for Android 12+');
      return true;
    } catch (error) {
      console.error('Error requesting exact alarm permission:', error);
      return false;
    }
  }
  return true;
}

// Get built-in sound URLs
export function getBuiltInSounds() {
  return Object.keys(BUILT_IN_SOUNDS).map(key => ({
    label: key.charAt(0).toUpperCase() + key.slice(1),
    value: key,
    url: BUILT_IN_SOUNDS[key as keyof typeof BUILT_IN_SOUNDS],
  }));
}
