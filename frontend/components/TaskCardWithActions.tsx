import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Task, CATEGORY_CONFIG } from '../types';
import { format, parseISO } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';

interface TaskCardProps {
  task: Task;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDateTimeChange: (newDateTime: Date) => void;
}

export const TaskCardWithActions: React.FC<TaskCardProps> = ({ 
  task, 
  onComplete, 
  onEdit,
  onDelete,
  onDateTimeChange,
}) => {
  const { theme } = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Date/Time picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  const isCompleted = task.status === 'completed';
  const taskDate = parseISO(task.time);
  const time = format(taskDate, 'h:mm a');
  const date = format(taskDate, 'MMM dd');
  
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

  // Open date picker
  const openDatePicker = () => {
    setTempDate(taskDate);
    setShowDatePicker(true);
    setShowMenu(false);
  };

  // Open time picker
  const openTimePicker = () => {
    setTempDate(taskDate);
    setShowTimePicker(true);
    setShowMenu(false);
  };

  // Handle date change
  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate && event.type !== 'dismissed') {
      const newDateTime = new Date(selectedDate);
      newDateTime.setHours(taskDate.getHours());
      newDateTime.setMinutes(taskDate.getMinutes());
      
      // Auto-save and close on iOS too
      setShowDatePicker(false);
      onDateTimeChange(newDateTime);
    } else if (event.type === 'dismissed') {
      setShowDatePicker(false);
    }
  };

  // Handle time change
  const onTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (selectedTime && event.type !== 'dismissed') {
      const newDateTime = new Date(taskDate);
      newDateTime.setHours(selectedTime.getHours());
      newDateTime.setMinutes(selectedTime.getMinutes());
      
      // Auto-save and close on iOS too
      setShowTimePicker(false);
      onDateTimeChange(newDateTime);
    } else if (event.type === 'dismissed') {
      setShowTimePicker(false);
    }
  };

  // Confirm iOS date selection
  const confirmDateSelection = () => {
    const newDateTime = new Date(tempDate);
    newDateTime.setHours(taskDate.getHours());
    newDateTime.setMinutes(taskDate.getMinutes());
    onDateTimeChange(newDateTime);
    setShowDatePicker(false);
  };

  // Confirm iOS time selection
  const confirmTimeSelection = () => {
    const newDateTime = new Date(taskDate);
    newDateTime.setHours(tempDate.getHours());
    newDateTime.setMinutes(tempDate.getMinutes());
    onDateTimeChange(newDateTime);
    setShowTimePicker(false);
  };

  return (
    <>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: categoryColor }]}>
        {/* Checkbox */}
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
        
        {/* Content */}
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
            {/* Category */}
            <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
              <Ionicons name={categoryConfig.icon as any} size={12} color={categoryColor} />
              <Text style={[styles.categoryText, { color: categoryColor }]}>{task.category}</Text>
            </View>
            
            {/* DATE - Tap to Edit */}
            <TouchableOpacity 
              style={[styles.editableButton, { backgroundColor: '#10B981' + '20' }]} 
              onPress={openDatePicker}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar" size={14} color="#10B981" />
              <Text style={[styles.editableText, { color: '#10B981' }]}>{date}</Text>
              <Ionicons name="pencil" size={10} color="#10B981" />
            </TouchableOpacity>
            
            {/* TIME - Tap to Edit */}
            <TouchableOpacity 
              style={[styles.editableButton, { backgroundColor: '#F97316' + '20' }]} 
              onPress={openTimePicker}
              activeOpacity={0.7}
            >
              <Ionicons name="time" size={14} color="#F97316" />
              <Text style={[styles.editableText, { color: '#F97316' }]}>{time}</Text>
              <Ionicons name="pencil" size={10} color="#F97316" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Menu Button */}
        <View style={styles.rightSection}>
          {task.reminderEnabled && (
            <Ionicons name="notifications" size={16} color={categoryColor} style={{ marginRight: 8 }} />
          )}
          <TouchableOpacity 
            style={[styles.menuButton, { backgroundColor: theme.border }]}
            onPress={() => setShowMenu(true)}
          >
            <Ionicons name="ellipsis-vertical" size={18} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* iOS Date Picker Modal */}
      {Platform.OS === 'ios' && showDatePicker && (
        <Modal visible={true} transparent animationType="slide">
          <View style={styles.pickerModal}>
            <View style={[styles.pickerContainer, { backgroundColor: theme.surface }]}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={[styles.pickerCancel, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.pickerTitle, { color: theme.text }]}>Select Date</Text>
                <TouchableOpacity onPress={confirmDateSelection}>
                  <Text style={[styles.pickerDone, { color: theme.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                onChange={onDateChange}
                style={styles.picker}
                textColor={theme.text}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* iOS Time Picker Modal */}
      {Platform.OS === 'ios' && showTimePicker && (
        <Modal visible={true} transparent animationType="slide">
          <View style={styles.pickerModal}>
            <View style={[styles.pickerContainer, { backgroundColor: theme.surface }]}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={[styles.pickerCancel, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.pickerTitle, { color: theme.text }]}>Select Time</Text>
                <TouchableOpacity onPress={confirmTimeSelection}>
                  <Text style={[styles.pickerDone, { color: theme.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="time"
                display="spinner"
                onChange={onTimeChange}
                style={styles.picker}
                textColor={theme.text}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Android Date Picker */}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={taskDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={onDateChange}
        />
      )}

      {/* Android Time Picker */}
      {Platform.OS === 'android' && showTimePicker && (
        <DateTimePicker
          value={taskDate}
          mode="time"
          display="default"
          onChange={onTimeChange}
        />
      )}

      {/* Menu Modal */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={[styles.menuContainer, { backgroundColor: theme.surface }]}>
            <Text style={[styles.menuTitle, { color: theme.text }]} numberOfLines={1}>{task.title}</Text>
            
            <TouchableOpacity style={styles.menuItem} onPress={handleEdit}>
              <Ionicons name="pencil" size={22} color={theme.primary} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Edit Task</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={openDatePicker}>
              <Ionicons name="calendar" size={22} color="#10B981" />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Change Date</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={openTimePicker}>
              <Ionicons name="time" size={22} color="#F97316" />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Change Time</Text>
            </TouchableOpacity>
            
            <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
            
            <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
              <Ionicons name="trash" size={22} color="#EF4444" />
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

      {/* Delete Confirmation */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade" onRequestClose={() => setShowDeleteConfirm(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmContainer, { backgroundColor: theme.surface }]}>
            <View style={styles.confirmIconContainer}>
              <Ionicons name="trash" size={40} color="#EF4444" />
            </View>
            <Text style={[styles.confirmTitle, { color: theme.text }]}>Delete Task?</Text>
            <Text style={[styles.confirmMessage, { color: theme.textSecondary }]}>
              Are you sure you want to delete this task?
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
    marginBottom: 8,
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
  editableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  editableText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Picker Modal Styles
  pickerModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pickerContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  pickerCancel: {
    fontSize: 16,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  pickerDone: {
    fontSize: 16,
    fontWeight: '600',
  },
  picker: {
    height: 200,
  },
  // Menu Modal Styles
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
    marginLeft: 14,
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
  // Delete Confirmation
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
