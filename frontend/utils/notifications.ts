import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notification to show and play sound
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Global audio player reference
let audioPlayer: any = null;
let isPlaying = false;

// Built-in alarm sounds
const BUILT_IN_SOUNDS: { [key: string]: string } = {
  default: 'https://assets.mixkit.co/active_storage/sfx/2869/2869.wav',
  bell: 'https://assets.mixkit.co/active_storage/sfx/2568/2568.wav',
  chime: 'https://assets.mixkit.co/active_storage/sfx/2571/2571.wav',
  alert: 'https://assets.mixkit.co/active_storage/sfx/2870/2870.wav',
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
  
  // Return true for web to allow continuing
  return true;
}

// Set up notification categories with actions (for native)
export async function setupNotificationCategories() {
  try {
    await Notifications.setNotificationCategoryAsync('alarm', [
      {
        identifier: 'stop',
        buttonTitle: 'STOP',
        options: {
          opensAppToForeground: true,
          isDestructive: true,
          isAuthenticationRequired: false,
        },
      },
      {
        identifier: 'snooze5',
        buttonTitle: 'Snooze 5min',
        options: {
          opensAppToForeground: false,
          isDestructive: false,
          isAuthenticationRequired: false,
        },
      },
    ]);
    console.log('✅ Notification categories set up');
  } catch (error) {
    console.log('⚠️ Notification categories setup skipped (web)');
  }
}

export async function cancelNotification(notificationId: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    await Notifications.dismissNotificationAsync(notificationId);
  } catch (error) {
    console.log('Error canceling notification:', error);
  }
}

export async function getAllScheduledNotifications() {
  return await Notifications.getAllScheduledNotificationsAsync();
}

// Play alarm sound with looping
export async function playAlarmSound(soundUrl: string = 'default') {
  try {
    // Stop any existing sound first
    await stopAlarmSound();

    // Get the sound URL
    const audioUrl = soundUrl.startsWith('http') 
      ? soundUrl 
      : BUILT_IN_SOUNDS[soundUrl] || BUILT_IN_SOUNDS.default;

    console.log('🔊 Playing alarm sound:', audioUrl);

    // Use expo-av for audio playback
    const { Audio } = await import('expo-av');
    
    // Set audio mode for alarm-like behavior
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
    });
    
    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUrl },
      { 
        shouldPlay: true,
        isLooping: true,
        volume: 1.0,
      }
    );

    audioPlayer = sound;
    isPlaying = true;
    
    console.log('✅ Alarm sound playing (looping)');
  } catch (error) {
    console.error('❌ Error playing alarm sound:', error);
    isPlaying = false;
  }
}

export async function stopAlarmSound() {
  try {
    if (audioPlayer) {
      await audioPlayer.stopAsync();
      await audioPlayer.unloadAsync();
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

// Get built-in sound list for UI
export function getBuiltInSounds() {
  return Object.keys(BUILT_IN_SOUNDS).map(key => ({
    label: key.charAt(0).toUpperCase() + key.slice(1),
    value: key,
    url: BUILT_IN_SOUNDS[key],
  }));
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
