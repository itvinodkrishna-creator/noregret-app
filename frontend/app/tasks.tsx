import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Platform, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppStore } from '../store/useAppStore';
import { TaskCardWithActions } from '../components/TaskCardWithActions';
import { Toast } from '../components/Toast';
import { DatePickerModal, TimePickerModal } from '../components/CustomPickers';
import { Task, CATEGORY_CONFIG, CategoryType } from '../types';
import { format, startOfToday, parseISO } from 'date-fns';
import * as DocumentPicker from 'expo-document-picker';
import { registerForPushNotificationsAsync } from '../utils/notifications';
import { scheduleAlarm, cancelAlarmsForTask } from '../utils/alarmScheduler';
import { RINGTONES, playClickSound } from '../utils/sounds';

const categories: CategoryType[] = ['Work', 'Health', 'Food', 'Personal'];

export default function TasksScreen() {
  const { theme } = useTheme();
  const { tasks, addTask, updateTask, deleteTask, completeTask, loadData, preferences } = useAppStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | CategoryType>('all');
  const [customRingtones, setCustomRingtones] = useState<{id: string; label: string; url: string}[]>([]);
  
  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  
  // Quick edit states
  const [quickEditTask, setQuickEditTask] = useState<Task | null>(null);
  const [showQuickDatePicker, setShowQuickDatePicker] = useState(false);
  const [showQuickTimePicker, setShowQuickTimePicker] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const date = new Date();
    date.setMinutes(date.getMinutes() + 5);
    return date;
  });
  const [selectedTime, setSelectedTime] = useState(() => {
    const time = new Date();
    time.setMinutes(time.getMinutes() + 5);
    return time;
  });
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('Personal');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [selectedRingtone, setSelectedRingtone] = useState('default');
  const [showRingtonePicker, setShowRingtonePicker] = useState(false);

  useEffect(() => {
    loadData();
    registerForPushNotificationsAsync();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  };

  const allRingtones = [...RINGTONES, ...customRingtones];

  const pickAudioFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const audio = result.assets[0];
        const customSound = {
          id: `custom_${Date.now()}`,
          label: `Custom: ${audio.name}`,
          url: audio.uri,
        };
        
        if (!customRingtones.find(r => r.url === audio.uri)) {
          setCustomRingtones([...customRingtones, customSound]);
        }
        
        setSelectedRingtone(customSound.id);
        showToast(`Selected: ${audio.name}`, 'success');
      }
    } catch (error) {
      showToast('Could not pick audio file', 'error');
    }
  };

  const filteredTasks = tasks
    .filter(task => filter === 'all' || task.category === filter)
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  const resetForm = () => {
    setTitle('');
    setDescription('');
    const defaultTime = new Date();
    defaultTime.setMinutes(defaultTime.getMinutes() + 5);
    setSelectedDate(defaultTime);
    setSelectedTime(defaultTime);
    setSelectedCategory('Personal');
    setReminderEnabled(true);
    setSelectedRingtone('default');
    setShowRingtonePicker(false);
  };

  const handleAddTask = async () => {
    playClickSound(preferences.soundEnabled);
    
    if (!title.trim()) {
      showToast('Please enter a task title', 'error');
      return;
    }

    const taskDateTime = new Date(selectedDate);
    taskDateTime.setHours(selectedTime.getHours());
    taskDateTime.setMinutes(selectedTime.getMinutes());
    taskDateTime.setSeconds(0);
    taskDateTime.setMilliseconds(0);

    const now = new Date();
    const msUntilAlarm = taskDateTime.getTime() - now.getTime();
    
    if (msUntilAlarm < 60000) {
      showToast('Please select a time at least 1 minute in the future', 'error');
      return;
    }

    let alarmId: string | undefined;
    const taskId = Date.now().toString();

    if (reminderEnabled) {
      try {
        alarmId = scheduleAlarm(taskId, title.trim(), taskDateTime, selectedRingtone, description.trim());
      } catch (error) {
        console.error('Error scheduling alarm:', error);
      }
    }

    await addTask({
      title: title.trim(),
      description: description.trim(),
      time: taskDateTime.toISOString(),
      category: selectedCategory,
      reminderEnabled,
      ringtone: selectedRingtone,
      notificationId: alarmId,
    });

    resetForm();
    setShowAddModal(false);
    showToast('Task Created Successfully!', 'success');
  };

  const handleEditTask = async () => {
    playClickSound(preferences.soundEnabled);
    
    if (!selectedTask || !title.trim()) {
      showToast('Please enter a task title', 'error');
      return;
    }

    const taskDateTime = new Date(selectedDate);
    taskDateTime.setHours(selectedTime.getHours());
    taskDateTime.setMinutes(selectedTime.getMinutes());
    taskDateTime.setSeconds(0);
    taskDateTime.setMilliseconds(0);

    // Cancel old alarm
    if (selectedTask._id) {
      cancelAlarmsForTask(selectedTask._id);
    }

    let alarmId: string | undefined;

    if (reminderEnabled) {
      const now = new Date();
      const msUntilAlarm = taskDateTime.getTime() - now.getTime();
      
      if (msUntilAlarm >= 60000) {
        try {
          alarmId = scheduleAlarm(selectedTask._id || '', title.trim(), taskDateTime, selectedRingtone, description.trim());
        } catch (error) {
          console.error('Error scheduling alarm:', error);
        }
      }
    }

    await updateTask(selectedTask._id || '', {
      title: title.trim(),
      description: description.trim(),
      time: taskDateTime.toISOString(),
      category: selectedCategory,
      reminderEnabled,
      ringtone: selectedRingtone,
      notificationId: alarmId,
    });

    setShowEditModal(false);
    setSelectedTask(null);
    resetForm();
    showToast('Task Updated Successfully!', 'success');
  };

  const handleDeleteTask = async (task: Task) => {
    playClickSound(preferences.soundEnabled);
    
    if (task._id) {
      cancelAlarmsForTask(task._id);
      await deleteTask(task._id);
      showToast('Task Deleted!', 'info');
    }
  };

  const openEditModal = (task: Task) => {
    playClickSound(preferences.soundEnabled);
    setSelectedTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setSelectedDate(parseISO(task.time));
    setSelectedTime(parseISO(task.time));
    setSelectedCategory(task.category);
    setReminderEnabled(task.reminderEnabled);
    setSelectedRingtone(task.ringtone || 'default');
    setShowEditModal(true);
  };

  const handleCompleteTask = async (taskId: string) => {
    playClickSound(preferences.soundEnabled);
    await completeTask(taskId);
    cancelAlarmsForTask(taskId);
    showToast('Task Completed!', 'success');
  };

  // Quick date edit - Opens modal with date picker
  const handleQuickDateEdit = (task: Task) => {
    playClickSound(preferences.soundEnabled);
    setQuickEditTask(task);
    setSelectedDate(parseISO(task.time));
    setShowQuickDatePicker(true);
  };

  // Quick time edit - Opens modal with time picker
  const handleQuickTimeEdit = (task: Task) => {
    playClickSound(preferences.soundEnabled);
    setQuickEditTask(task);
    setSelectedTime(parseISO(task.time));
    setShowQuickTimePicker(true);
  };

  const handleQuickDateChange = async (event: any, date?: Date) => {
    if (Platform.OS !== 'ios') {
      setShowQuickDatePicker(false);
    }
    
    if (date && quickEditTask && quickEditTask._id) {
      const newDateTime = new Date(date);
      const oldTime = parseISO(quickEditTask.time);
      newDateTime.setHours(oldTime.getHours());
      newDateTime.setMinutes(oldTime.getMinutes());
      
      cancelAlarmsForTask(quickEditTask._id);
      
      let alarmId: string | undefined;
      if (quickEditTask.reminderEnabled) {
        const now = new Date();
        const msUntilAlarm = newDateTime.getTime() - now.getTime();
        if (msUntilAlarm >= 60000) {
          try {
            alarmId = scheduleAlarm(quickEditTask._id, quickEditTask.title, newDateTime, quickEditTask.ringtone || 'default');
          } catch (error) {}
        }
      }
      
      await updateTask(quickEditTask._id, { 
        time: newDateTime.toISOString(),
        notificationId: alarmId,
      });
      showToast('Date Updated!', 'success');
      setQuickEditTask(null);
    }
  };

  const handleQuickTimeChange = async (event: any, time?: Date) => {
    if (Platform.OS !== 'ios') {
      setShowQuickTimePicker(false);
    }
    
    if (time && quickEditTask && quickEditTask._id) {
      const newDateTime = parseISO(quickEditTask.time);
      newDateTime.setHours(time.getHours());
      newDateTime.setMinutes(time.getMinutes());
      
      cancelAlarmsForTask(quickEditTask._id);
      
      let alarmId: string | undefined;
      if (quickEditTask.reminderEnabled) {
        const now = new Date();
        const msUntilAlarm = newDateTime.getTime() - now.getTime();
        if (msUntilAlarm >= 60000) {
          try {
            alarmId = scheduleAlarm(quickEditTask._id, quickEditTask.title, newDateTime, quickEditTask.ringtone || 'default');
          } catch (error) {}
        }
      }
      
      await updateTask(quickEditTask._id, { 
        time: newDateTime.toISOString(),
        notificationId: alarmId,
      });
      showToast('Time Updated!', 'success');
      setQuickEditTask(null);
    }
  };

  const minDate = startOfToday();

  const renderTaskForm = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={[styles.label, { color: theme.text }]}>Title *</Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
        value={title}
        onChangeText={setTitle}
        placeholder="What do you need to do?"
        placeholderTextColor={theme.textSecondary}
      />

      <Text style={[styles.label, { color: theme.text }]}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
        value={description}
        onChangeText={setDescription}
        placeholder="Add more details..."
        placeholderTextColor={theme.textSecondary}
        multiline
        numberOfLines={3}
      />

      <Text style={[styles.label, { color: theme.text }]}>Date</Text>
      <TouchableOpacity
        style={[styles.pickerButton, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => setShowDatePicker(true)}
      >
        <Ionicons name="calendar" size={20} color={theme.primary} />
        <Text style={[styles.pickerText, { color: theme.text }]}>
          {format(selectedDate, 'EEEE, MMM dd, yyyy')}
        </Text>
        <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={minDate}
          onChange={(event, date) => {
            if (Platform.OS !== 'ios') setShowDatePicker(false);
            if (date) setSelectedDate(date);
          }}
        />
      )}

      <Text style={[styles.label, { color: theme.text }]}>Time</Text>
      <TouchableOpacity
        style={[styles.pickerButton, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => setShowTimePicker(true)}
      >
        <Ionicons name="time" size={20} color={theme.primary} />
        <Text style={[styles.pickerText, { color: theme.text }]}>
          {format(selectedTime, 'h:mm a')}
        </Text>
        <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
      </TouchableOpacity>

      {showTimePicker && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, time) => {
            if (Platform.OS !== 'ios') setShowTimePicker(false);
            if (time) setSelectedTime(time);
          }}
        />
      )}

      <Text style={[styles.label, { color: theme.text }]}>Category</Text>
      <View style={styles.categoryGrid}>
        {categories.map(category => {
          const config = CATEGORY_CONFIG[category];
          const isSelected = selectedCategory === category;
          return (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                { 
                  backgroundColor: isSelected ? config.color : theme.card,
                  borderColor: config.color,
                },
              ]}
              onPress={() => {
                playClickSound(preferences.soundEnabled);
                setSelectedCategory(category);
              }}
            >
              <Ionicons name={config.icon as any} size={16} color={isSelected ? '#FFFFFF' : config.color} />
              <Text style={[styles.categoryText, { color: isSelected ? '#FFFFFF' : config.color }]}>
                {category}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.reminderRow}>
        <View style={styles.reminderLabel}>
          <Ionicons name="notifications" size={20} color={theme.primary} />
          <Text style={[styles.reminderText, { color: theme.text }]}>Enable Alarm</Text>
        </View>
        <Switch
          value={reminderEnabled}
          onValueChange={(val) => {
            playClickSound(preferences.soundEnabled);
            setReminderEnabled(val);
          }}
          trackColor={{ false: theme.border, true: theme.primary }}
          thumbColor="#FFFFFF"
        />
      </View>

      {reminderEnabled && (
        <>
          <Text style={[styles.label, { color: theme.text }]}>Alarm Sound</Text>
          <TouchableOpacity
            style={[styles.pickerButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => setShowRingtonePicker(!showRingtonePicker)}
          >
            <Ionicons name="musical-notes" size={20} color={theme.primary} />
            <Text style={[styles.pickerText, { color: theme.text, flex: 1 }]}>
              {allRingtones.find(r => r.id === selectedRingtone)?.label || 'Default Alarm'}
            </Text>
            <Ionicons name={showRingtonePicker ? "chevron-up" : "chevron-down"} size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          {showRingtonePicker && (
            <View style={[styles.ringtoneList, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                {allRingtones.map((ringtone, index) => (
                  <TouchableOpacity
                    key={ringtone.id}
                    style={[
                      styles.ringtoneItem,
                      selectedRingtone === ringtone.id && { backgroundColor: theme.primary + '20' },
                      index < allRingtones.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                    ]}
                    onPress={() => {
                      playClickSound(preferences.soundEnabled);
                      setSelectedRingtone(ringtone.id);
                      setShowRingtonePicker(false);
                    }}
                  >
                    <Text style={[styles.ringtoneText, { color: theme.text }]}>{ringtone.label}</Text>
                    {selectedRingtone === ringtone.id && (
                      <Ionicons name="checkmark" size={20} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={[styles.uploadButton, { borderTopWidth: 2, borderTopColor: theme.border }]}
                onPress={pickAudioFile}
              >
                <Ionicons name="cloud-upload" size={20} color={theme.primary} />
                <Text style={[styles.uploadButtonText, { color: theme.primary }]}>Upload Custom Audio</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Toast */}
      <Toast visible={toastVisible} message={toastMessage} type={toastType} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Tasks</Text>
        <TouchableOpacity 
          onPress={() => {
            playClickSound(preferences.soundEnabled);
            resetForm();
            setShowAddModal(true);
          }}
          style={[styles.addButton, { backgroundColor: theme.primary }]}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Quick Add */}
      <TouchableOpacity 
        style={[styles.quickAddButton, { backgroundColor: theme.primary + '15', borderColor: theme.primary }]}
        onPress={() => {
          playClickSound(preferences.soundEnabled);
          resetForm();
          setShowAddModal(true);
        }}
      >
        <Ionicons name="add-circle" size={24} color={theme.primary} />
        <Text style={[styles.quickAddText, { color: theme.primary }]}>Add New Task</Text>
      </TouchableOpacity>

      {/* Instructions */}
      <View style={styles.instructionContainer}>
        <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
          Tap ⋮ menu to Edit or Delete • Tap date/time to change quickly
        </Text>
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && { backgroundColor: theme.primary }]}
          onPress={() => { playClickSound(preferences.soundEnabled); setFilter('all'); }}
        >
          <Text style={[styles.filterText, { color: filter === 'all' ? '#FFFFFF' : theme.textSecondary }]}>All</Text>
        </TouchableOpacity>
        
        {categories.map(category => {
          const config = CATEGORY_CONFIG[category];
          const isActive = filter === category;
          return (
            <TouchableOpacity
              key={category}
              style={[
                styles.filterTab,
                isActive && { backgroundColor: config.color },
                !isActive && { borderWidth: 1, borderColor: config.color },
              ]}
              onPress={() => { playClickSound(preferences.soundEnabled); setFilter(category); }}
            >
              <Ionicons name={config.icon as any} size={14} color={isActive ? '#FFFFFF' : config.color} />
              <Text style={[styles.filterText, { color: isActive ? '#FFFFFF' : config.color, marginLeft: 6 }]}>
                {category}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Tasks List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredTasks.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="clipboard-outline" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No tasks found</Text>
            <TouchableOpacity onPress={() => { playClickSound(preferences.soundEnabled); setShowAddModal(true); }}>
              <Text style={[styles.addLinkText, { color: theme.primary }]}>Add a new task</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredTasks.map(task => (
            <TaskCardWithActions
              key={task._id}
              task={task}
              onComplete={() => task._id && handleCompleteTask(task._id)}
              onEdit={() => openEditModal(task)}
              onDelete={() => handleDeleteTask(task)}
              onDateChange={(newDate) => handleDateChange(task, newDate)}
              onTimeChange={(newTime) => handleTimeChange(task, newTime)}
            />
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Quick Date Picker Modal */}
      {showQuickDatePicker && quickEditTask && (
        <Modal visible={true} transparent animationType="fade">
          <View style={styles.pickerModalOverlay}>
            <View style={[styles.pickerModalContent, { backgroundColor: theme.surface }]}>
              <Text style={[styles.pickerModalTitle, { color: theme.text }]}>Select Date</Text>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                minimumDate={minDate}
                onChange={handleQuickDateChange}
                style={{ height: 150 }}
              />
              <TouchableOpacity
                style={[styles.pickerModalButton, { backgroundColor: theme.primary }]}
                onPress={() => { setShowQuickDatePicker(false); setQuickEditTask(null); }}
              >
                <Text style={styles.pickerModalButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Quick Time Picker Modal */}
      {showQuickTimePicker && quickEditTask && (
        <Modal visible={true} transparent animationType="fade">
          <View style={styles.pickerModalOverlay}>
            <View style={[styles.pickerModalContent, { backgroundColor: theme.surface }]}>
              <Text style={[styles.pickerModalTitle, { color: theme.text }]}>Select Time</Text>
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display="spinner"
                onChange={handleQuickTimeChange}
                style={{ height: 150 }}
              />
              <TouchableOpacity
                style={[styles.pickerModalButton, { backgroundColor: theme.primary }]}
                onPress={() => { setShowQuickTimePicker(false); setQuickEditTask(null); }}
              >
                <Text style={styles.pickerModalButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Add Task Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent={true} onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>New Task</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>
            {renderTaskForm()}
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.cancelButton, { backgroundColor: theme.card }]} onPress={() => setShowAddModal(false)}>
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.primary }]} onPress={handleAddTask}>
                <Text style={styles.saveButtonText}>Add Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Task Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent={true} onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Task</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>
            {renderTaskForm()}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.deleteButtonModal, { backgroundColor: '#EF4444' + '20' }]}
                onPress={() => { 
                  setShowEditModal(false); 
                  if (selectedTask) handleDeleteTask(selectedTask); 
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.cancelButton, { backgroundColor: theme.card, flex: 1 }]} onPress={() => setShowEditModal(false)}>
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.primary, flex: 1 }]} onPress={handleEditTask}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: { fontSize: 32, fontWeight: 'bold' },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  quickAddText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
  instructionContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  instructionText: { fontSize: 12, textAlign: 'center' },
  filterScroll: { maxHeight: 50, marginBottom: 12 },
  filterContainer: { paddingHorizontal: 20, gap: 10 },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterText: { fontSize: 14, fontWeight: '600' },
  content: { flex: 1, paddingHorizontal: 20 },
  emptyContainer: {
    padding: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 32,
  },
  emptyText: { fontSize: 18, marginTop: 16, marginBottom: 8 },
  addLinkText: { fontSize: 16, fontWeight: '600' },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerModalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  pickerModalButton: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  pickerModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 24, fontWeight: 'bold' },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8, marginTop: 14 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 },
  textArea: { height: 80, textAlignVertical: 'top' },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  pickerText: { fontSize: 16, marginLeft: 12, flex: 1 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 10 },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
  },
  categoryText: { fontSize: 14, fontWeight: '600', marginLeft: 6 },
  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  reminderLabel: { flexDirection: 'row', alignItems: 'center' },
  reminderText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
  ringtoneList: { borderWidth: 1, borderRadius: 12, marginTop: 8, overflow: 'hidden' },
  ringtoneItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  ringtoneText: { fontSize: 15 },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  uploadButtonText: { fontSize: 15, fontWeight: '600', marginLeft: 8 },
  modalActions: { flexDirection: 'row', marginTop: 20, gap: 12 },
  deleteButtonModal: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  cancelButtonText: { fontSize: 16, fontWeight: '600' },
  saveButton: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
