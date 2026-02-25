import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppStore } from '../store/useAppStore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, startOfWeek, addDays, parseISO } from 'date-fns';

const mealTypes = ['breakfast', 'lunch', 'dinner'] as const;

export default function FoodScreen() {
  const { theme } = useTheme();
  const { foodPlans, addFoodPlan, updateFoodPlan, loadData } = useAppStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [viewMode, setViewMode] = useState<'today' | 'week'>('today');
  
  // Form state
  const [selectedMealType, setSelectedMealType] = useState<typeof mealTypes[number]>('breakfast');
  const [mealItems, setMealItems] = useState('');
  const [formDate, setFormDate] = useState(new Date());
  const [showFormDatePicker, setShowFormDatePicker] = useState(false);

  React.useEffect(() => {
    loadData();
  }, []);

  const todayDate = format(selectedDate, 'yyyy-MM-dd');
  const todayFoodPlans = foodPlans.filter(fp => fp.date === todayDate);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handleAddFoodPlan = async () => {
    if (!mealItems.trim()) return;

    await addFoodPlan({
      date: format(formDate, 'yyyy-MM-dd'),
      mealType: selectedMealType,
      items: mealItems.split(',').map(item => item.trim()).filter(Boolean),
    });

    // Reset form
    setMealItems('');
    setFormDate(new Date());
    setShowAddModal(false);
  };

  const toggleMealStatus = async (foodPlanId: string, eaten: boolean) => {
    await updateFoodPlan(foodPlanId, { eaten: !eaten, skipped: eaten });
  };

  const renderMealCard = (fp: any) => (
    <View key={fp._id} style={[styles.mealCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.mealHeader}>
        <View style={styles.mealTitleRow}>
          <Ionicons 
            name="restaurant" 
            size={20} 
            color={theme.primary} 
          />
          <Text style={[styles.mealType, { color: theme.text }]}>
            {fp.mealType.charAt(0).toUpperCase() + fp.mealType.slice(1)}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={() => toggleMealStatus(fp._id, fp.eaten)}
          style={[styles.statusButton, { 
            backgroundColor: fp.eaten ? theme.success : theme.surface 
          }]}
        >
          <Ionicons 
            name={fp.eaten ? 'checkmark-circle' : 'ellipse-outline'} 
            size={24} 
            color={fp.eaten ? '#FFFFFF' : theme.textSecondary} 
          />
        </TouchableOpacity>
      </View>
      <View style={styles.mealItems}>
        {fp.items.map((item: string, index: number) => (
          <View key={index} style={styles.itemRow}>
            <View style={[styles.bullet, { backgroundColor: theme.textSecondary }]} />
            <Text style={[styles.itemText, { color: theme.textSecondary }]}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Food Plan</Text>
        <TouchableOpacity 
          onPress={() => setShowAddModal(true)}
          style={[styles.addButton, { backgroundColor: theme.primary }]}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* View Mode Toggle */}
      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[
            styles.viewModeButton,
            viewMode === 'today' && { backgroundColor: theme.primary },
          ]}
          onPress={() => setViewMode('today')}
        >
          <Text
            style={[
              styles.viewModeText,
              { color: viewMode === 'today' ? '#FFFFFF' : theme.textSecondary },
            ]}
          >
            Today
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.viewModeButton,
            viewMode === 'week' && { backgroundColor: theme.primary },
          ]}
          onPress={() => setViewMode('week')}
        >
          <Text
            style={[
              styles.viewModeText,
              { color: viewMode === 'week' ? '#FFFFFF' : theme.textSecondary },
            ]}
          >
            Week
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {viewMode === 'today' ? (
          <>
            {/* Date Selector */}
            <TouchableOpacity
              style={[styles.dateSelector, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={theme.text} />
              <Text style={[styles.dateText, { color: theme.text }]}>
                {format(selectedDate, 'EEEE, MMM dd, yyyy')}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (date) setSelectedDate(date);
                }}
              />
            )}

            {/* Today's Meals */}
            {todayFoodPlans.length === 0 ? (
              <View style={[styles.emptyContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="restaurant-outline" size={64} color={theme.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No meals planned for this day</Text>
                <TouchableOpacity onPress={() => setShowAddModal(true)}>
                  <Text style={[styles.addText, { color: theme.primary }]}>Add a meal plan</Text>
                </TouchableOpacity>
              </View>
            ) : (
              todayFoodPlans.map(renderMealCard)
            )}
          </>
        ) : (
          <>
            {/* Week View */}
            {weekDays.map(day => {
              const dayDate = format(day, 'yyyy-MM-dd');
              const dayPlans = foodPlans.filter(fp => fp.date === dayDate);
              const isToday = dayDate === format(new Date(), 'yyyy-MM-dd');

              return (
                <View key={dayDate} style={styles.weekDayContainer}>
                  <View style={styles.weekDayHeader}>
                    <Text style={[styles.weekDayName, { color: isToday ? theme.primary : theme.text }]}>
                      {format(day, 'EEEE')}
                    </Text>
                    <Text style={[styles.weekDayDate, { color: theme.textSecondary }]}>
                      {format(day, 'MMM dd')}
                    </Text>
                  </View>
                  {dayPlans.length === 0 ? (
                    <View style={[styles.weekEmptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Text style={[styles.weekEmptyText, { color: theme.textSecondary }]}>No meals planned</Text>
                    </View>
                  ) : (
                    dayPlans.map(renderMealCard)
                  )}
                </View>
              );
            })}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Food Plan Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>New Meal Plan</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Date Picker */}
              <Text style={[styles.label, { color: theme.text }]}>Date</Text>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => setShowFormDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={theme.text} />
                <Text style={[styles.pickerText, { color: theme.text }]}>
                  {format(formDate, 'MMM dd, yyyy')}
                </Text>
              </TouchableOpacity>

              {showFormDatePicker && (
                <DateTimePicker
                  value={formDate}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowFormDatePicker(Platform.OS === 'ios');
                    if (date) setFormDate(date);
                  }}
                />
              )}

              {/* Meal Type Picker */}
              <Text style={[styles.label, { color: theme.text }]}>Meal Type</Text>
              <View style={styles.mealTypeGrid}>
                {mealTypes.map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.mealTypeButton,
                      { 
                        backgroundColor: selectedMealType === type ? theme.primary : theme.card,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={() => setSelectedMealType(type)}
                  >
                    <Ionicons 
                      name={type === 'breakfast' ? 'sunny' : type === 'lunch' ? 'partly-sunny' : 'moon'} 
                      size={20} 
                      color={selectedMealType === type ? '#FFFFFF' : theme.text}
                    />
                    <Text
                      style={[
                        styles.mealTypeText,
                        { color: selectedMealType === type ? '#FFFFFF' : theme.text },
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Meal Items Input */}
              <Text style={[styles.label, { color: theme.text }]}>Meal Items *</Text>
              <Text style={[styles.hint, { color: theme.textSecondary }]}>Separate items with commas</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                value={mealItems}
                onChangeText={setMealItems}
                placeholder="e.g., Oatmeal, Banana, Coffee"
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={4}
              />
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
                onPress={handleAddFoodPlan}
              >
                <Text style={styles.saveButtonText}>Add Plan</Text>
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
  viewModeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  viewModeButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  mealCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealType: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statusButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealItems: {
    marginTop: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 12,
  },
  itemText: {
    fontSize: 15,
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
  weekDayContainer: {
    marginBottom: 24,
  },
  weekDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  weekDayName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  weekDayDate: {
    fontSize: 14,
  },
  weekEmptyCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  weekEmptyText: {
    fontSize: 14,
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
  hint: {
    fontSize: 12,
    marginBottom: 8,
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
  mealTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  mealTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  mealTypeText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
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
