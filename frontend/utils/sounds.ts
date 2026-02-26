/**
 * Sound management for Noregret app
 * Handles click sounds and ringtone options
 */

import { Platform } from 'react-native';

// Ringtone options for task reminders
export const RINGTONES = [
  {
    id: 'default',
    label: 'Default Alarm',
    url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869.wav',
  },
  {
    id: 'soft_bell',
    label: 'Soft Bell',
    url: 'https://assets.mixkit.co/active_storage/sfx/2568/2568.wav',
  },
  {
    id: 'digital_alarm',
    label: 'Digital Alarm',
    url: 'https://assets.mixkit.co/active_storage/sfx/2870/2870.wav',
  },
  {
    id: 'calm_chime',
    label: 'Calm Chime',
    url: 'https://assets.mixkit.co/active_storage/sfx/2571/2571.wav',
  },
  {
    id: 'nature_birds',
    label: 'Nature Birds',
    url: 'https://assets.mixkit.co/active_storage/sfx/2433/2433.wav',
  },
  {
    id: 'motivational',
    label: 'Motivational Tone',
    url: 'https://assets.mixkit.co/active_storage/sfx/2572/2572.wav',
  },
  {
    id: 'strong_alarm',
    label: 'Strong Wake-up',
    url: 'https://assets.mixkit.co/active_storage/sfx/2867/2867.wav',
  },
  {
    id: 'soft_piano',
    label: 'Soft Piano',
    url: 'https://assets.mixkit.co/active_storage/sfx/2515/2515.wav',
  },
  {
    id: 'gentle_wake',
    label: 'Gentle Wake',
    url: 'https://assets.mixkit.co/active_storage/sfx/2573/2573.wav',
  },
  {
    id: 'classic_bell',
    label: 'Classic Bell',
    url: 'https://assets.mixkit.co/active_storage/sfx/2574/2574.wav',
  },
];

// Click sound URL
const CLICK_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2568/2568.wav';

// Audio player for click sounds
let clickAudioPlayer: any = null;
let isClickSoundLoaded = false;

/**
 * Initialize click sound (preload for better performance)
 */
export async function initClickSound() {
  if (Platform.OS === 'web') {
    try {
      clickAudioPlayer = new Audio(CLICK_SOUND_URL);
      clickAudioPlayer.volume = 0.3;
      isClickSoundLoaded = true;
    } catch (error) {
      console.log('Click sound init failed:', error);
    }
  }
}

/**
 * Play click sound for UI interactions
 */
export async function playClickSound(enabled: boolean = true) {
  if (!enabled) return;
  
  try {
    if (Platform.OS === 'web') {
      if (!clickAudioPlayer) {
        await initClickSound();
      }
      if (clickAudioPlayer) {
        clickAudioPlayer.currentTime = 0;
        clickAudioPlayer.play().catch(() => {});
      }
    } else {
      // For native, use expo-av
      const { Audio } = await import('expo-av');
      const { sound } = await Audio.Sound.createAsync(
        { uri: CLICK_SOUND_URL },
        { shouldPlay: true, volume: 0.3 }
      );
      // Unload after playing
      setTimeout(() => sound.unloadAsync(), 1000);
    }
  } catch (error) {
    // Silently fail - click sounds are not critical
  }
}

/**
 * Get ringtone URL by ID
 */
export function getRingtoneUrl(ringtoneId: string): string {
  const ringtone = RINGTONES.find(r => r.id === ringtoneId);
  return ringtone?.url || RINGTONES[0].url;
}

/**
 * Get ringtone label by ID
 */
export function getRingtoneLabel(ringtoneId: string): string {
  const ringtone = RINGTONES.find(r => r.id === ringtoneId);
  return ringtone?.label || 'Default Alarm';
}
