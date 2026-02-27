/**
 * Voice Reading utility for Noregret app
 * Uses Web Speech API on all platforms for maximum compatibility
 */

import { Platform } from 'react-native';

let isReading = false;
let readingInterval: NodeJS.Timeout | null = null;
let stopTime: number | null = null;
const MAX_READING_TIME = 5 * 60 * 1000; // 5 minutes max

// Web speech synthesis reference
let speechSynthesis: any = null;

/**
 * Initialize speech
 */
export function initVoiceReader() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    speechSynthesis = window.speechSynthesis;
  }
  console.log('🗣️ Voice reader initialized');
}

/**
 * Speak text once
 */
export async function speakText(text: string, rate: number = 1.0): Promise<void> {
  return new Promise((resolve) => {
    try {
      // Initialize if needed
      if (!speechSynthesis && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        speechSynthesis = window.speechSynthesis;
      }
      
      if (speechSynthesis) {
        // Cancel any ongoing speech
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = rate;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        utterance.lang = 'en-US';
        
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        
        speechSynthesis.speak(utterance);
        console.log('🗣️ Speaking:', text);
      } else {
        console.log('⚠️ Speech synthesis not available');
        resolve();
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
    if (speechSynthesis) {
      speechSynthesis.cancel();
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
  if (typeof window !== 'undefined') {
    return 'speechSynthesis' in window;
  }
  return false;
}

/**
 * Preview speak (for testing)
 */
export async function previewSpeak(text: string): Promise<void> {
  await speakText(text, 1.0);
}
