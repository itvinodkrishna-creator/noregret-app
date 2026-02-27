/**
 * Voice Reading utility for Noregret app
 * Uses Web Speech API for text-to-speech
 */

import { Platform } from 'react-native';

let speechSynthesis: SpeechSynthesis | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let isReading = false;
let readingInterval: NodeJS.Timeout | null = null;

/**
 * Initialize speech synthesis
 */
export function initVoiceReader() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    speechSynthesis = window.speechSynthesis;
    console.log('🗣️ Voice reader initialized');
  }
}

/**
 * Speak text once
 */
export function speakText(text: string, rate: number = 1.0): Promise<void> {
  return new Promise((resolve, reject) => {
    if (Platform.OS !== 'web' || !speechSynthesis) {
      console.log('⚠️ Speech synthesis not available');
      resolve();
      return;
    }

    try {
      // Cancel any ongoing speech
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = 'en-US';

      utterance.onend = () => {
        resolve();
      };

      utterance.onerror = (event) => {
        console.error('Speech error:', event);
        resolve(); // Resolve anyway to not block
      };

      currentUtterance = utterance;
      speechSynthesis.speak(utterance);
      console.log('🗣️ Speaking:', text);
    } catch (error) {
      console.error('Voice reader error:', error);
      resolve();
    }
  });
}

/**
 * Start repeating voice reading until stopped
 */
export function startRepeatingVoice(text: string, intervalMs: number = 5000) {
  if (Platform.OS !== 'web' || !speechSynthesis) {
    console.log('⚠️ Speech synthesis not available');
    return;
  }

  isReading = true;
  console.log('🔁 Starting repeated voice reading');

  // Speak immediately
  speakText(text);

  // Set up interval to repeat
  readingInterval = setInterval(() => {
    if (isReading) {
      speakText(text);
    }
  }, intervalMs);
}

/**
 * Stop voice reading
 */
export function stopVoiceReading() {
  isReading = false;

  if (readingInterval) {
    clearInterval(readingInterval);
    readingInterval = null;
  }

  if (Platform.OS === 'web' && speechSynthesis) {
    speechSynthesis.cancel();
  }

  currentUtterance = null;
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
  return false;
}
