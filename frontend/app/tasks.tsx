import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Platform, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppStore } from '../store/useAppStore';
import { TaskCard } from '../components/TaskCard';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isBefore, startOfToday } from 'date-fns';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, scheduleTaskNotification, cancelNotification } from '../utils/notifications';

const categories = ['Work', 'Health', 'Food', 'Personal'] as const;
const ringtones = [
  { label: 'Default', value: 'default' },
  { label: 'Bell', value: 'bell' },
  { label: 'Chime', value: 'chime' },
  { label: 'Alert', value: 'alert' },
];

export default function TasksScreen() {
  const { theme } = useTheme();
  const { tasks, addTask, completeTask, loadData } = useAppStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [permissionGranted, setPermissionGranted] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState<typeof categories[number]>('Personal');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [selectedRingtone, setSelectedRingtone] = useState('default');
  const [showRingtonePicker, setShowRingtonePicker] = useState(false);

  useEffect(() => {
    loadData();
    requestNotificationPermissions();
    setupNotificationHandlers();
  }, []);

  const requestNotificationPermissions = async () => {
    try {
      await registerForPushNotificationsAsync();
      setPermissionGranted(true);
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
    }
  };

  const setupNotificationHandlers = () => {
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data.action === 'reminder' && data.taskId) {
        handleNotificationResponse(data.taskId as string);
      }
    });

    return () => {
      responseSubscription.remove();
    };
  };

  const handleNotificationResponse = (taskId: string) => {
    const task = tasks.find(t => t._id === taskId);
    if (task) {
      Alert.alert(
        '⏰ Task Reminder',
        task.title,
        [
          {
            text: '✅ Mark Done',
            onPress: () => completeTask(taskId),
          },
          {
            text: '⏰ Snooze 5 min',
            onPress: () => snoozeTask(taskId, 5),
          },
          {
            text: '⏰ Snooze 10 min',
            onPress: () => snoozeTask(taskId, 10),
          },
          {
            text: 'Dismiss',
            style: 'cancel',
          },
        ]
      );
    }
  };

  const snoozeTask = async (taskId: string, minutes: number) => {
    const task = tasks.find(t => t._id === taskId);
    if (task) {
      const snoozeTime = new Date(Date.now() + minutes * 60 * 1000);
      
      if (task.notificationId) {
        await cancelNotification(task.notificationId);
      }
      
      const notificationId = await scheduleTaskNotification(
        taskId,
        task.title,
        snoozeTime,
        task.ringtone || 'default'
      );
      
      await useAppStore.getState().updateTask(taskId, {
        status: 'snoozed',
        snoozedUntil: snoozeTime.toISOString(),
        notificationId,
      });
      
      Alert.alert('Snoozed', `Reminder snoozed for ${minutes} minutes`);
    }
  };

  const filteredTasks = tasks
    .filter(task => filter === 'all' || task.status === filter)
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  const handleAddTask = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    const taskDateTime = new Date(selectedDate);
    taskDateTime.setHours(selectedTime.getHours());
    taskDateTime.setMinutes(selectedTime.getMinutes());

    // Validate future date/time
    if (isBefore(taskDateTime, new Date())) {
      Alert.alert('Invalid Time', 'Please select a future date and time');
      return;
    }

    let notificationId: string | undefined;

    // Schedule notification if reminder is enabled and permissions granted
    if (reminderEnabled && permissionGranted) {
      try {
        const taskId = Date.now().toString();
        notificationId = await scheduleTaskNotification(
          taskId,
          title.trim(),
          taskDateTime,
          selectedRingtone
        );
      } catch (error) {
        console.error('Error scheduling notification:', error);
        Alert.alert('Reminder Error', 'Could not schedule reminder. Task will be created without reminder.');
      }
    }

    await addTask({
      title: title.trim(),
      description: description.trim(),
      time: taskDateTime.toISOString(),
      category: selectedCategory,
      reminderEnabled,
      ringtone: selectedRingtone,
      notificationId,
    });

    // Reset form
    setTitle('');
    setDescription('');
    setSelectedDate(new Date());
    setSelectedTime(new Date());
    setReminderEnabled(true);
    setSelectedRingtone('default');
    setShowAddModal(false);
    
    Alert.alert('Success', reminderEnabled ? 'Task created with reminder!' : 'Task created!');
  };

  const minDate = startOfToday();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Tasks</Text>
        <TouchableOpacity 
          onPress={() => setShowAddModal(true)}
          style={[styles.addButton, { backgroundColor: theme.primary }]}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['all', 'pending', 'completed'] as const).map(filterOption => (
          <TouchableOpacity
            key={filterOption}
            style={[
              styles.filterTab,
              filter === filterOption && { backgroundColor: theme.primary },
            ]}
            onPress={() => setFilter(filterOption)}
          >
            <Text
              style={[
                styles.filterText,
                { color: filter === filterOption ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tasks List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredTasks.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="clipboard-outline" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No tasks found</Text>
            <TouchableOpacity onPress={() => setShowAddModal(true)}>
              <Text style={[styles.addText, { color: theme.primary }]}>Add a new task</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredTasks.map(task => (
            <TaskCard
              key={task._id}
              task={task}
              onPress={() => {}}
              onComplete={() => task._id && completeTask(task._id)}
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
                {categories.map(category => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      { 
                        backgroundColor: selectedCategory === category ? theme.primary : theme.card,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        { color: selectedCategory === category ? '#FFFFFF' : theme.text },
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Reminder Toggle */}
              <View style={styles.reminderRow}>
                <View style={styles.reminderLabel}>
                  <Ionicons name="notifications" size={20} color={theme.primary} />
                  <Text style={[styles.label, { color: theme.text, marginTop: 0, marginLeft: 8 }]}>
                    Enable Reminder
                  </Text>
                </View>
                <Switch
                  value={reminderEnabled}
                  onValueChange={setReminderEnabled}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor={reminderEnabled ? '#FFFFFF' : theme.textSecondary}
                />
              </View>

              {/* Ringtone Picker */}
              {reminderEnabled && (
                <>
                  <Text style={[styles.label, { color: theme.text }]}>Choose Reminder Sound</Text>
                  <TouchableOpacity
                    style={[styles.pickerButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={() => setShowRingtonePicker(!showRingtonePicker)}
                  >
                    <Ionicons name="musical-notes" size={20} color={theme.text} />
                    <Text style={[styles.pickerText, { color: theme.text }]}>
                      {ringtones.find(r => r.value === selectedRingtone)?.label || 'Default'}
                    </Text>
                    <Ionicons name={showRingtonePicker ? "chevron-up" : "chevron-down"} size={20} color={theme.textSecondary} />
                  </TouchableOpacity>

                  {showRingtonePicker && (
                    <View style={[styles.ringtoneList, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      {ringtones.map((ringtone, index) => (
                        <TouchableOpacity
                          key={ringtone.value}
                          style={[
                            styles.ringtoneItem,
                            selectedRingtone === ringtone.value && { backgroundColor: theme.primary + '20' },
                            index < ringtones.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                          ]}
                          onPress={() => {
                            setSelectedRingtone(ringtone.value);
                            setShowRingtonePicker(false);
                          }}
                        >
                          <Text style={[styles.ringtoneText, { color: theme.text }]}>
                            {ringtone.label}
                          </Text>
                          {selectedRingtone === ringtone.value && (
                            <Ionicons name="checkmark" size={20} color={theme.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}

              {!permissionGranted && reminderEnabled && (
                <View style={[styles.warningBox, { backgroundColor: theme.warning + '20', borderColor: theme.warning }]}>
                  <Ionicons name="warning" size={20} color={theme.warning} />
                  <Text style={[styles.warningText, { color: theme.text }]}>
                    Notification permissions not granted. Reminders won't work.
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Action Buttons */}
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
    paddingBottom: 20,
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
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
  addText: {
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
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
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
