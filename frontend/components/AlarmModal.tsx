import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, Vibration } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { format } from 'date-fns';

const { width, height } = Dimensions.get('window');

interface AlarmModalProps {
  visible: boolean;
  taskTitle: string;
  taskDescription?: string;
  onDismiss: () => void;
  onSnooze: (minutes: number) => void;
}

export const AlarmModal: React.FC<AlarmModalProps> = ({
  visible,
  taskTitle,
  taskDescription,
  onDismiss,
  onSnooze,
}) => {
  const currentTime = format(new Date(), 'h:mm a');

  React.useEffect(() => {
    if (visible) {
      // Start vibration pattern when alarm shows
      const vibrationPattern = [0, 500, 200, 500];
      Vibration.vibrate(vibrationPattern, true); // Repeat
    } else {
      // Stop vibration when dismissed
      Vibration.cancel();
    }

    return () => {
      Vibration.cancel();
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.fullScreen}>
        {/* Background with animated gradient effect */}
        <View style={styles.background}>
          <View style={[styles.gradientCircle, styles.circle1]} />
          <View style={[styles.gradientCircle, styles.circle2]} />
        </View>

        {/* Main content */}
        <View style={styles.content}>
          {/* Alarm icon with pulsing animation */}
          <View style={styles.iconContainer}>
            <View style={styles.pulseCircle} />
            <Ionicons name="alarm" size={80} color="#EF4444" />
          </View>

          {/* Time */}
          <Text style={styles.time}>{currentTime}</Text>

          {/* Task title */}
          <Text style={styles.title}>{taskTitle}</Text>

          {/* Task description */}
          {taskDescription && (
            <Text style={styles.description}>{taskDescription}</Text>
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
              <Text style={styles.snoozeLabel}>Snooze</Text>
              <View style={styles.snoozeButtons}>
                <TouchableOpacity
                  style={styles.snoozeButton}
                  onPress={() => onSnooze(5)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.snoozeButtonText}>5 min</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.snoozeButton}
                  onPress={() => onSnooze(10)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.snoozeButtonText}>10 min</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Dismiss button */}
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={onDismiss}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle" size={28} color="#FFFFFF" />
              <Text style={styles.dismissText}>DISMISS</Text>
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
    opacity: 0.3,
  },
  circle1: {
    width: 300,
    height: 300,
    backgroundColor: '#EF4444',
    top: -100,
    right: -100,
  },
  circle2: {
    width: 400,
    height: 400,
    backgroundColor: '#F59E0B',
    bottom: -150,
    left: -150,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 32,
  },
  pulseCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EF4444',
    opacity: 0.2,
    top: -20,
    left: -20,
  },
  time: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 24,
    letterSpacing: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#A0A0A0',
    textAlign: 'center',
    marginBottom: 24,
  },
  alarmIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 48,
  },
  alarmText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
  },
  snoozeContainer: {
    width: '100%',
    marginBottom: 24,
  },
  snoozeLabel: {
    fontSize: 16,
    color: '#A0A0A0',
    marginBottom: 12,
    textAlign: 'center',
  },
  snoozeButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  snoozeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  snoozeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dismissButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 48,
    paddingVertical: 20,
    borderRadius: 16,
    width: '100%',
    maxWidth: 300,
  },
  dismissText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
    letterSpacing: 1,
  },
});
