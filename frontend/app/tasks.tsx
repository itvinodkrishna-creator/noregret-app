import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Platform, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppStore } from '../store/useAppStore';
import { TaskCard } from '../components/TaskCard';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, startOfToday } from 'date-fns';
import * as DocumentPicker from 'expo-document-picker';
import { registerForPushNotificationsAsync, getBuiltInSounds } from '../utils/notifications';
import { scheduleAlarm, cancelAlarmsForTask } from '../utils/alarmScheduler';

const categories = ['Work', 'Health', 'Food', 'Personal'] as const;

export default function TasksScreen() {
  const { theme } = useTheme();
  const { tasks, addTask, completeTask, loadData } = useAppStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [ringtones, setRingtones] = useState(getBuiltInSounds());
  
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
  const [selectedCategory, setSelectedCategory] = useState<typeof categories[number]>('Personal');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [selectedRingtone, setSelectedRingtone] = useState('default');
  const [showRingtonePicker, setShowRingtonePicker] = useState(false);

  useEffect(() => {
    loadData();
    requestNotificationPermissions();
  }, []);

  const pickAudioFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const audio = result.assets[0];
        const customSound = {
          label: `Custom: ${audio.name}`,
          value: audio.uri,
          url: audio.uri,
        };
        
        if (!ringtones.find(r => r.value === audio.uri)) {
          setRingtones([...ringtones, customSound]);
        }
        
        setSelectedRingtone(audio.uri);
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
      setPermissionGranted(true); // Allow on web
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

    // Combine date and time
    const taskDateTime = new Date(selectedDate);
    taskDateTime.setHours(selectedTime.getHours());
    taskDateTime.setMinutes(selectedTime.getMinutes());
    taskDateTime.setSeconds(0);
    taskDateTime.setMilliseconds(0);

    const now = new Date();
    const msUntilAlarm = taskDateTime.getTime() - now.getTime();
    const minutesUntil = Math.floor(msUntilAlarm / (1000 * 60));
    
    console.log('🕐 Creating task with alarm:');
    console.log(`   Current time: ${now.toLocaleTimeString()}`);
    console.log(`   Task time: ${taskDateTime.toLocaleTimeString()}`);
    console.log(`   Minutes until alarm: ${minutesUntil}`);
    
    // CRITICAL: Must be at least 1 minute in the future
    if (msUntilAlarm < 60000) {
      Alert.alert(
        '❌ Invalid Time', 
        `Please select a time at least 1 minute in the future.\n\nCurrent: ${format(now, 'h:mm a')}\nSelected: ${format(taskDateTime, 'h:mm a')}`
      );
      return;
    }

    let alarmId: string | undefined;
    const taskId = Date.now().toString();

    // Schedule alarm using our custom scheduler (works on web!)
    if (reminderEnabled) {
      try {
        console.log('📅 Scheduling alarm...');
        
        alarmId = scheduleAlarm(
          taskId,
          title.trim(),
          taskDateTime,
          selectedRingtone,
          description.trim()
        );
        
        console.log(`✅ Alarm scheduled! ID: ${alarmId}`);
        console.log(`⏰ Will trigger in ${minutesUntil} minutes`);
      } catch (error) {
        console.error('❌ Error scheduling alarm:', error);
        Alert.alert('Alarm Error', 'Could not schedule alarm. Task will be created without reminder.');
      }
    }

    // Save task
    await addTask({
      title: title.trim(),
      description: description.trim(),
      time: taskDateTime.toISOString(),
      category: selectedCategory,
      reminderEnabled,
      ringtone: selectedRingtone,
      notificationId: alarmId,
    });

    // Reset form with future default time
    setTitle('');
    setDescription('');
    const defaultTime = new Date();
    defaultTime.setMinutes(defaultTime.getMinutes() + 5);
    setSelectedDate(defaultTime);
    setSelectedTime(defaultTime);
    setReminderEnabled(true);
    setSelectedRingtone('default');
    setShowAddModal(false);
    
    // Show success message
    const timeStr = format(taskDateTime, 'MMM dd, h:mm a');
    Alert.alert(
      '✅ Task Created!', 
      reminderEnabled 
        ? `⏰ Alarm set for:\n${timeStr}\n\n⏱️ Will ring in ${minutesUntil} minute${minutesUntil !== 1 ? 's' : ''}` 
        : 'Task created without reminder'
    );
    
    console.log('✅ Task saved successfully');
  };

  const minDate = startOfToday();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header with Add Button */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Tasks</Text>
        <TouchableOpacity 
          onPress={() => setShowAddModal(true)}
          style={[styles.addButton, { backgroundColor: theme.primary }]}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Quick Add Task Button at top */}
      <TouchableOpacity 
        style={[styles.quickAddButton, { backgroundColor: theme.primary + '15', borderColor: theme.primary }]}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add-circle" size={24} color={theme.primary} />
        <Text style={[styles.quickAddText, { color: theme.primary }]}>Add New Task</Text>
      </TouchableOpacity>

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
              <Text style={[styles.addLinkText, { color: theme.primary }]}>Add a new task</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredTasks.map(task => (
            <TaskCard
              key={task._id}
              task={task}
              onPress={() => {}}
              onComplete={() => {
                if (task._id) {
                  completeTask(task._id);
                  cancelAlarmsForTask(task._id);
                }
              }}
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
                  <Text style={[styles.reminderText, { color: theme.text }]}>
                    Enable Alarm
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
                  <Text style={[styles.label, { color: theme.text }]}>Choose Alarm Sound</Text>
                  <TouchableOpacity
                    style={[styles.pickerButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={() => setShowRingtonePicker(!showRingtonePicker)}
                  >
                    <Ionicons name="musical-notes" size={20} color={theme.text} />
                    <Text style={[styles.pickerText, { color: theme.text, flex: 1 }]}>
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
                      
                      {/* Upload Audio Button */}
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
  },
  ringtoneItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  ringtoneText: {
    fontSize: 16,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'transparent',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
