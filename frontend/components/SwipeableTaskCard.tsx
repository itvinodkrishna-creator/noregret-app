import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, PanResponder, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Task, CATEGORY_CONFIG } from '../types';
import { format, parseISO } from 'date-fns';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 80;

interface SwipeableTaskCardProps {
  task: Task;
  onPress: () => void;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEditTime?: () => void;
  onEditDate?: () => void;
}

export const SwipeableTaskCard: React.FC<SwipeableTaskCardProps> = ({ 
  task, 
  onPress, 
  onComplete, 
  onEdit,
  onDelete,
  onEditTime,
  onEditDate,
}) => {
  const { theme } = useTheme();
  const isCompleted = task.status === 'completed';
  const time = format(parseISO(task.time), 'h:mm a');
  const date = format(parseISO(task.time), 'MMM dd');
  
  const categoryConfig = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.Personal;
  const categoryColor = categoryConfig.color;

  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 20;
      },
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Swipe left - Delete
          Animated.timing(translateX, {
            toValue: -SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onDelete();
            translateX.setValue(0);
          });
        } else if (gestureState.dx > SWIPE_THRESHOLD) {
          // Swipe right - Edit
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
          onEdit();
        } else {
          // Snap back
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const leftActionOpacity = translateX.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const rightActionOpacity = translateX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Background Actions */}
      <View style={styles.actionsContainer}>
        {/* Edit Action (Right swipe) */}
        <Animated.View style={[styles.actionLeft, { opacity: leftActionOpacity }]}>
          <Ionicons name="pencil" size={24} color="#FFFFFF" />
          <Text style={styles.actionText}>Edit</Text>
        </Animated.View>
        
        {/* Delete Action (Left swipe) */}
        <Animated.View style={[styles.actionRight, { opacity: rightActionOpacity }]}>
          <Ionicons name="trash" size={24} color="#FFFFFF" />
          <Text style={styles.actionText}>Delete</Text>
        </Animated.View>
      </View>

      {/* Card */}
      <Animated.View
        style={[{ transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
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
          activeOpacity={0.9}
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
                
                {/* Clickable Date */}
                <TouchableOpacity 
                  style={styles.dateTimeButton}
                  onPress={onEditDate}
                >
                  <Ionicons name="calendar-outline" size={12} color={theme.primary} />
                  <Text style={[styles.dateTimeText, { color: theme.primary }]}>{date}</Text>
                </TouchableOpacity>
                
                {/* Clickable Time */}
                <TouchableOpacity 
                  style={styles.dateTimeButton}
                  onPress={onEditTime}
                >
                  <Ionicons name="time-outline" size={12} color={theme.primary} />
                  <Text style={[styles.dateTimeText, { color: theme.primary }]}>{time}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          <View style={styles.rightSection}>
            {task.reminderEnabled && (
              <Ionicons name="notifications" size={16} color={categoryColor} />
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    position: 'relative',
  },
  actionsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionLeft: {
    flex: 1,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 20,
    borderRadius: 12,
  },
  actionRight: {
    flex: 1,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
    borderRadius: 12,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    backgroundColor: '#1a1a1a',
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
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  dateTimeText: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
  },
});
