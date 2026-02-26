import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Platform, Switch, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppStore } from '../store/useAppStore';
import { TaskCard } from '../components/TaskCard';
import { Task, CATEGORY_CONFIG, CategoryType } from '../types';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, startOfToday, parseISO } from 'date-fns';
import * as DocumentPicker from 'expo-document-picker';
import { registerForPushNotificationsAsync } from '../utils/notifications';
import { scheduleAlarm, cancelAlarmsForTask } from '../utils/alarmScheduler';
import { RINGTONES, getRingtoneLabel, playClickSound } from '../utils/sounds';

const categories: CategoryType[] = ['Work', 'Health', 'Food', 'Personal'];

export default function TasksScreen() {
  const { theme } = useTheme();
  const { tasks, addTask, updateTask, deleteTask, completeTask, loadData, preferences } = useAppStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | CategoryType>('all');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [customRingtones, setCustomRingtones] = useState<{id: string; label: string; url: string}[]>([]);
  
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
    requestNotificationPermissions();
  }, []);

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
        Alert.alert('Success', `Selected: ${audio.name}`);
      }
    } catch (error) {
      console.error('Error picking audio:', error);
      Alert.alert('Error', 'Could not pick audio file');
    }
  };

  const requestNotificationPermissions = async () => {
    try {
      await registerForPushNotificationsAsync();
      setPermissionGranted(true);
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      setPermissionGranted(true);
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
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    const taskDateTime = new Date(selectedDate);
    taskDateTime.setHours(selectedTime.getHours());
    taskDateTime.setMinutes(selectedTime.getMinutes());
    taskDateTime.setSeconds(0);
    taskDateTime.setMilliseconds(0);

    const now = new Date();
    const msUntilAlarm = taskDateTime.getTime() - now.getTime();
    const minutesUntil = Math.floor(msUntilAlarm / (1000 * 60));
    
    if (msUntilAlarm < 60000) {
      Alert.alert(
        '❌ Invalid Time', 
        `Please select a time at least 1 minute in the future.`
      );
      return;
    }

    let alarmId: string | undefined;
    const taskId = Date.now().toString();

    if (reminderEnabled) {
      try {
        alarmId = scheduleAlarm(
          taskId,
          title.trim(),
          taskDateTime,
          selectedRingtone,
          description.trim()
        );
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
    
    const timeStr = format(taskDateTime, 'MMM dd, h:mm a');
    Alert.alert(
      '✅ Task Created!', 
      reminderEnabled 
        ? `⏰ Alarm set for ${timeStr}` 
        : 'Task created without reminder'
    );
  };

  const handleEditTask = async () => {
    playClickSound(preferences.soundEnabled);
    
    if (!selectedTask || !title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    const taskDateTime = new Date(selectedDate);
    taskDateTime.setHours(selectedTime.getHours());
    taskDateTime.setMinutes(selectedTime.getMinutes());
    taskDateTime.setSeconds(0);
    taskDateTime.setMilliseconds(0);

    // Cancel old alarm if exists
    if (selectedTask.notificationId) {
      cancelAlarmsForTask(selectedTask._id || '');
    }

    let alarmId: string | undefined;

    if (reminderEnabled) {
      const now = new Date();
      const msUntilAlarm = taskDateTime.getTime() - now.getTime();
      
      if (msUntilAlarm >= 60000) {
        try {
          alarmId = scheduleAlarm(
            selectedTask._id || '',
            title.trim(),
            taskDateTime,
            selectedRingtone,
            description.trim()
          );
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
    Alert.alert('✅ Task Updated!');
  };

  const handleDeleteTask = (task: Task) => {
    playClickSound(preferences.soundEnabled);
    
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            if (task._id) {
              cancelAlarmsForTask(task._id);
              await deleteTask(task._id);
            }
          }
        },
      ]
    );
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

  const handleCompleteTask = (taskId: string) => {
    playClickSound(preferences.soundEnabled);
    completeTask(taskId);
    cancelAlarmsForTask(taskId);
  };

  const minDate = startOfToday();

  const renderTaskForm = (isEdit: boolean) => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Title Input */}
      <Text style={[styles.label, { color: theme.text }]}>Title *</Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
        value={title}
        onChangeText={setTitle}
        placeholder="Enter task title"
        placeholderTextColor={theme.textSecondary}
      />

      {/* Description Input */}
      <Text style={[styles.label, { color: theme.text }]}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
        value={description}
        onChangeText={setDescription}
        placeholder="Enter task description"
        placeholderTextColor={theme.textSecondary}
        multiline
        numberOfLines={3}
      />

      {/* Date Picker */}
      <Text style={[styles.label, { color: theme.text }]}>Date</Text>
      <TouchableOpacity
        style={[styles.pickerButton, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => setShowDatePicker(true)}
      >
        <Ionicons name="calendar-outline" size={20} color={theme.text} />
        <Text style={[styles.pickerText, { color: theme.text }]}>
          {format(selectedDate, 'MMM dd, yyyy')}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          minimumDate={minDate}
          onChange={(event, date) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (date) setSelectedDate(date);
          }}
        />
      )}

      {/* Time Picker */}
      <Text style={[styles.label, { color: theme.text }]}>Time</Text>
      <TouchableOpacity
        style={[styles.pickerButton, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => setShowTimePicker(true)}
      >
        <Ionicons name="time-outline" size={20} color={theme.text} />
        <Text style={[styles.pickerText, { color: theme.text }]}>
          {format(selectedTime, 'h:mm a')}
        </Text>
      </TouchableOpacity>

      {showTimePicker && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          display="default"
          onChange={(event, time) => {
            setShowTimePicker(Platform.OS === 'ios');
            if (time) setSelectedTime(time);
          }}
        />
      )}

      {/* Category Picker */}
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
              <Ionicons 
                name={config.icon as any} 
                size={16} 
                color={isSelected ? '#FFFFFF' : config.color} 
              />
              <Text
                style={[
                  styles.categoryText,
                  { color: isSelected ? '#FFFFFF' : config.color },
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Reminder Toggle */}
      <View style={styles.reminderRow}>
        <View style={styles.reminderLabel}>
          <Ionicons name="notifications" size={20} color={theme.primary} />
          <Text style={[styles.reminderText, { color: theme.text }]}>
            Enable Alarm
          </Text>
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

      {/* Ringtone Picker */}
      {reminderEnabled && (
        <>
          <Text style={[styles.label, { color: theme.text }]}>Alarm Sound</Text>
          <TouchableOpacity
            style={[styles.pickerButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => setShowRingtonePicker(!showRingtonePicker)}
          >
            <Ionicons name="musical-notes" size={20} color={theme.text} />
            <Text style={[styles.pickerText, { color: theme.text, flex: 1 }]}>
              {allRingtones.find(r => r.id === selectedRingtone)?.label || 'Default Alarm'}
            </Text>
            <Ionicons name={showRingtonePicker ? "chevron-up" : "chevron-down"} size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          {showRingtonePicker && (
            <View style={[styles.ringtoneList, { backgroundColor: theme.card, borderColor: theme.border }]}>
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
                  <Text style={[styles.ringtoneText, { color: theme.text }]}>
                    {ringtone.label}
                  </Text>
                  {selectedRingtone === ringtone.id && (
                    <Ionicons name="checkmark" size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity
                style={[styles.uploadButton, { borderTopWidth: 2, borderTopColor: theme.border }]}
                onPress={pickAudioFile}
              >
                <Ionicons name="cloud-upload" size={20} color={theme.primary} />
                <Text style={[styles.uploadButtonText, { color: theme.primary }]}>
                  Upload Custom Audio
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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

      {/* Quick Add Button */}
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

      {/* Category Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === 'all' && { backgroundColor: theme.primary },
          ]}
          onPress={() => {
            playClickSound(preferences.soundEnabled);
            setFilter('all');
          }}
        >
          <Text style={[
            styles.filterText,
            { color: filter === 'all' ? '#FFFFFF' : theme.textSecondary },
          ]}>
            All
          </Text>
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
              onPress={() => {
                playClickSound(preferences.soundEnabled);
                setFilter(category);
              }}
            >
              <Ionicons 
                name={config.icon as any} 
                size={14} 
                color={isActive ? '#FFFFFF' : config.color} 
              />
              <Text style={[
                styles.filterText,
                { color: isActive ? '#FFFFFF' : config.color, marginLeft: 6 },
              ]}>
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
            <TouchableOpacity onPress={() => {
              playClickSound(preferences.soundEnabled);
              setShowAddModal(true);
            }}>
              <Text style={[styles.addLinkText, { color: theme.primary }]}>Add a new task</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredTasks.map(task => (
            <TaskCard
              key={task._id}
              task={task}
              onPress={() => openEditModal(task)}
              onComplete={() => task._id && handleCompleteTask(task._id)}
              onLongPress={() => handleDeleteTask(task)}
            />
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Task Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>New Task</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>
            {renderTaskForm(false)}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.card }]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.primary }]}
                onPress={handleAddTask}
              >
                <Text style={styles.saveButtonText}>Add Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Task Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Task</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>
            {renderTaskForm(true)}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.deleteButton, { backgroundColor: '#EF4444' + '20' }]}
                onPress={() => {
                  setShowEditModal(false);
                  if (selectedTask) handleDeleteTask(selectedTask);
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.card, flex: 1 }]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.primary, flex: 1 }]}
                onPress={handleEditTask}
              >
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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
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
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  quickAddText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  filterScroll: {
    maxHeight: 50,
    marginBottom: 16,
  },
  filterContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    padding: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 32,
  },
  emptyText: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 8,
  },
  addLinkText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  pickerText: {
    fontSize: 16,
    marginLeft: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 10,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  reminderLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  ringtoneList: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
    maxHeight: 250,
  },
  ringtoneItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  ringtoneText: {
    fontSize: 15,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: 'transparent',
  },
  uploadButtonText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  deleteButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
