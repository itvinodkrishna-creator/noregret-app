import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface StatsCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  color?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({ icon, label, value, color }) => {
  const { theme } = useTheme();
  const iconColor = color || theme.primary;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <Text style={[styles.value, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    textAlign: 'center',
  },
});
