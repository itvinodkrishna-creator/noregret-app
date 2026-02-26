import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'info';
}

export const Toast: React.FC<ToastProps> = ({ visible, message, type = 'success' }) => {
  const translateY = React.useRef(new Animated.Value(-100)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const getConfig = () => {
    switch (type) {
      case 'success':
        return { color: '#10B981', icon: 'checkmark-circle' };
      case 'error':
        return { color: '#EF4444', icon: 'close-circle' };
      case 'info':
        return { color: '#6366F1', icon: 'information-circle' };
      default:
        return { color: '#10B981', icon: 'checkmark-circle' };
    }
  };

  const config = getConfig();

  return (
    <Animated.View 
      style={[
        styles.container, 
        { backgroundColor: config.color, transform: [{ translateY }] }
      ]}
      pointerEvents="none"
    >
      <Ionicons name={config.icon as any} size={20} color="#FFFFFF" />
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    zIndex: 9999,
    elevation: 10,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
  },
});
