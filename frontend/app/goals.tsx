/**
 * Weekly Goals/Habit Tracker Screen
 * 
 * Features:
 * - Task names on left side (rows)
 * - Weekdays as columns (Mon-Sun)
 * - Checkboxes for each day
 * - Add custom goals/habits
 * - Data persists across sessions
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Days of the week
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Storage key
const GOALS_STORAGE_KEY = '@noregret_weekly_goals';

// Goal colors
const GOAL_COLORS = [
  '#10B981', // Green
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#F59E0B', // Orange
  '#EF4444', // Red
  '#EC4899', // Pink
  '#06B6D4', // Cyan
];

interface Goal {
  id: string;
  name: string;
  icon: string;
  color: string;
  completedDays: { [key: string]: boolean }; // { 'Mon': true, 'Tue': false, ... }
  createdAt: number;
}

interface WeekData {
  weekStart: string; // ISO date string of week start (Monday)
  goals: Goal[];
}

export default function GoalsScreen() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [selectedColor, setSelectedColor] = useState(GOAL_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState('flag');
  const [currentWeekStart, setCurrentWeekStart] = useState('');
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Get current week's Monday
  const getWeekStart = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    const monday = new Date(now);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
  };

  // Load goals from storage
  const loadGoals = async () => {
    try {
      const weekStart = getWeekStart();
      setCurrentWeekStart(weekStart);
      
      const stored = await AsyncStorage.getItem(GOALS_STORAGE_KEY);
      if (stored) {
        const data: WeekData = JSON.parse(stored);
        
        // Check if it's a new week
        if (data.weekStart === weekStart) {
          setGoals(data.goals);
        } else {
          // New week - reset completion but keep goals
          const resetGoals = data.goals.map(goal => ({
            ...goal,
            completedDays: {},
          }));
          setGoals(resetGoals);
          await saveGoals(resetGoals, weekStart);
        }
      }
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  };

  // Save goals to storage
  const saveGoals = async (goalsToSave: Goal[], weekStart?: string) => {
    try {
      const data: WeekData = {
        weekStart: weekStart || currentWeekStart,
        goals: goalsToSave,
      };
      await AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving goals:', error);
    }
  };

  // Load goals when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadGoals();
    }, [])
  );

  // Toggle day completion
  const toggleDay = async (goalId: string, day: string) => {
    const updatedGoals = goals.map(goal => {
      if (goal.id === goalId) {
        return {
          ...goal,
          completedDays: {
            ...goal.completedDays,
            [day]: !goal.completedDays[day],
          },
        };
      }
      return goal;
    });
    
    setGoals(updatedGoals);
    await saveGoals(updatedGoals);
  };

  // Add new goal
  const addGoal = async () => {
    if (!newGoalName.trim()) {
      Alert.alert('Error', 'Please enter a goal name');
      return;
    }

    const newGoal: Goal = {
      id: Date.now().toString(),
      name: newGoalName.trim(),
      icon: selectedIcon,
      color: selectedColor,
      completedDays: {},
      createdAt: Date.now(),
    };

    const updatedGoals = [...goals, newGoal];
    setGoals(updatedGoals);
    await saveGoals(updatedGoals);
    
    setNewGoalName('');
    setSelectedColor(GOAL_COLORS[0]);
    setSelectedIcon('flag');
    setShowAddModal(false);
  };

  // Delete goal
  const deleteGoal = async (goalId: string) => {
    Alert.alert(
      'Delete Goal',
      'Are you sure you want to delete this goal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedGoals = goals.filter(g => g.id !== goalId);
            setGoals(updatedGoals);
            await saveGoals(updatedGoals);
          },
        },
      ]
    );
  };

  // Calculate progress
  const getProgress = (goal: Goal) => {
    const completed = Object.values(goal.completedDays).filter(Boolean).length;
    return { completed, total: 7, percentage: Math.round((completed / 7) * 100) };
  };

  // Get today's day name
  const getTodayIndex = () => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1; // Convert Sunday (0) to index 6
  };

  // Icons for selection
  const ICONS = [
    'flag', 'fitness', 'book', 'briefcase', 'heart', 'star', 
    'water', 'bed', 'cafe', 'walk', 'bicycle', 'musical-notes',
    'code-slash', 'language', 'school', 'restaurant',
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Weekly Goals</Text>
          <Text style={styles.headerSubtitle}>Track your daily habits</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Week indicator */}
      <View style={styles.weekIndicator}>
        <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
        <Text style={styles.weekText}>
          Week of {new Date(currentWeekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Text>
      </View>

      {/* Goals Table */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {goals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="flag-outline" size={64} color="#374151" />
            <Text style={styles.emptyTitle}>No goals yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the + button to add your first weekly goal
            </Text>
          </View>
        ) : (
          <View style={styles.table}>
            {/* Table Header - Days */}
            <View style={styles.tableHeader}>
              <View style={styles.goalNameHeader}>
                <Text style={styles.headerText}>Goal</Text>
              </View>
              {WEEKDAYS.map((day, index) => (
                <View 
                  key={day} 
                  style={[
                    styles.dayHeader,
                    index === getTodayIndex() && styles.todayHeader,
                  ]}
                >
                  <Text style={[
                    styles.dayText,
                    index === getTodayIndex() && styles.todayText,
                  ]}>
                    {day}
                  </Text>
                </View>
              ))}
            </View>

            {/* Goal Rows */}
            {goals.map((goal) => {
              const progress = getProgress(goal);
              return (
                <View key={goal.id} style={styles.goalRow}>
                  {/* Goal Name */}
                  <TouchableOpacity 
                    style={styles.goalNameCell}
                    onLongPress={() => deleteGoal(goal.id)}
                  >
                    <View style={[styles.goalIcon, { backgroundColor: goal.color + '20' }]}>
                      <Ionicons name={goal.icon as any} size={16} color={goal.color} />
                    </View>
                    <View style={styles.goalInfo}>
                      <Text style={styles.goalName} numberOfLines={1}>
                        {goal.name}
                      </Text>
                      <Text style={styles.goalProgress}>
                        {progress.completed}/7 ({progress.percentage}%)
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Day Checkboxes */}
                  {WEEKDAYS.map((day, index) => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.checkboxCell,
                        index === getTodayIndex() && styles.todayCell,
                      ]}
                      onPress={() => toggleDay(goal.id, day)}
                    >
                      <View style={[
                        styles.checkbox,
                        goal.completedDays[day] && { 
                          backgroundColor: goal.color,
                          borderColor: goal.color,
                        },
                      ]}>
                        {goal.completedDays[day] && (
                          <Ionicons name="checkmark" size={14} color="#fff" />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })}
          </View>
        )}

        {/* Weekly Summary */}
        {goals.length > 0 && (
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>Weekly Summary</Text>
            <View style={styles.summaryCards}>
              {goals.map((goal) => {
                const progress = getProgress(goal);
                return (
                  <View key={goal.id} style={styles.summaryCard}>
                    <View style={[styles.progressBar, { backgroundColor: goal.color + '20' }]}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { 
                            width: `${progress.percentage}%`,
                            backgroundColor: goal.color,
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.summaryGoalName}>{goal.name}</Text>
                    <Text style={styles.summaryPercentage}>{progress.percentage}%</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Goal Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Goal</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Goal Name Input */}
            <Text style={styles.inputLabel}>Goal Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Exercise, Read 30 min, Learn coding..."
              placeholderTextColor="#6B7280"
              value={newGoalName}
              onChangeText={setNewGoalName}
              autoFocus
            />

            {/* Color Selection */}
            <Text style={styles.inputLabel}>Color</Text>
            <View style={styles.colorRow}>
              {GOAL_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Icon Selection */}
            <Text style={styles.inputLabel}>Icon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.iconRow}>
                {ICONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconOption,
                      selectedIcon === icon && { 
                        backgroundColor: selectedColor + '30',
                        borderColor: selectedColor,
                      },
                    ]}
                    onPress={() => setSelectedIcon(icon)}
                  >
                    <Ionicons 
                      name={icon as any} 
                      size={20} 
                      color={selectedIcon === icon ? selectedColor : '#9CA3AF'} 
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Add Button */}
            <TouchableOpacity 
              style={[styles.addGoalButton, { backgroundColor: selectedColor }]}
              onPress={addGoal}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addGoalButtonText}>Add Goal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 6,
  },
  weekText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  table: {
    marginHorizontal: 12,
    backgroundColor: '#111827',
    borderRadius: 16,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  goalNameHeader: {
    width: SCREEN_WIDTH * 0.28,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  dayHeader: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  todayHeader: {
    backgroundColor: '#6366F1' + '30',
  },
  dayText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  todayText: {
    color: '#6366F1',
  },
  goalRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  goalNameCell: {
    width: SCREEN_WIDTH * 0.28,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 8,
  },
  goalIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  goalProgress: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  checkboxCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  todayCell: {
    backgroundColor: '#6366F1' + '10',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summarySection: {
    marginTop: 24,
    marginHorizontal: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  summaryCards: {
    gap: 8,
  },
  summaryCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    width: 60,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  summaryGoalName: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
  },
  summaryPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#374151',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  iconRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderWidth: 2,
    borderColor: '#374151',
  },
  addGoalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  addGoalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
