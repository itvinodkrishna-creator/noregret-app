/**
 * Voice Reading utility for Noregret app
 * Uses expo-speech for cross-platform text-to-speech
 */

import { Platform } from 'react-native';
import * as Speech from 'expo-speech';

let isReading = false;
let readingInterval: NodeJS.Timeout | null = null;
let stopTime: number | null = null;
const MAX_READING_TIME = 5 * 60 * 1000; // 5 minutes max

/**
 * Initialize speech (no-op for expo-speech)
 */
export function initVoiceReader() {
  console.log('🗣️ Voice reader initialized (expo-speech)');
}

/**
 * Speak text once
 */
export async function speakText(text: string, rate: number = 1.0): Promise<void> {
  return new Promise(async (resolve) => {
    try {
      // Check if speech is available
      const isAvailable = await Speech.isSpeakingAsync().catch(() => false);
      
      // Stop any ongoing speech
      await Speech.stop();
      
      // Speak the text
      Speech.speak(text, {
        language: 'en-US',
        pitch: 1.0,
        rate: rate,
        volume: 1.0,
        onDone: () => {
          resolve();
        },
        onError: (error) => {
          console.error('Speech error:', error);
          resolve();
        },
      });
      
      console.log('🗣️ Speaking:', text);
    } catch (error) {
      console.error('Voice reader error:', error);
      resolve();
    }
  });
}

/**
 * Start repeating voice reading until stopped (max 5 minutes)
 */
export function startRepeatingVoice(text: string, intervalMs: number = 8000) {
  isReading = true;
  stopTime = Date.now() + MAX_READING_TIME;
  console.log('🔁 Starting repeated voice reading (max 5 min)');

  // Speak immediately
  speakText(text);

  // Set up interval to repeat
  readingInterval = setInterval(() => {
    // Check if we've exceeded max time
    if (stopTime && Date.now() > stopTime) {
      console.log('⏰ Voice reading auto-stopped after 5 minutes');
      stopVoiceReading();
      return;
    }
    
    if (isReading) {
      speakText(text);
    }
  }, intervalMs);
}

/**
 * Stop voice reading
 */
export async function stopVoiceReading() {
  isReading = false;
  stopTime = null;

  if (readingInterval) {
    clearInterval(readingInterval);
    readingInterval = null;
  }

  try {
    await Speech.stop();
  } catch (error) {
    // Ignore errors
  }

  console.log('🛑 Voice reading stopped');
}

/**
 * Check if voice reading is active
 */
export function isVoiceReading(): boolean {
  return isReading;
}

/**
 * Check if speech synthesis is supported
 */
export function isSpeechSupported(): boolean {
  return true; // expo-speech works on all platforms
}

/**
 * Preview speak (for testing ringtone selection)
 */
export async function previewSpeak(text: string): Promise<void> {
  try {
    await Speech.stop();
    Speech.speak(text, {
      language: 'en-US',
      pitch: 1.0,
      rate: 1.0,
      volume: 1.0,
    });
  } catch (error) {
    console.error('Preview speak error:', error);
  }
}
