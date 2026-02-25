import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { CategoryIcon } from './CategoryIcon';
import { Task } from '../types';
import { format, parseISO } from 'date-fns';

interface TaskCardProps {
  task: Task;
  onPress: () => void;
  onComplete: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onPress, onComplete }) => {
  const { theme } = useTheme();
  const isCompleted = task.status === 'completed';
  const time = format(parseISO(task.time), 'h:mm a');

  return (
    <TouchableOpacity 
      style={[styles.card, { 
        backgroundColor: theme.card, 
        borderColor: theme.border,
        opacity: isCompleted ? 0.6 : 1 
      }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.leftSection}>
        <TouchableOpacity 
          style={[styles.checkbox, { borderColor: theme.border }]}
          onPress={onComplete}
        >
          {isCompleted && (
            <Ionicons name="checkmark" size={20} color={theme.success} />
          )}
        </TouchableOpacity>
        
        <View style={styles.content}>
          <Text 
            style={[styles.title, { 
              color: theme.text,
              textDecorationLine: isCompleted ? 'line-through' : 'none'
            }]}
            numberOfLines={1}
          >
            {task.title}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.time, { color: theme.textSecondary }]}>{time}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.rightSection}>
        <CategoryIcon 
          category={task.category} 
          size={20} 
          color={theme.textSecondary} 
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    fontSize: 13,
    marginLeft: 4,
  },
  rightSection: {
    marginLeft: 12,
  },
});
