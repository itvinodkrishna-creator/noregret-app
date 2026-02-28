import React from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useAppStore } from '../store/useAppStore';

interface FloatingTodoButtonProps {
  visible?: boolean;
}

export const FloatingTodoButton: React.FC<FloatingTodoButtonProps> = ({ visible = true }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { getWaitingTodos } = useAppStore();

  // Don't show on the to-do screen itself
  if (!visible || pathname === '/todo') {
    return null;
  }

  const waitingCount = getWaitingTodos().length;

  const handlePress = () => {
    router.push('/todo');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Ionicons name="list" size={22} color="#FFFFFF" />
        {waitingCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{waitingCount > 9 ? '9+' : waitingCount}</Text>
          </View>
        )}
      </TouchableOpacity>
      <Text style={styles.label}>To-Do</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    top: '45%',
    alignItems: 'center',
    zIndex: 999,
  },
  button: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#10B981', // Green color
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  label: {
    marginTop: 4,
    fontSize: 10,
    color: '#10B981',
    fontWeight: '600',
  },
});
