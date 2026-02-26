import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { format, addDays, addMonths, setHours, setMinutes } from 'date-fns';

interface DatePickerModalProps {
  visible: boolean;
  value: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
  minDate?: Date;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  value,
  onSelect,
  onClose,
  minDate = new Date(),
}) => {
  const { theme } = useTheme();
  const [selectedDate, setSelectedDate] = useState(value);
  const [currentMonth, setCurrentMonth] = useState(value);

  // Sync state when value or visibility changes
  React.useEffect(() => {
    if (visible) {
      setSelectedDate(value);
      setCurrentMonth(value);
    }
  }, [visible, value]);

  // Generate days for current month view
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];
    
    // Add empty slots for days before first day of month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    // Add all days of month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const days = getDaysInMonth(currentMonth);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const isDateDisabled = (date: Date | null) => {
    if (!date) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isDateSelected = (date: Date | null) => {
    if (!date) return false;
    return format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
  };

  const handleSelect = () => {
    onSelect(selectedDate);
    onClose();
  };

  const prevMonth = () => {
    setCurrentMonth(addMonths(currentMonth, -1));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Quick select options
  const quickOptions = [
    { label: 'Today', date: new Date() },
    { label: 'Tomorrow', date: addDays(new Date(), 1) },
    { label: 'In 3 days', date: addDays(new Date(), 3) },
    { label: 'In a week', date: addDays(new Date(), 7) },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Select Date</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Quick Options */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickOptions}>
            {quickOptions.map((option) => (
              <TouchableOpacity
                key={option.label}
                style={[
                  styles.quickOption,
                  { backgroundColor: theme.primary + '20', borderColor: theme.primary },
                ]}
                onPress={() => setSelectedDate(option.date)}
              >
                <Text style={[styles.quickOptionText, { color: theme.primary }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Month Navigation */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={prevMonth} style={styles.navButton}>
              <Ionicons name="chevron-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.monthText, { color: theme.text }]}>
              {format(currentMonth, 'MMMM yyyy')}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
              <Ionicons name="chevron-forward" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Week Days Header */}
          <View style={styles.weekDays}>
            {weekDays.map((day) => (
              <Text key={day} style={[styles.weekDay, { color: theme.textSecondary }]}>
                {day}
              </Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.daysGrid}>
            {days.map((day, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayCell,
                  isDateSelected(day) && { backgroundColor: theme.primary },
                  isDateDisabled(day) && styles.disabledDay,
                ]}
                onPress={() => day && !isDateDisabled(day) && setSelectedDate(day)}
                disabled={isDateDisabled(day)}
              >
                <Text
                  style={[
                    styles.dayText,
                    { color: isDateSelected(day) ? '#FFFFFF' : theme.text },
                    isDateDisabled(day) && { color: theme.textSecondary, opacity: 0.4 },
                  ]}
                >
                  {day ? day.getDate() : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Selected Date Display */}
          <View style={[styles.selectedDisplay, { backgroundColor: theme.card }]}>
            <Ionicons name="calendar" size={20} color={theme.primary} />
            <Text style={[styles.selectedText, { color: theme.text }]}>
              {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: theme.card }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelBtnText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.selectBtn, { backgroundColor: theme.primary }]}
              onPress={handleSelect}
            >
              <Text style={styles.selectBtnText}>Select Date</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

interface TimePickerModalProps {
  visible: boolean;
  value: Date;
  onSelect: (time: Date) => void;
  onClose: () => void;
}

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  value,
  onSelect,
  onClose,
}) => {
  const { theme } = useTheme();
  const [selectedHour, setSelectedHour] = useState(value.getHours() % 12 || 12);
  const [selectedMinute, setSelectedMinute] = useState(value.getMinutes());
  const [isPM, setIsPM] = useState(value.getHours() >= 12);

  // Sync state when value or visibility changes
  React.useEffect(() => {
    if (visible) {
      setSelectedHour(value.getHours() % 12 || 12);
      setSelectedMinute(value.getMinutes());
      setIsPM(value.getHours() >= 12);
    }
  }, [visible, value]);

  const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const handleSelect = () => {
    let hour24 = selectedHour;
    if (isPM && selectedHour !== 12) hour24 = selectedHour + 12;
    if (!isPM && selectedHour === 12) hour24 = 0;
    
    const newTime = new Date(value);
    newTime.setHours(hour24);
    newTime.setMinutes(selectedMinute);
    onSelect(newTime);
    onClose();
  };

  const getDisplayTime = () => {
    const hourStr = selectedHour.toString();
    const minStr = selectedMinute.toString().padStart(2, '0');
    const period = isPM ? 'PM' : 'AM';
    return `${hourStr}:${minStr} ${period}`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Select Time</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Time Display */}
          <View style={[styles.timeDisplay, { backgroundColor: theme.primary + '15' }]}>
            <Ionicons name="time" size={28} color={theme.primary} />
            <Text style={[styles.timeDisplayText, { color: theme.primary }]}>
              {getDisplayTime()}
            </Text>
          </View>

          {/* AM/PM Toggle */}
          <View style={styles.ampmContainer}>
            <TouchableOpacity
              style={[
                styles.ampmButton,
                !isPM && { backgroundColor: theme.primary },
                isPM && { backgroundColor: theme.card },
              ]}
              onPress={() => setIsPM(false)}
            >
              <Text style={[styles.ampmText, { color: !isPM ? '#FFFFFF' : theme.text }]}>AM</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.ampmButton,
                isPM && { backgroundColor: theme.primary },
                !isPM && { backgroundColor: theme.card },
              ]}
              onPress={() => setIsPM(true)}
            >
              <Text style={[styles.ampmText, { color: isPM ? '#FFFFFF' : theme.text }]}>PM</Text>
            </TouchableOpacity>
          </View>

          {/* Hour Selection */}
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>HOUR</Text>
          <View style={styles.timeGrid}>
            {hours.map((hour) => (
              <TouchableOpacity
                key={`hour-${hour}`}
                style={[
                  styles.timeCell,
                  { backgroundColor: theme.card },
                  selectedHour === hour && { backgroundColor: theme.primary },
                ]}
                onPress={() => setSelectedHour(hour)}
              >
                <Text
                  style={[
                    styles.timeCellText,
                    { color: selectedHour === hour ? '#FFFFFF' : theme.text },
                  ]}
                >
                  {hour}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Minute Selection */}
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>MINUTE</Text>
          <View style={styles.timeGrid}>
            {minutes.map((minute) => (
              <TouchableOpacity
                key={`min-${minute}`}
                style={[
                  styles.timeCell,
                  { backgroundColor: theme.card },
                  selectedMinute === minute && { backgroundColor: theme.primary },
                ]}
                onPress={() => setSelectedMinute(minute)}
              >
                <Text
                  style={[
                    styles.timeCellText,
                    { color: selectedMinute === minute ? '#FFFFFF' : theme.text },
                  ]}
                >
                  {minute.toString().padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: theme.card }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelBtnText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.selectBtn, { backgroundColor: theme.primary }]}
              onPress={handleSelect}
            >
              <Text style={styles.selectBtnText}>Select Time</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  quickOptions: {
    marginBottom: 16,
  },
  quickOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
  },
  quickOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  disabledDay: {
    opacity: 0.4,
  },
  selectedDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  selectedText: {
    fontSize: 16,
    marginLeft: 10,
    fontWeight: '500',
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  timeDisplayText: {
    fontSize: 36,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  ampmContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  ampmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  ampmText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 1,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  timeCell: {
    width: '15%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  timeCellText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  selectBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
