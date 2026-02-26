import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Task, CATEGORY_CONFIG } from '../types';
import { format, parseISO } from 'date-fns';

interface TaskCardProps {
  task: Task;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEditDate: () => void;
  onEditTime: () => void;
}

export const TaskCardWithActions: React.FC<TaskCardProps> = ({ 
  task, 
  onComplete, 
  onEdit,
  onDelete,
  onEditDate,
  onEditTime,
}) => {
  const { theme } = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const isCompleted = task.status === 'completed';
  const time = format(parseISO(task.time), 'h:mm a');
  const date = format(parseISO(task.time), 'MMM dd');
  
  const categoryConfig = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.Personal;
  const categoryColor = categoryConfig.color;

  const handleDelete = () => {
    setShowMenu(false);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setShowDeleteConfirm(false);
    onDelete();
  };

  const handleEdit = () => {
    setShowMenu(false);
    onEdit();
  };

  return (
    <>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: categoryColor }]}>
        {/* Left: Checkbox */}
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
        
        {/* Middle: Content */}
        <View style={styles.content}>
          <Text 
            style={[
              styles.title, 
              { 
                color: theme.text,
                textDecorationLine: isCompleted ? 'line-through' : 'none',
                opacity: isCompleted ? 0.6 : 1,
              }
            ]}
            numberOfLines={1}
          >
            {task.title}
          </Text>
          
          <View style={styles.metaRow}>
            {/* Category Badge */}
            <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
              <Ionicons name={categoryConfig.icon as any} size={12} color={categoryColor} />
              <Text style={[styles.categoryText, { color: categoryColor }]}>{task.category}</Text>
            </View>
            
            {/* Clickable Date */}
            <TouchableOpacity style={[styles.dateTimeButton, { backgroundColor: theme.primary + '15' }]} onPress={onEditDate}>
              <Ionicons name="calendar" size={12} color={theme.primary} />
              <Text style={[styles.dateTimeText, { color: theme.primary }]}>{date}</Text>
            </TouchableOpacity>
            
            {/* Clickable Time */}
            <TouchableOpacity style={[styles.dateTimeButton, { backgroundColor: theme.primary + '15' }]} onPress={onEditTime}>
              <Ionicons name="time" size={12} color={theme.primary} />
              <Text style={[styles.dateTimeText, { color: theme.primary }]}>{time}</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Right: Actions Menu */}
        <View style={styles.rightSection}>
          {task.reminderEnabled && (
            <Ionicons name="notifications" size={16} color={categoryColor} style={{ marginRight: 8 }} />
          )}
          <TouchableOpacity 
            style={[styles.menuButton, { backgroundColor: theme.border + '50' }]}
            onPress={() => setShowMenu(true)}
          >
            <Ionicons name="ellipsis-vertical" size={18} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Actions Menu Modal */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={[styles.menuContainer, { backgroundColor: theme.surface }]}>
            <Text style={[styles.menuTitle, { color: theme.text }]}>{task.title}</Text>
            
            <TouchableOpacity style={styles.menuItem} onPress={handleEdit}>
              <Ionicons name="pencil" size={20} color={theme.primary} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Edit Task</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={onEditDate}>
              <Ionicons name="calendar" size={20} color="#10B981" />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Change Date</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={onEditTime}>
              <Ionicons name="time" size={20} color="#F97316" />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Change Time</Text>
            </TouchableOpacity>
            
            <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
            
            <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
              <Ionicons name="trash" size={20} color="#EF4444" />
              <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Delete Task</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.cancelButton, { backgroundColor: theme.card }]} 
              onPress={() => setShowMenu(false)}
            >
              <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade" onRequestClose={() => setShowDeleteConfirm(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmContainer, { backgroundColor: theme.surface }]}>
            <View style={styles.confirmIconContainer}>
              <Ionicons name="trash" size={40} color="#EF4444" />
            </View>
            <Text style={[styles.confirmTitle, { color: theme.text }]}>Delete Task?</Text>
            <Text style={[styles.confirmMessage, { color: theme.textSecondary }]}>
              Are you sure you want to delete "{task.title}"? This action cannot be undone.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity 
                style={[styles.confirmButton, { backgroundColor: theme.card }]} 
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={[styles.confirmButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmButton, { backgroundColor: '#EF4444' }]} 
                onPress={confirmDelete}
              >
                <Text style={[styles.confirmButtonText, { color: '#FFFFFF' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
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
    paddingVertical: 4,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dateTimeText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  menuContainer: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 20,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 12,
  },
  menuDivider: {
    height: 1,
    marginVertical: 8,
  },
  cancelButton: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmContainer: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  confirmIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
