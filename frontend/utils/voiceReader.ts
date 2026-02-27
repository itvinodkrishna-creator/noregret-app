/**
 * Voice Reading utility for Noregret app
 * Uses expo-speech for native and Web Speech API for web
 */

import { Platform } from 'react-native';

let isReading = false;
let readingInterval: NodeJS.Timeout | null = null;
let stopTime: number | null = null;
const MAX_READING_TIME = 5 * 60 * 1000; // 5 minutes max

// Web speech synthesis
let webSpeechSynthesis: SpeechSynthesis | null = null;

/**
 * Initialize speech
 */
export function initVoiceReader() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    webSpeechSynthesis = window.speechSynthesis;
  }
  console.log('🗣️ Voice reader initialized');
}

/**
 * Speak text once using appropriate API
 */
export async function speakText(text: string, rate: number = 1.0): Promise<void> {
  return new Promise(async (resolve) => {
    try {
      if (Platform.OS === 'web') {
        // Use Web Speech API for web
        if (!webSpeechSynthesis) {
          webSpeechSynthesis = window.speechSynthesis;
        }
        
        if (webSpeechSynthesis) {
          webSpeechSynthesis.cancel();
          
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = rate;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          utterance.lang = 'en-US';
          
          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          
          webSpeechSynthesis.speak(utterance);
          console.log('🗣️ Speaking (web):', text);
        } else {
          resolve();
        }
      } else {
        // Use expo-speech for native
        try {
          const Speech = await import('expo-speech');
          await Speech.stop();
          
          Speech.speak(text, {
            language: 'en-US',
            pitch: 1.0,
            rate: rate,
            volume: 1.0,
            onDone: () => resolve(),
            onError: () => resolve(),
          });
          console.log('🗣️ Speaking (native):', text);
        } catch (err) {
          console.log('Speech not available:', err);
          resolve();
        }
      }
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
    if (Platform.OS === 'web') {
      if (webSpeechSynthesis) {
        webSpeechSynthesis.cancel();
      }
    } else {
      const Speech = await import('expo-speech');
      await Speech.stop();
    }
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
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return 'speechSynthesis' in window;
  }
  return true; // expo-speech works on native
}

/**
 * Preview speak (for testing)
 */
export async function previewSpeak(text: string): Promise<void> {
  await speakText(text, 1.0);
}
