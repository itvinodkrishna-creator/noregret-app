import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, Vibration, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, addMinutes, addHours, addDays } from 'date-fns';
import { startRepeatingVoice, stopVoiceReading, isSpeechSupported } from '../utils/voiceReader';
import { Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');

const AUTO_STOP_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

interface AlarmModalProps {
  visible: boolean;
  taskTitle: string;
  taskDescription?: string;
  taskId: string;
  voiceReadingEnabled?: boolean;
  voiceUri?: string; // Recorded voice to play
  onDismiss: () => void;
  onSnooze: (minutes: number) => void;
  onMarkDone: () => void;
  onMarkAttempted: () => void;
  onReschedule: (newTime: Date) => void;
  onKeepPending: () => void;
  onAutoStop?: () => void;
}

type ScreenState = 'alarm' | 'completion' | 'reschedule';

export const AlarmModal: React.FC<AlarmModalProps> = ({
  visible,
  taskTitle,
  taskDescription,
  taskId,
  voiceReadingEnabled = false,
  voiceUri,
  onDismiss,
  onSnooze,
  onMarkDone,
  onMarkAttempted,
  onReschedule,
  onKeepPending,
  onAutoStop,
}) => {
  const [screen, setScreen] = useState<ScreenState>('alarm');
  const [timeRemaining, setTimeRemaining] = useState(AUTO_STOP_TIME);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const currentTime = format(new Date(), 'h:mm a');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bellAnim = useRef(new Animated.Value(0)).current;
  const autoStopTimerRef = useRef<any>(null);
  const countdownRef = useRef<any>(null);
  const voiceSoundRef = useRef<Audio.Sound | null>(null);
  const voiceLoopTimerRef = useRef<any>(null);

  // Play recorded voice in a loop
  const playRecordedVoice = async () => {
    if (!voiceUri) return;
    
    try {
      console.log('🎤 Playing recorded voice:', voiceUri);
      
      // Unload previous sound if exists
      if (voiceSoundRef.current) {
        await voiceSoundRef.current.unloadAsync();
      }
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: voiceUri },
        { shouldPlay: true, volume: 1.0 }
      );
      
      voiceSoundRef.current = sound;
      setIsPlayingVoice(true);
      
      // Set up playback status listener for looping
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          // Replay the voice recording
          sound.replayAsync();
        }
      });
      
      await sound.playAsync();
      console.log('✅ Voice recording started playing');
    } catch (error) {
      console.error('❌ Error playing voice recording:', error);
    }
  };
  
  // Stop recorded voice
  const stopRecordedVoice = async () => {
    try {
      if (voiceSoundRef.current) {
        await voiceSoundRef.current.stopAsync();
        await voiceSoundRef.current.unloadAsync();
        voiceSoundRef.current = null;
      }
      if (voiceLoopTimerRef.current) {
        clearInterval(voiceLoopTimerRef.current);
        voiceLoopTimerRef.current = null;
      }
      setIsPlayingVoice(false);
      console.log('🛑 Voice recording stopped');
    } catch (error) {
      console.error('❌ Error stopping voice recording:', error);
    }
  };

  useEffect(() => {
    if (visible) {
      setScreen('alarm');
      setTimeRemaining(AUTO_STOP_TIME);
      
      // Start vibration pattern when alarm shows
      const vibrationPattern = [0, 500, 200, 500];
      Vibration.vibrate(vibrationPattern, true); // Repeat

      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Start bell shake animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(bellAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(bellAnim, {
            toValue: -1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(bellAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Play recorded voice OR TTS
      if (voiceUri) {
        // If we have a recorded voice, play that in loop
        playRecordedVoice();
      } else if (voiceReadingEnabled && isSpeechSupported()) {
        // Otherwise use TTS
        const announcement = `Reminder: ${taskTitle}`;
        startRepeatingVoice(announcement, 8000);
      }

      // Auto-stop timer after 5 minutes
      autoStopTimerRef.current = setTimeout(() => {
        console.log('⏰ Alarm auto-stopped after 5 minutes');
        handleAutoStop();
      }, AUTO_STOP_TIME);

      // Countdown timer for display
      countdownRef.current = setInterval(() => {
        setTimeRemaining(prev => Math.max(0, prev - 1000));
      }, 1000);

    } else {
      // Stop vibration when dismissed
      Vibration.cancel();
      stopVoiceReading();
      stopRecordedVoice();
      pulseAnim.setValue(1);
      bellAnim.setValue(0);
      
      // Clear timers
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = null;
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }

    return () => {
      Vibration.cancel();
      stopVoiceReading();
      stopRecordedVoice();
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [visible, taskTitle, voiceReadingEnabled, voiceUri]);

  const handleAutoStop = () => {
    stopVoiceReading();
    stopRecordedVoice();
    Vibration.cancel();
    if (onAutoStop) {
      onAutoStop();
    }
    // Mark as missed after auto-stop
    onDismiss();
  };

  const handleStop = () => {
    stopVoiceReading();
    stopRecordedVoice();
    Vibration.cancel();
    // Clear auto-stop timer
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    setScreen('completion');
  };

  const handleYes = () => {
    onMarkDone();
    onDismiss();
  };

  const handleNo = () => {
    setScreen('reschedule');
  };

  const handleAttempted = () => {
    onMarkAttempted();
    onDismiss();
  };

  const handleKeepPending = () => {
    onKeepPending();
    onDismiss();
  };

  const handleSnooze = (minutes: number) => {
    stopVoiceReading();
    Vibration.cancel();
    // Clear auto-stop timer
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    onSnooze(minutes);
  };

  const handleRescheduleOption = (option: string) => {
    const now = new Date();
    let newTime: Date;
    
    switch (option) {
      case '30min':
        newTime = addMinutes(now, 30);
        break;
      case '1hour':
        newTime = addHours(now, 1);
        break;
      case '3hours':
        newTime = addHours(now, 3);
        break;
      case 'tomorrow':
        newTime = addDays(now, 1);
        newTime.setHours(9, 0, 0, 0);
        break;
      default:
        newTime = addHours(now, 1);
    }
    
    onReschedule(newTime);
    onDismiss();
  };

  if (!visible) return null;

  const bellRotate = bellAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-15deg', '0deg', '15deg'],
  });

  // Format countdown time
  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);
  const countdownText = `Auto-stop in ${minutes}:${seconds.toString().padStart(2, '0')}`;

  // Alarm Screen
  if (screen === 'alarm') {
    return (
      <Modal
        visible={visible}
        animationType="fade"
        transparent={false}
        statusBarTranslucent
        presentationStyle="fullScreen"
        onRequestClose={handleStop}
      >
        <View style={styles.fullScreen}>
          <View style={styles.background}>
            <View style={[styles.gradientCircle, styles.circle1]} />
            <View style={[styles.gradientCircle, styles.circle2]} />
            <View style={[styles.gradientCircle, styles.circle3]} />
          </View>

          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Animated.View 
                style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]} 
              />
              <Animated.View style={{ transform: [{ rotate: bellRotate }] }}>
                <Ionicons name="alarm" size={100} color="#EF4444" />
              </Animated.View>
            </View>

            <Text style={styles.time}>{currentTime}</Text>
            <Text style={styles.title} numberOfLines={3}>{taskTitle}</Text>

            {taskDescription && (
              <Text style={styles.description}>{taskDescription}</Text>
            )}

            {voiceReadingEnabled && (
              <View style={styles.voiceIndicator}>
                <Ionicons name="mic" size={20} color="#10B981" />
                <Text style={styles.voiceText}>Voice Reading Active</Text>
              </View>
            )}

            <View style={styles.alarmIndicator}>
              <Ionicons name="volume-high" size={24} color="#EF4444" />
              <Text style={styles.alarmText}>Alarm Ringing...</Text>
            </View>

            {/* Auto-stop countdown */}
            <Text style={styles.countdownText}>{countdownText}</Text>

            <View style={styles.actions}>
              <View style={styles.snoozeContainer}>
                <Text style={styles.snoozeLabel}>SNOOZE</Text>
                <View style={styles.snoozeButtons}>
                  <TouchableOpacity
                    style={styles.snoozeButton}
                    onPress={() => handleSnooze(5)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.snoozeButtonText}>5 min</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.snoozeButton}
                    onPress={() => handleSnooze(10)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.snoozeButtonText}>10 min</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.snoozeButton}
                    onPress={() => handleSnooze(15)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.snoozeButtonText}>15 min</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.stopButton}
                onPress={handleStop}
                activeOpacity={0.8}
              >
                <Ionicons name="stop-circle" size={32} color="#FFFFFF" />
                <Text style={styles.stopText}>STOP</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Completion Question Screen
  if (screen === 'completion') {
    return (
      <Modal
        visible={visible}
        animationType="fade"
        transparent={false}
        statusBarTranslucent
        presentationStyle="fullScreen"
      >
        <View style={styles.fullScreen}>
          <View style={[styles.background, { backgroundColor: '#0F172A' }]}>
            <View style={[styles.gradientCircle, styles.circle1, { backgroundColor: '#10B981' }]} />
            <View style={[styles.gradientCircle, styles.circle2, { backgroundColor: '#3B82F6' }]} />
          </View>

          <View style={styles.content}>
            <View style={styles.questionIconContainer}>
              <Ionicons name="help-circle" size={80} color="#F59E0B" />
            </View>

            <Text style={styles.questionTitle}>Did you complete this task?</Text>
            <Text style={styles.taskNameDisplay}>{taskTitle}</Text>

            <View style={styles.completionButtons}>
              <TouchableOpacity
                style={styles.yesButton}
                onPress={handleYes}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={28} color="#FFFFFF" />
                <Text style={styles.yesButtonText}>Yes, Done!</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.noButton}
                onPress={handleNo}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle" size={28} color="#FFFFFF" />
                <Text style={styles.noButtonText}>No</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Reschedule / Options Screen
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      presentationStyle="fullScreen"
    >
      <View style={styles.fullScreen}>
        <View style={[styles.background, { backgroundColor: '#0F172A' }]}>
          <View style={[styles.gradientCircle, styles.circle1, { backgroundColor: '#8B5CF6' }]} />
          <View style={[styles.gradientCircle, styles.circle2, { backgroundColor: '#EC4899' }]} />
        </View>

        <View style={styles.content}>
          <Text style={styles.optionsTitle}>What would you like to do?</Text>
          <Text style={styles.taskNameSmall}>{taskTitle}</Text>

          <View style={styles.optionsContainer}>
            {/* Snooze Options */}
            <Text style={styles.optionSectionTitle}>Snooze & Try Again</Text>
            <View style={styles.rescheduleOptions}>
              <TouchableOpacity
                style={styles.rescheduleButton}
                onPress={() => handleSnooze(5)}
              >
                <Ionicons name="alarm-outline" size={20} color="#F59E0B" />
                <Text style={styles.rescheduleText}>5 min</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rescheduleButton}
                onPress={() => handleSnooze(10)}
              >
                <Ionicons name="alarm-outline" size={20} color="#F59E0B" />
                <Text style={styles.rescheduleText}>10 min</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rescheduleButton}
                onPress={() => handleSnooze(15)}
              >
                <Ionicons name="alarm-outline" size={20} color="#F59E0B" />
                <Text style={styles.rescheduleText}>15 min</Text>
              </TouchableOpacity>
            </View>

            {/* Reschedule Options */}
            <Text style={[styles.optionSectionTitle, { marginTop: 20 }]}>Reschedule</Text>
            <View style={styles.rescheduleOptions}>
              <TouchableOpacity
                style={styles.rescheduleButton}
                onPress={() => handleRescheduleOption('30min')}
              >
                <Ionicons name="time-outline" size={20} color="#8B5CF6" />
                <Text style={styles.rescheduleText}>30 min</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rescheduleButton}
                onPress={() => handleRescheduleOption('1hour')}
              >
                <Ionicons name="time-outline" size={20} color="#8B5CF6" />
                <Text style={styles.rescheduleText}>1 hour</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rescheduleButton}
                onPress={() => handleRescheduleOption('3hours')}
              >
                <Ionicons name="time-outline" size={20} color="#8B5CF6" />
                <Text style={styles.rescheduleText}>3 hours</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rescheduleButton}
                onPress={() => handleRescheduleOption('tomorrow')}
              >
                <Ionicons name="calendar-outline" size={20} color="#8B5CF6" />
                <Text style={styles.rescheduleText}>Tomorrow</Text>
              </TouchableOpacity>
            </View>

            {/* Other Options */}
            <Text style={[styles.optionSectionTitle, { marginTop: 24 }]}>Or</Text>
            
            <TouchableOpacity
              style={styles.attemptedButton}
              onPress={handleAttempted}
            >
              <Ionicons name="checkmark-done" size={24} color="#3B82F6" />
              <View style={styles.attemptedTextContainer}>
                <Text style={styles.attemptedButtonTitle}>Mark as Attempted</Text>
                <Text style={styles.attemptedButtonSubtitle}>I tried but couldn't complete</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.keepPendingButton}
              onPress={handleKeepPending}
            >
              <Ionicons name="hourglass-outline" size={24} color="#F59E0B" />
              <View style={styles.attemptedTextContainer}>
                <Text style={styles.keepPendingTitle}>Keep in Pending</Text>
                <Text style={styles.keepPendingSubtitle}>I'll do it later today</Text>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setScreen('completion')}
          >
            <Ionicons name="arrow-back" size={20} color="#A0A0A0" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  gradientCircle: {
    position: 'absolute',
    borderRadius: 9999,
  },
  circle1: {
    width: 350,
    height: 350,
    backgroundColor: '#EF4444',
    opacity: 0.25,
    top: -120,
    right: -100,
  },
  circle2: {
    width: 450,
    height: 450,
    backgroundColor: '#F59E0B',
    opacity: 0.2,
    bottom: -180,
    left: -150,
  },
  circle3: {
    width: 200,
    height: 200,
    backgroundColor: '#EF4444',
    opacity: 0.15,
    top: '40%',
    left: -50,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCircle: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#EF4444',
    opacity: 0.25,
  },
  time: {
    fontSize: 20,
    fontWeight: '500',
    color: '#808080',
    marginBottom: 12,
    letterSpacing: 1,
  },
  title: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#F59E0B',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 48,
    paddingHorizontal: 16,
  },
  description: {
    fontSize: 16,
    color: '#A0A0A0',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  voiceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  voiceText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  alarmIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 12,
  },
  alarmText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  countdownText: {
    fontSize: 14,
    color: '#808080',
    marginBottom: 24,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
  },
  snoozeContainer: {
    width: '100%',
    marginBottom: 20,
  },
  snoozeLabel: {
    fontSize: 14,
    color: '#707070',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 2,
    fontWeight: '600',
  },
  snoozeButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  snoozeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  snoozeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 60,
    paddingVertical: 22,
    borderRadius: 18,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  stopText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 12,
    letterSpacing: 2,
  },
  // Completion Screen Styles
  questionIconContainer: {
    marginBottom: 24,
  },
  questionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  taskNameDisplay: {
    fontSize: 24,
    fontWeight: '600',
    color: '#F59E0B',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  completionButtons: {
    width: '100%',
    gap: 16,
    maxWidth: 320,
  },
  yesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 20,
    borderRadius: 16,
    gap: 12,
  },
  yesButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  noButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 20,
    borderRadius: 16,
    gap: 12,
  },
  noButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  // Reschedule Screen Styles
  optionsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  taskNameSmall: {
    fontSize: 16,
    color: '#A0A0A0',
    textAlign: 'center',
    marginBottom: 32,
  },
  optionsContainer: {
    width: '100%',
    maxWidth: 340,
  },
  optionSectionTitle: {
    fontSize: 14,
    color: '#707070',
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 12,
    fontWeight: '600',
  },
  rescheduleOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  rescheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    gap: 8,
  },
  rescheduleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  attemptedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    gap: 12,
    marginTop: 12,
  },
  attemptedTextContainer: {
    flex: 1,
  },
  attemptedButtonTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  attemptedButtonSubtitle: {
    color: '#707070',
    fontSize: 12,
    marginTop: 2,
  },
  keepPendingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    gap: 12,
    marginTop: 12,
  },
  keepPendingTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  keepPendingSubtitle: {
    color: '#707070',
    fontSize: 12,
    marginTop: 2,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
    gap: 8,
  },
  backButtonText: {
    color: '#A0A0A0',
    fontSize: 16,
  },
});
