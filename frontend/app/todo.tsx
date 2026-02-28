import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAppStore } from '../store/useAppStore';
import { TodoItem, TodoComment } from '../types';
import { playClickSound } from '../utils/sounds';
import { format } from 'date-fns';

export default function TodoScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    preferences,
    addTodoItem,
    toggleTodoItem,
    deleteTodoItem,
    getWaitingTodos,
    getDoneTodos,
    addTodoComment,
    deleteTodoComment,
  } = useAppStore();

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [showTimeInput, setShowTimeInput] = useState(false);
  
  // Comment modal state
  const [selectedTodo, setSelectedTodo] = useState<TodoItem | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [newComment, setNewComment] = useState('');

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

  const handleOpenComments = (item: TodoItem) => {
    playClickSound(preferences.soundEnabled);
    setSelectedTodo(item);
    setShowCommentModal(true);
  };

  const handleAddComment = () => {
    if (selectedTodo && newComment.trim()) {
      playClickSound(preferences.soundEnabled);
      addTodoComment(selectedTodo._id, newComment.trim());
      setNewComment('');
      // Refresh selected todo
      const updated = [...waitingTodos, ...doneTodos].find(t => t._id === selectedTodo._id);
      if (updated) setSelectedTodo(updated);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    if (selectedTodo) {
      playClickSound(preferences.soundEnabled);
      deleteTodoComment(selectedTodo._id, commentId);
    }
  };

  const renderTodoItem = (item: TodoItem, isCompleted: boolean) => {
    const commentCount = (item.comments || []).length;
    
    return (
      <View
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

        <TouchableOpacity 
          style={styles.todoContent}
          onPress={() => handleOpenComments(item)}
          activeOpacity={0.7}
        >
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
          {/* Comment indicator */}
          {commentCount > 0 && (
            <View style={styles.commentIndicator}>
              <Ionicons name="chatbubble-outline" size={12} color="#8B5CF6" />
              <Text style={styles.commentCount}>{commentCount} note{commentCount > 1 ? 's' : ''}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Comment button */}
        <TouchableOpacity
          style={styles.commentButton}
          onPress={() => handleOpenComments(item)}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={20} color="#8B5CF6" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item._id)}
        >
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    );
  };

  // Comment Modal
  const renderCommentModal = () => (
    <Modal
      visible={showCommentModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCommentModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.commentModalContent, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={[styles.commentModalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.commentModalTitle, { color: theme.text }]}>
              Notes & Status
            </Text>
            <TouchableOpacity 
              onPress={() => setShowCommentModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Task Title */}
          {selectedTodo && (
            <View style={[styles.taskInfoSection, { backgroundColor: theme.cardBackground }]}>
              <Ionicons name="document-text-outline" size={20} color="#3B82F6" />
              <Text style={[styles.taskInfoTitle, { color: theme.text }]}>
                {selectedTodo.title}
              </Text>
            </View>
          )}

          {/* Comments List */}
          <ScrollView style={styles.commentsScroll}>
            {selectedTodo?.comments && selectedTodo.comments.length > 0 ? (
              selectedTodo.comments.map((comment: TodoComment) => (
                <View 
                  key={comment._id} 
                  style={[styles.commentItem, { backgroundColor: theme.cardBackground }]}
                >
                  <View style={styles.commentContent}>
                    <Text style={[styles.commentText, { color: theme.text }]}>
                      {comment.text}
                    </Text>
                    <Text style={[styles.commentDate, { color: theme.textSecondary }]}>
                      {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteComment(comment._id)}
                    style={styles.deleteCommentButton}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.noCommentsContainer}>
                <Ionicons name="chatbubbles-outline" size={40} color={theme.textSecondary} />
                <Text style={[styles.noCommentsText, { color: theme.textSecondary }]}>
                  No notes yet. Add a status update below.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Add Comment Input */}
          <View style={[styles.addCommentSection, { borderTopColor: theme.border }]}>
            <TextInput
              style={[styles.commentInput, { 
                color: theme.text, 
                backgroundColor: theme.cardBackground,
                borderColor: theme.border 
              }]}
              placeholder="Add a note or status update..."
              placeholderTextColor={theme.textSecondary}
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.addCommentButton, { opacity: newComment.trim() ? 1 : 0.5 }]}
              onPress={handleAddComment}
              disabled={!newComment.trim()}
            >
              <Ionicons name="send" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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

        {/* Comment Modal */}
        {renderCommentModal()}
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
  commentIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  commentCount: {
    fontSize: 11,
    color: '#8B5CF6',
  },
  commentButton: {
    padding: 8,
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
  // Comment Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  commentModalContent: {
    maxHeight: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
  },
  commentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  commentModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  taskInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 16,
    padding: 14,
    borderRadius: 12,
  },
  taskInfoTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  commentsScroll: {
    maxHeight: 300,
    paddingHorizontal: 16,
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  commentContent: {
    flex: 1,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  commentDate: {
    fontSize: 11,
    marginTop: 6,
  },
  deleteCommentButton: {
    padding: 4,
    marginLeft: 8,
  },
  noCommentsContainer: {
    alignItems: 'center',
    padding: 30,
    gap: 10,
  },
  noCommentsText: {
    fontSize: 14,
    textAlign: 'center',
  },
  addCommentSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  commentInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  addCommentButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
