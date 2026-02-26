import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
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
      alert('Failed to get push notification permissions!');
      return;
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
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
        title: '⏰ Task Reminder',
        body: title,
        data: { taskId, action: 'reminder' },
        sound: sound === 'default' ? 'default' : sound,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        date: time,
        channelId: 'default',
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

// Play custom ringtone
let soundObject: Audio.Sound | null = null;

export async function playRingtone(soundFile: string = 'default') {
  try {
    // Stop any currently playing sound
    if (soundObject) {
      await soundObject.stopAsync();
      await soundObject.unloadAsync();
    }

    // Create and play new sound
    const { sound } = await Audio.Sound.createAsync(
      soundFile === 'default' 
        ? require('../assets/sounds/notification.mp3')
        : { uri: soundFile },
      { shouldPlay: true, isLooping: true, volume: 1.0 }
    );
    
    soundObject = sound;
    await sound.playAsync();
  } catch (error) {
    console.error('Error playing ringtone:', error);
  }
}

export async function stopRingtone() {
  try {
    if (soundObject) {
      await soundObject.stopAsync();
      await soundObject.unloadAsync();
      soundObject = null;
    }
  } catch (error) {
    console.error('Error stopping ringtone:', error);
  }
}
