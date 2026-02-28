import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAppStore } from '../store/useAppStore';
import { TodoItem } from '../types';
import { playClickSound } from '../utils/sounds';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TodoScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    preferences,
    todoItems,
    addTodoItem,
    toggleTodoItem,
    deleteTodoItem,
    getWaitingTodos,
    getDoneTodos,
  } = useAppStore();

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [showTimeInput, setShowTimeInput] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const waitingTodos = getWaitingTodos();
  const doneTodos = getDoneTodos();

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      playClickSound(preferences.soundEnabled);
      addTodoItem(newTaskTitle.trim(), newTaskTime.trim() || undefined);
      setNewTaskTitle('');
      setNewTaskTime('');
      setShowTimeInput(false);
    }
  };

  const handleToggle = (id: string) => {
    playClickSound(preferences.soundEnabled);
    toggleTodoItem(id);
  };

  const handleDelete = (id: string) => {
    playClickSound(preferences.soundEnabled);
    deleteTodoItem(id);
  };

  const renderTodoItem = (item: TodoItem, isCompleted: boolean) => (
    <Animated.View
      key={item._id}
      style={[
        styles.todoItem,
        {
          backgroundColor: theme.cardBackground,
          borderLeftColor: isCompleted ? '#10B981' : '#3B82F6',
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.checkbox,
          {
            backgroundColor: isCompleted ? '#10B981' : 'transparent',
            borderColor: isCompleted ? '#10B981' : theme.textSecondary,
          },
        ]}
        onPress={() => handleToggle(item._id)}
      >
        {isCompleted && (
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
        )}
      </TouchableOpacity>

      <View style={styles.todoContent}>
        <Text
          style={[
            styles.todoTitle,
            {
              color: isCompleted ? theme.textSecondary : theme.text,
              textDecorationLine: isCompleted ? 'line-through' : 'none',
            },
          ]}
        >
          {item.title}
        </Text>
        {item.time && (
          <View style={styles.timeContainer}>
            <Ionicons name="time-outline" size={12} color={theme.textSecondary} />
            <Text style={[styles.timeText, { color: theme.textSecondary }]}>
              {item.time}
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item._id)}
      >
        <Ionicons name="trash-outline" size={18} color="#EF4444" />
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>To-Do List</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              {waitingTodos.length} waiting • {doneTodos.length} done
            </Text>
          </View>
        </View>

        {/* Add Task Input */}
        <View style={[styles.addTaskContainer, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              placeholder="Add new task..."
              placeholderTextColor={theme.textSecondary}
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              onSubmitEditing={handleAddTask}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.addButton, { opacity: newTaskTitle.trim() ? 1 : 0.5 }]}
              onPress={handleAddTask}
              disabled={!newTaskTitle.trim()}
            >
              <Ionicons name="add-circle" size={40} color="#6366F1" />
            </TouchableOpacity>
          </View>
          
          {/* Optional Time Input */}
          <TouchableOpacity
            style={styles.timeToggle}
            onPress={() => setShowTimeInput(!showTimeInput)}
          >
            <Ionicons
              name={showTimeInput ? 'chevron-up' : 'time-outline'}
              size={16}
              color={theme.textSecondary}
            />
            <Text style={[styles.timeToggleText, { color: theme.textSecondary }]}>
              {showTimeInput ? 'Hide time' : 'Add time (optional)'}
            </Text>
          </TouchableOpacity>

          {showTimeInput && (
            <TextInput
              style={[styles.timeInput, { color: theme.text, borderColor: theme.border }]}
              placeholder="e.g., 9:00 AM"
              placeholderTextColor={theme.textSecondary}
              value={newTaskTime}
              onChangeText={setNewTaskTime}
            />
          )}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Waiting Section */}
          <View style={styles.section}>
            <View style={[styles.sectionHeader, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
              <Ionicons name="hourglass-outline" size={20} color="#3B82F6" />
              <Text style={[styles.sectionTitle, { color: '#3B82F6' }]}>
                Waiting ({waitingTodos.length})
              </Text>
            </View>
            
            {waitingTodos.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: theme.cardBackground }]}>
                <Ionicons name="checkmark-done-circle-outline" size={40} color={theme.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No pending tasks! Add one above.
                </Text>
              </View>
            ) : (
              waitingTodos.map(item => renderTodoItem(item, false))
            )}
          </View>

          {/* Done Section */}
          <View style={styles.section}>
            <View style={[styles.sectionHeader, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={[styles.sectionTitle, { color: '#10B981' }]}>
                Done ({doneTodos.length})
              </Text>
            </View>
            
            {doneTodos.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: theme.cardBackground }]}>
                <Ionicons name="trophy-outline" size={40} color={theme.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  Complete tasks to see them here!
                </Text>
              </View>
            ) : (
              doneTodos.map(item => renderTodoItem(item, true))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  addTaskContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  addButton: {
    padding: 4,
  },
  timeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
  },
  timeToggleText: {
    fontSize: 13,
  },
  timeInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    marginTop: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  todoContent: {
    flex: 1,
  },
  todoTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  timeText: {
    fontSize: 12,
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
