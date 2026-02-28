import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Switch, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppStore } from '../store/useAppStore';
import { TaskCardWithActions } from '../components/TaskCardWithActions';
import { Toast } from '../components/Toast';
import { DatePickerModal, TimePickerModal } from '../components/CustomPickers';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { Task, CATEGORY_CONFIG, CategoryType, STATUS_CONFIG } from '../types';
import { format, startOfToday, parseISO } from 'date-fns';
import * as DocumentPicker from 'expo-document-picker';
import { registerForPushNotificationsAsync } from '../utils/notifications';
import { scheduleAlarm, cancelAlarmsForTask } from '../utils/alarmScheduler';
import { RINGTONES, playClickSound, previewRingtone, stopRingtonePreview, getRingtoneLabel } from '../utils/sounds';

const categories: CategoryType[] = ['Work', 'Health', 'Food', 'Personal'];

type StatusTab = 'pending' | 'completed' | 'attempted' | 'missed';

export default function TasksScreen() {
  const { theme } = useTheme();
  const { tasks, addTask, updateTask, deleteTask, completeTask, loadData, preferences, getPendingTasks, getCompletedTasks, getAttemptedTasks, getMissedTasks, markTaskAsDone } = useAppStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | CategoryType>('all');
  const [customRingtones, setCustomRingtones] = useState<{id: string; label: string; url: string}[]>([]);
  const [statusTab, setStatusTab] = useState<StatusTab>('pending');
  
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
  const [voiceReadingEnabled, setVoiceReadingEnabled] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [taskVoiceUri, setTaskVoiceUri] = useState<string | null>(null);
  const [isRecordingTitle, setIsRecordingTitle] = useState(false);
  
  // Weekly recurring state
  const [recurringType, setRecurringType] = useState<'none' | 'daily' | 'weekly'>('none');
  const [recurringDay, setRecurringDay] = useState<number>(1); // Monday by default

  const DAYS_OF_WEEK = [
    { id: 0, label: 'Sunday', short: 'Sun' },
    { id: 1, label: 'Monday', short: 'Mon' },
    { id: 2, label: 'Tuesday', short: 'Tue' },
    { id: 3, label: 'Wednesday', short: 'Wed' },
    { id: 4, label: 'Thursday', short: 'Thu' },
    { id: 5, label: 'Friday', short: 'Fri' },
    { id: 6, label: 'Saturday', short: 'Sat' },
  ];

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

  // Get tasks based on current tab
  const getTasksForTab = () => {
    switch (statusTab) {
      case 'pending':
        return getPendingTasks();
      case 'completed':
        return getCompletedTasks();
      case 'attempted':
        return getAttemptedTasks();
      case 'missed':
        return getMissedTasks();
      default:
        return getPendingTasks();
    }
  };

  const filteredTasks = getTasksForTab()
    .filter(task => filter === 'all' || task.category === filter);

  // Count for badges
  const pendingCount = getPendingTasks().length;
  const completedCount = getCompletedTasks().length;
  const attemptedCount = getAttemptedTasks().length;
  const missedCount = getMissedTasks().length;

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
    setVoiceReadingEnabled(false);
    setRecurringType('none');
    setRecurringDay(1);
    setTaskVoiceUri(null);
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

    // For weekly recurring, calculate the next occurrence
    let finalDateTime = taskDateTime;
    if (recurringType === 'weekly') {
      const today = new Date();
      const todayDay = today.getDay();
      let daysUntilTarget = recurringDay - todayDay;
      if (daysUntilTarget < 0) daysUntilTarget += 7;
      if (daysUntilTarget === 0) {
        // If same day, check if time has passed
        const targetTime = new Date(today);
        targetTime.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
        if (today > targetTime) {
          daysUntilTarget = 7; // Next week
        }
      }
      finalDateTime = new Date(today);
      finalDateTime.setDate(today.getDate() + daysUntilTarget);
      finalDateTime.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
    }

    const now = new Date();
    const msUntilAlarm = finalDateTime.getTime() - now.getTime();
    
    if (msUntilAlarm < 60000) {
      showToast('Please select a time at least 1 minute in the future', 'error');
      return;
    }

    let alarmId: string | undefined;
    const taskId = Date.now().toString();

    if (reminderEnabled) {
      try {
        alarmId = await scheduleAlarm(
          taskId, 
          title.trim(), 
          finalDateTime, 
          selectedRingtone, 
          description.trim(),
          taskVoiceUri || undefined,
          voiceReadingEnabled
        );
      } catch (error) {
        console.error('Error scheduling alarm:', error);
      }
    }

    await addTask({
      title: title.trim(),
      description: description.trim(),
      time: finalDateTime.toISOString(),
      category: selectedCategory,
      status: 'pending',
      reminderEnabled,
      ringtone: selectedRingtone,
      notificationId: alarmId,
      voiceReadingEnabled,
      voiceUri: taskVoiceUri || undefined,
      recurringType,
      recurringDay: recurringType === 'weekly' ? recurringDay : undefined,
    });

    resetForm();
    setShowAddModal(false);
    const recurringInfo = recurringType === 'weekly' 
      ? ` (Every ${DAYS_OF_WEEK[recurringDay].label})` 
      : recurringType === 'daily' ? ' (Daily)' : '';
    showToast(`Task Created Successfully!${recurringInfo}`, 'success');
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

  // Unified handler for date/time change from TaskCard
  const handleDateTimeChange = async (task: Task, newDateTime: Date) => {
    if (!task._id) return;
    
    playClickSound(preferences.soundEnabled);
    cancelAlarmsForTask(task._id);
    
    let alarmId: string | undefined;
    if (task.reminderEnabled) {
      const now = new Date();
      const msUntilAlarm = newDateTime.getTime() - now.getTime();
      if (msUntilAlarm >= 60000) {
        try {
          alarmId = scheduleAlarm(task._id, task.title, newDateTime, task.ringtone || 'default');
        } catch (error) {
          console.error('Error scheduling alarm:', error);
        }
      }
    }
    
    await updateTask(task._id, { 
      time: newDateTime.toISOString(),
      notificationId: alarmId,
    });
    showToast('Date/Time Updated!', 'success');
  };

  // New handler for date change from TaskCard
  const handleDateChange = async (task: Task, newDate: Date) => {
    if (!task._id) return;
    
    playClickSound(preferences.soundEnabled);
    cancelAlarmsForTask(task._id);
    
    let alarmId: string | undefined;
    if (task.reminderEnabled) {
      const now = new Date();
      const msUntilAlarm = newDate.getTime() - now.getTime();
      if (msUntilAlarm >= 60000) {
        try {
          alarmId = scheduleAlarm(task._id, task.title, newDate, task.ringtone || 'default');
        } catch (error) {}
      }
    }
    
    await updateTask(task._id, { 
      time: newDate.toISOString(),
      notificationId: alarmId,
    });
    showToast('Date Updated!', 'success');
  };

  // New handler for time change from TaskCard
  const handleTimeChange = async (task: Task, newTime: Date) => {
    if (!task._id) return;
    
    playClickSound(preferences.soundEnabled);
    cancelAlarmsForTask(task._id);
    
    let alarmId: string | undefined;
    if (task.reminderEnabled) {
      const now = new Date();
      const msUntilAlarm = newTime.getTime() - now.getTime();
      if (msUntilAlarm >= 60000) {
        try {
          alarmId = scheduleAlarm(task._id, task.title, newTime, task.ringtone || 'default');
        } catch (error) {}
      }
    }
    
    await updateTask(task._id, { 
      time: newTime.toISOString(),
      notificationId: alarmId,
    });
    showToast('Time Updated!', 'success');
  };

  // Quick date edit - Opens modal with date picker
  const handleQuickDateEdit = (task: Task) => {
    playClickSound(preferences.soundEnabled);
    setQuickEditTask(task);
    setShowQuickDatePicker(true);
  };

  // Quick time edit - Opens modal with time picker
  const handleQuickTimeEdit = (task: Task) => {
    playClickSound(preferences.soundEnabled);
    setQuickEditTask(task);
    setShowQuickTimePicker(true);
  };

  const minDate = startOfToday();

  // Open date picker for form
  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  // Open time picker for form
  const openTimePicker = () => {
    setShowTimePicker(true);
  };

  const renderTaskForm = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={[styles.label, { color: theme.text }]}>Title *</Text>
      <View style={styles.titleInputRow}>
        <TextInput
          style={[styles.input, styles.titleInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
          value={title}
          onChangeText={setTitle}
          placeholder="What do you need to do?"
          placeholderTextColor={theme.textSecondary}
        />
        <TouchableOpacity
          style={[styles.voiceTitleButton, { backgroundColor: taskVoiceUri ? '#10B981' : theme.primary }]}
          onPress={() => setIsRecordingTitle(true)}
        >
          <Ionicons name={taskVoiceUri ? "checkmark-circle" : "mic"} size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      {taskVoiceUri && (
        <View style={[styles.voiceAttachedBadge, { backgroundColor: '#10B98120', borderColor: '#10B981' }]}>
          <Ionicons name="volume-high" size={16} color="#10B981" />
          <Text style={styles.voiceAttachedText}>Voice message attached - will play at alarm time</Text>
          <TouchableOpacity onPress={() => setTaskVoiceUri(null)}>
            <Ionicons name="close-circle" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      )}

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
      <Pressable
        style={[styles.pickerButton, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => {
          console.log('Date field pressed');
          openDatePicker();
        }}
      >
        <Ionicons name="calendar" size={20} color="#10B981" />
        <Text style={[styles.pickerText, { color: theme.text }]}>
          {format(selectedDate, 'dd-MM-yyyy')}
        </Text>
        <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
      </Pressable>

      <Text style={[styles.label, { color: theme.text }]}>Time</Text>
      <Pressable
        style={[styles.pickerButton, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => {
          console.log('Time field pressed');
          openTimePicker();
        }}
      >
        <Ionicons name="time" size={20} color="#F97316" />
        <Text style={[styles.pickerText, { color: theme.text }]}>
          {format(selectedTime, 'h:mm a')}
        </Text>
        <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
      </Pressable>

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
              <Text style={[styles.ringtoneListHint, { color: theme.textSecondary }]}>
                Tap to preview and select
              </Text>
              <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                {allRingtones.map((ringtone, index) => (
                  <TouchableOpacity
                    key={ringtone.id}
                    style={[
                      styles.ringtoneItem,
                      selectedRingtone === ringtone.id && { backgroundColor: theme.primary + '20' },
                      index < allRingtones.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                    ]}
                    onPress={async () => {
                      playClickSound(preferences.soundEnabled);
                      // Preview the ringtone immediately
                      await previewRingtone(ringtone.id);
                      setSelectedRingtone(ringtone.id);
                    }}
                  >
                    <View style={styles.ringtoneItemContent}>
                      <Ionicons 
                        name={selectedRingtone === ringtone.id ? "radio-button-on" : "radio-button-off"} 
                        size={20} 
                        color={selectedRingtone === ringtone.id ? theme.primary : theme.textSecondary} 
                      />
                      <Text style={[styles.ringtoneText, { color: theme.text }]}>{ringtone.label}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={async (e) => {
                        e.stopPropagation?.();
                        await previewRingtone(ringtone.id);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="play-circle" size={24} color={theme.primary} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.ringtoneActionsRow}>
                <TouchableOpacity
                  style={[styles.uploadButton, { flex: 1 }]}
                  onPress={pickAudioFile}
                >
                  <Ionicons name="cloud-upload" size={20} color={theme.primary} />
                  <Text style={[styles.uploadButtonText, { color: theme.primary }]}>Upload</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.recordVoiceButton, { flex: 1 }]}
                  onPress={() => {
                    setShowRingtonePicker(false);
                    setShowVoiceRecorder(true);
                  }}
                >
                  <Ionicons name="mic" size={20} color="#EF4444" />
                  <Text style={[styles.recordVoiceButtonText, { color: '#EF4444' }]}>Record Voice</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.doneButton, { backgroundColor: theme.primary }]}
                onPress={async () => {
                  await stopRingtonePreview();
                  setShowRingtonePicker(false);
                }}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Voice Reading Toggle */}
      {reminderEnabled && (
        <View style={[styles.voiceToggleContainer, { borderTopColor: theme.border }]}>
          <View style={styles.voiceToggleLeft}>
            <Ionicons name="mic" size={22} color="#10B981" />
            <View style={styles.voiceToggleInfo}>
              <Text style={[styles.voiceToggleTitle, { color: theme.text }]}>Voice Reading</Text>
              <Text style={[styles.voiceToggleSubtitle, { color: theme.textSecondary }]}>
                Read task title aloud at alarm time
              </Text>
            </View>
          </View>
          <Switch
            value={voiceReadingEnabled}
            onValueChange={setVoiceReadingEnabled}
            trackColor={{ false: theme.border, true: theme.primary + '80' }}
            thumbColor={voiceReadingEnabled ? theme.primary : '#f4f3f4'}
          />
        </View>
      )}

      {/* Recurring Task Options */}
      {reminderEnabled && (
        <View style={[styles.recurringContainer, { borderTopColor: theme.border }]}>
          <View style={styles.recurringHeader}>
            <Ionicons name="repeat" size={22} color="#8B5CF6" />
            <Text style={[styles.recurringTitle, { color: theme.text }]}>Repeat</Text>
          </View>
          
          <View style={styles.recurringTypeRow}>
            {[
              { id: 'none', label: 'Once', icon: 'radio-button-off' },
              { id: 'daily', label: 'Daily', icon: 'sunny' },
              { id: 'weekly', label: 'Weekly', icon: 'calendar' },
            ].map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.recurringTypeButton,
                  { 
                    backgroundColor: recurringType === type.id ? '#8B5CF6' : theme.card,
                    borderColor: '#8B5CF6',
                  },
                ]}
                onPress={() => {
                  playClickSound(preferences.soundEnabled);
                  setRecurringType(type.id as 'none' | 'daily' | 'weekly');
                }}
              >
                <Ionicons 
                  name={type.icon as any} 
                  size={16} 
                  color={recurringType === type.id ? '#FFFFFF' : '#8B5CF6'} 
                />
                <Text style={[
                  styles.recurringTypeText, 
                  { color: recurringType === type.id ? '#FFFFFF' : '#8B5CF6' }
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Day Selection for Weekly */}
          {recurringType === 'weekly' && (
            <View style={styles.weeklyDayContainer}>
              <Text style={[styles.weeklyDayLabel, { color: theme.textSecondary }]}>
                Select day of the week:
              </Text>
              <View style={styles.weeklyDayGrid}>
                {DAYS_OF_WEEK.map((day) => (
                  <TouchableOpacity
                    key={day.id}
                    style={[
                      styles.weeklyDayButton,
                      { 
                        backgroundColor: recurringDay === day.id ? '#8B5CF6' : theme.card,
                        borderColor: recurringDay === day.id ? '#8B5CF6' : theme.border,
                      },
                    ]}
                    onPress={() => {
                      playClickSound(preferences.soundEnabled);
                      setRecurringDay(day.id);
                    }}
                  >
                    <Text style={[
                      styles.weeklyDayText, 
                      { color: recurringDay === day.id ? '#FFFFFF' : theme.text }
                    ]}>
                      {day.short}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.weeklyDayInfo, { color: theme.textSecondary }]}>
                Alarm will repeat every {DAYS_OF_WEEK[recurringDay].label} at {format(selectedTime, 'h:mm a')}
              </Text>
            </View>
          )}

          {recurringType === 'daily' && (
            <Text style={[styles.recurringInfo, { color: theme.textSecondary }]}>
              Alarm will repeat every day at {format(selectedTime, 'h:mm a')}
            </Text>
          )}
        </View>
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

      {/* Status Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusTabScroll}>
        <View style={styles.statusTabContainer}>
          <TouchableOpacity
            style={[
              styles.statusTab,
              statusTab === 'pending' && styles.statusTabActive,
              statusTab === 'pending' && { backgroundColor: '#F59E0B' },
            ]}
            onPress={() => { playClickSound(preferences.soundEnabled); setStatusTab('pending'); }}
          >
            <Ionicons name="time-outline" size={14} color={statusTab === 'pending' ? '#FFFFFF' : theme.textSecondary} />
            <Text style={[styles.statusTabText, { color: statusTab === 'pending' ? '#FFFFFF' : theme.textSecondary }]}>
              Pending
            </Text>
            {pendingCount > 0 && (
              <View style={[styles.statusBadge, { backgroundColor: statusTab === 'pending' ? '#FFFFFF' : '#F59E0B' }]}>
                <Text style={[styles.statusBadgeText, { color: statusTab === 'pending' ? '#F59E0B' : '#FFFFFF' }]}>
                  {pendingCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.statusTab,
              statusTab === 'completed' && styles.statusTabActive,
              statusTab === 'completed' && { backgroundColor: '#10B981' },
            ]}
            onPress={() => { playClickSound(preferences.soundEnabled); setStatusTab('completed'); }}
          >
            <Ionicons name="checkmark-circle" size={14} color={statusTab === 'completed' ? '#FFFFFF' : theme.textSecondary} />
            <Text style={[styles.statusTabText, { color: statusTab === 'completed' ? '#FFFFFF' : theme.textSecondary }]}>
              Done
            </Text>
            {completedCount > 0 && (
              <View style={[styles.statusBadge, { backgroundColor: statusTab === 'completed' ? '#FFFFFF' : '#10B981' }]}>
                <Text style={[styles.statusBadgeText, { color: statusTab === 'completed' ? '#10B981' : '#FFFFFF' }]}>
                  {completedCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statusTab,
              statusTab === 'attempted' && styles.statusTabActive,
              statusTab === 'attempted' && { backgroundColor: '#3B82F6' },
            ]}
            onPress={() => { playClickSound(preferences.soundEnabled); setStatusTab('attempted'); }}
          >
            <Ionicons name="checkmark-done" size={14} color={statusTab === 'attempted' ? '#FFFFFF' : theme.textSecondary} />
            <Text style={[styles.statusTabText, { color: statusTab === 'attempted' ? '#FFFFFF' : theme.textSecondary }]}>
              Attempted
            </Text>
            {attemptedCount > 0 && (
              <View style={[styles.statusBadge, { backgroundColor: statusTab === 'attempted' ? '#FFFFFF' : '#3B82F6' }]}>
                <Text style={[styles.statusBadgeText, { color: statusTab === 'attempted' ? '#3B82F6' : '#FFFFFF' }]}>
                  {attemptedCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statusTab,
              statusTab === 'missed' && styles.statusTabActive,
              statusTab === 'missed' && { backgroundColor: '#EF4444' },
            ]}
            onPress={() => { playClickSound(preferences.soundEnabled); setStatusTab('missed'); }}
          >
            <Ionicons name="close-circle" size={14} color={statusTab === 'missed' ? '#FFFFFF' : theme.textSecondary} />
            <Text style={[styles.statusTabText, { color: statusTab === 'missed' ? '#FFFFFF' : theme.textSecondary }]}>
              Missed
            </Text>
            {missedCount > 0 && (
              <View style={[styles.statusBadge, { backgroundColor: statusTab === 'missed' ? '#FFFFFF' : '#EF4444' }]}>
                <Text style={[styles.statusBadgeText, { color: statusTab === 'missed' ? '#EF4444' : '#FFFFFF' }]}>
                  {missedCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

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
              onDateTimeChange={(newDateTime) => handleDateTimeChange(task, newDateTime)}
            />
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

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

      {/* Date Picker Modal - Using Custom Picker */}
      <DatePickerModal
        visible={showDatePicker}
        value={selectedDate}
        minDate={minDate}
        onSelect={(date) => {
          setSelectedDate(date);
        }}
        onClose={() => setShowDatePicker(false)}
      />

      {/* Time Picker Modal - Using Custom Picker */}
      <TimePickerModal
        visible={showTimePicker}
        value={selectedTime}
        onSelect={(time) => {
          setSelectedTime(time);
        }}
        onClose={() => setShowTimePicker(false)}
      />

      {/* Quick Date Picker Modal - Using Custom Picker */}
      <DatePickerModal
        visible={showQuickDatePicker && !!quickEditTask}
        value={quickEditTask ? parseISO(quickEditTask.time) : new Date()}
        minDate={minDate}
        onSelect={(date) => {
          if (quickEditTask && quickEditTask._id) {
            const newDateTime = new Date(date);
            const oldTime = parseISO(quickEditTask.time);
            newDateTime.setHours(oldTime.getHours());
            newDateTime.setMinutes(oldTime.getMinutes());
            handleDateChange(quickEditTask, newDateTime);
          }
          setShowQuickDatePicker(false);
          setQuickEditTask(null);
        }}
        onClose={() => {
          setShowQuickDatePicker(false);
          setQuickEditTask(null);
        }}
      />

      {/* Quick Time Picker Modal - Using Custom Picker */}
      <TimePickerModal
        visible={showQuickTimePicker && !!quickEditTask}
        value={quickEditTask ? parseISO(quickEditTask.time) : new Date()}
        onSelect={(time) => {
          if (quickEditTask && quickEditTask._id) {
            const newDateTime = parseISO(quickEditTask.time);
            newDateTime.setHours(time.getHours());
            newDateTime.setMinutes(time.getMinutes());
            handleTimeChange(quickEditTask, newDateTime);
          }
          setShowQuickTimePicker(false);
          setQuickEditTask(null);
        }}
        onClose={() => {
          setShowQuickTimePicker(false);
          setQuickEditTask(null);
        }}
      />

      {/* Voice Recorder Modal */}
      <VoiceRecorder
        visible={showVoiceRecorder}
        onClose={() => setShowVoiceRecorder(false)}
        onSave={(recordingUri, recordingName) => {
          const newRingtone = {
            id: `voice_${Date.now()}`,
            label: recordingName,
            url: recordingUri,
          };
          setCustomRingtones(prev => [...prev, newRingtone]);
          setSelectedRingtone(newRingtone.id);
          showToast('Voice recording saved!', 'success');
        }}
      />

      {/* Voice Recorder Modal for Task Title */}
      <VoiceRecorder
        visible={isRecordingTitle}
        onClose={() => setIsRecordingTitle(false)}
        onSave={(recordingUri, recordingName) => {
          setTaskVoiceUri(recordingUri);
          showToast('Voice message attached! It will play at alarm time.', 'success');
        }}
      />
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
  ringtoneListHint: { fontSize: 12, textAlign: 'center', paddingVertical: 8, fontStyle: 'italic' },
  ringtoneItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  ringtoneItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  ringtoneText: { fontSize: 15 },
  doneButton: {
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  doneButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  uploadButtonText: { fontSize: 14, fontWeight: '600', marginLeft: 6 },
  ringtoneActionsRow: {
    flexDirection: 'row',
    borderTopWidth: 2,
    borderTopColor: '#333',
  },
  recordVoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderLeftWidth: 1,
    borderLeftColor: '#333',
  },
  recordVoiceButtonText: { fontSize: 14, fontWeight: '600', marginLeft: 6 },
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
  // Date/Time Picker Modal Styles
  dateTimePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  dateTimePickerContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  dateTimePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  dateTimePickerCancel: {
    fontSize: 16,
    paddingHorizontal: 8,
  },
  dateTimePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  dateTimePickerDone: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 8,
  },
  dateTimePicker: {
    height: 200,
  },
  voiceToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
  },
  voiceToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  voiceToggleInfo: {
    marginLeft: 12,
    flex: 1,
  },
  voiceToggleTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  voiceToggleSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  // Status Tab Styles
  statusTabScroll: {
    marginBottom: 8,
    maxHeight: 44,
  },
  statusTabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    padding: 4,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  statusTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 4,
    borderRadius: 6,
  },
  statusTabActive: {
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  statusTabText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginLeft: 2,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  // Voice title input styles
  titleInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleInput: {
    flex: 1,
  },
  voiceTitleButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceAttachedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
    borderWidth: 1,
  },
  voiceAttachedText: {
    flex: 1,
    fontSize: 12,
    color: '#10B981',
  },
  // Recurring task styles
  recurringContainer: {
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
  },
  recurringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  recurringTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  recurringTypeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  recurringTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  recurringTypeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  weeklyDayContainer: {
    marginTop: 16,
  },
  weeklyDayLabel: {
    fontSize: 13,
    marginBottom: 10,
  },
  weeklyDayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  weeklyDayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  weeklyDayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  weeklyDayInfo: {
    fontSize: 12,
    marginTop: 12,
    fontStyle: 'italic',
  },
  recurringInfo: {
    fontSize: 12,
    marginTop: 12,
    fontStyle: 'italic',
  },
});
