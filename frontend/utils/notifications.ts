import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';

// Configure notification behavior for alarm-style
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

// Global sound object
let alarmSound: Audio.Sound | null = null;
let isPlaying = false;

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    // Create high-priority notification channel for alarms
    await Notifications.setNotificationChannelAsync('alarm', {
      name: 'Task Alarms',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
      bypassDnd: true, // Bypass Do Not Disturb
      showBadge: true,
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
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ TASK REMINDER',
        body: title,
        data: { 
          taskId, 
          action: 'alarm',
          taskTitle: title,
          alarmTime: time.toISOString(),
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 250, 250, 250],
        badge: 1,
        // Full screen intent (Android)
        ...(Platform.OS === 'android' && {
          androidMode: Notifications.AndroidNotificationVisibility.PUBLIC,
          sticky: true,
        }),
      },
      trigger: {
        date: time,
        channelId: 'alarm',
      },
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    throw error;
  }
}

export async function cancelNotification(notificationId: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
}

export async function snoozeNotification(
  taskId: string,
  title: string,
  minutes: number
): Promise<string> {
  const snoozeTime = new Date(Date.now() + minutes * 60 * 1000);
  return scheduleTaskNotification(taskId, title, snoozeTime);
}

export async function getAllScheduledNotifications() {
  return await Notifications.getAllScheduledNotificationsAsync();
}

// Load and play alarm sound (looping)
export async function playAlarmSound(soundFile: string = 'default') {
  try {
    // Stop any currently playing sound
    await stopAlarmSound();

    // Configure audio mode for alarms
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true, // Play even in silent mode
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });

    // Create sound with looping
    const soundSource = soundFile === 'default'
      ? require('../assets/sounds/alarm.mp3')
      : { uri: soundFile };

    const { sound } = await Audio.Sound.createAsync(
      soundSource,
      {
        shouldPlay: true,
        isLooping: true, // Loop continuously
        volume: 1.0,
        isMuted: false,
      }
    );
    
    alarmSound = sound;
    isPlaying = true;
    
    // Start playing
    await sound.playAsync();
    
    console.log('Alarm sound started playing');
  } catch (error) {
    console.error('Error playing alarm sound:', error);
  }
}

// Stop alarm sound
export async function stopAlarmSound() {
  try {
    if (alarmSound) {
      await alarmSound.stopAsync();
      await alarmSound.unloadAsync();
      alarmSound = null;
      isPlaying = false;
      console.log('Alarm sound stopped');
    }
  } catch (error) {
    console.error('Error stopping alarm sound:', error);
  }
}

// Check if alarm is currently playing
export function isAlarmPlaying(): boolean {
  return isPlaying;
}

// Set up notification listeners
export function setupNotificationListeners(
  onAlarmTrigger: (taskId: string, title: string) => void
) {
  // Handle notification received while app is in foreground
  const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
    const data = notification.request.content.data;
    if (data.action === 'alarm') {
      console.log('Alarm notification received:', data);
      // Play alarm sound
      playAlarmSound();
      // Show full-screen modal
      onAlarmTrigger(data.taskId as string, data.taskTitle as string);
    }
  });

  // Handle notification response (user tapped notification)
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    if (data.action === 'alarm') {
      console.log('Alarm notification tapped:', data);
      // Play alarm sound
      playAlarmSound();
      // Show full-screen modal
      onAlarmTrigger(data.taskId as string, data.taskTitle as string);
    }
  });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

// Request exact alarm permissions (Android 12+)
export async function requestExactAlarmPermission() {
  if (Platform.OS === 'android' && Platform.Version >= 31) {
    try {
      // Note: This requires native module for Android 12+
      // For Expo, this is limited
      console.log('Exact alarm permission needed for Android 12+');
      return true;
    } catch (error) {
      console.error('Error requesting exact alarm permission:', error);
      return false;
    }
  }
  return true;
}
