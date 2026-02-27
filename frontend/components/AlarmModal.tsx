import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, Vibration, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { startRepeatingVoice, stopVoiceReading, isSpeechSupported } from '../utils/voiceReader';

const { width, height } = Dimensions.get('window');

interface AlarmModalProps {
  visible: boolean;
  taskTitle: string;
  taskDescription?: string;
  voiceReadingEnabled?: boolean;
  onDismiss: () => void;
  onSnooze: (minutes: number) => void;
}

export const AlarmModal: React.FC<AlarmModalProps> = ({
  visible,
  taskTitle,
  taskDescription,
  voiceReadingEnabled = false,
  onDismiss,
  onSnooze,
}) => {
  const currentTime = format(new Date(), 'h:mm a');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bellAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
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

      // Start voice reading if enabled
      if (voiceReadingEnabled && isSpeechSupported()) {
        const announcement = `Reminder: ${taskTitle}`;
        startRepeatingVoice(announcement, 8000); // Repeat every 8 seconds
      }
    } else {
      // Stop vibration when dismissed
      Vibration.cancel();
      // Stop voice reading
      stopVoiceReading();
      // Reset animations
      pulseAnim.setValue(1);
      bellAnim.setValue(0);
    }

    return () => {
      Vibration.cancel();
      stopVoiceReading();
    };
  }, [visible, taskTitle, voiceReadingEnabled]);

  const handleDismiss = () => {
    stopVoiceReading();
    Vibration.cancel();
    onDismiss();
  };

  const handleSnooze = (minutes: number) => {
    stopVoiceReading();
    Vibration.cancel();
    onSnooze(minutes);
  };

  if (!visible) return null;

  const bellRotate = bellAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-15deg', '0deg', '15deg'],
  });

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      presentationStyle="fullScreen"
      onRequestClose={handleDismiss}
    >
      <View style={styles.fullScreen}>
        {/* Background with animated gradient effect */}
        <View style={styles.background}>
          <View style={[styles.gradientCircle, styles.circle1]} />
          <View style={[styles.gradientCircle, styles.circle2]} />
          <View style={[styles.gradientCircle, styles.circle3]} />
        </View>

        {/* Main content */}
        <View style={styles.content}>
          {/* Alarm icon with pulsing and shaking animation */}
          <View style={styles.iconContainer}>
            <Animated.View 
              style={[
                styles.pulseCircle,
                { transform: [{ scale: pulseAnim }] }
              ]} 
            />
            <Animated.View style={{ transform: [{ rotate: bellRotate }] }}>
              <Ionicons name="alarm" size={100} color="#EF4444" />
            </Animated.View>
          </View>

          {/* Time - Smaller font */}
          <Text style={styles.time}>{currentTime}</Text>

          {/* Task title - BIGGER, BOLD, YELLOW, CENTERED */}
          <Text style={styles.title} numberOfLines={3}>{taskTitle}</Text>

          {/* Task description */}
          {taskDescription && (
            <Text style={styles.description}>{taskDescription}</Text>
          )}

          {/* Voice indicator */}
          {voiceReadingEnabled && (
            <View style={styles.voiceIndicator}>
              <Ionicons name="mic" size={20} color="#10B981" />
              <Text style={styles.voiceText}>Voice Reading Active</Text>
            </View>
          )}

          {/* Alarm indicator */}
          <View style={styles.alarmIndicator}>
            <Ionicons name="volume-high" size={24} color="#EF4444" />
            <Text style={styles.alarmText}>Alarm Ringing...</Text>
          </View>

          {/* Action buttons */}
          <View style={styles.actions}>
            {/* Snooze options */}
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

            {/* STOP button - Big and prominent */}
            <TouchableOpacity
              style={styles.stopButton}
              onPress={handleDismiss}
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
    fontSize: 42,
    fontWeight: 'bold',
    color: '#F59E0B',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 52,
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
    marginBottom: 36,
  },
  alarmText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
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
});
