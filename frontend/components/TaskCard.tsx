import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Task, CATEGORY_CONFIG } from '../types';
import { format, parseISO } from 'date-fns';

interface TaskCardProps {
  task: Task;
  onPress: () => void;
  onComplete: () => void;
  onLongPress?: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onPress, onComplete, onLongPress }) => {
  const { theme } = useTheme();
  const isCompleted = task.status === 'completed';
  const time = format(parseISO(task.time), 'h:mm a');
  
  // Get category config
  const categoryConfig = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.Personal;
  const categoryColor = categoryConfig.color;

  return (
    <TouchableOpacity 
      style={[
        styles.card, 
        { 
          backgroundColor: theme.card, 
          borderColor: categoryColor,
          borderLeftWidth: 4,
          opacity: isCompleted ? 0.6 : 1,
        }
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      delayLongPress={500}
    >
      <View style={styles.leftSection}>
        <TouchableOpacity 
          style={[
            styles.checkbox, 
            { 
              borderColor: categoryColor,
              backgroundColor: isCompleted ? categoryColor : 'transparent',
            }
          ]}
          onPress={onComplete}
        >
          {isCompleted && (
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          )}
        </TouchableOpacity>
        
        <View style={styles.content}>
          <Text 
            style={[
              styles.title, 
              { 
                color: theme.text,
                textDecorationLine: isCompleted ? 'line-through' : 'none'
              }
            ]}
            numberOfLines={1}
          >
            {task.title}
          </Text>
          <View style={styles.metaRow}>
            <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
              <Ionicons 
                name={categoryConfig.icon as any} 
                size={12} 
                color={categoryColor} 
              />
              <Text style={[styles.categoryText, { color: categoryColor }]}>
                {task.category}
              </Text>
            </View>
            <View style={styles.timeContainer}>
              <Ionicons name="time-outline" size={12} color={theme.textSecondary} />
              <Text style={[styles.time, { color: theme.textSecondary }]}>{time}</Text>
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.rightSection}>
        {task.reminderEnabled && (
          <Ionicons name="notifications" size={16} color={categoryColor} />
        )}
        <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
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
    borderLeftWidth: 4,
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
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    fontSize: 12,
    marginLeft: 4,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
  },
});
