import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';

interface FloatingHomeButtonProps {
  visible?: boolean;
}

export const FloatingHomeButton: React.FC<FloatingHomeButtonProps> = ({ visible = true }) => {
  const router = useRouter();
  const pathname = usePathname();

  // Don't show on the dashboard (home) screen
  if (!visible || pathname === '/dashboard' || pathname === '/') {
    return null;
  }

  const handlePress = () => {
    router.push('/dashboard');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Ionicons name="home" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100, // Above the tab bar
    right: 20,
    zIndex: 999,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1', // Primary purple color
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
