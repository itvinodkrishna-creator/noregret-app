import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppStore } from '../store/useAppStore';
import { TaskCard } from '../components/TaskCard';
import { StatsCard } from '../components/StatsCard';
import { router } from 'expo-router';
import { format } from 'date-fns';

export default function Dashboard() {
  const { theme, isDark, toggleTheme } = useTheme();
  const { 
    tasks, 
    foodPlans, 
    stats, 
    loadData, 
    completeTask, 
    getTodayTasks, 
    getUpcomingTasks,
    getCompletionRate,
    loading 
  } = useAppStore();

  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const todayTasks = getTodayTasks();
  const upcomingTasks = getUpcomingTasks().slice(0, 3);
  const completedToday = todayTasks.filter(t => t.status === 'completed').length;
  const todayProgress = todayTasks.length > 0 ? Math.round((completedToday / todayTasks.length) * 100) : 0;
  
  const todayDate = format(new Date(), 'yyyy-MM-dd');
  const todayFoodPlans = foodPlans.filter(fp => fp.date === todayDate);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: theme.textSecondary }]}>Welcome back!</Text>
          <Text style={[styles.title, { color: theme.text }]}>LifeTracker</Text>
        </View>
        <TouchableOpacity 
          onPress={toggleTheme}
          style={[styles.themeButton, { backgroundColor: theme.card }]}
        >
          <Ionicons 
            name={isDark ? 'sunny' : 'moon'} 
            size={24} 
            color={theme.text} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Overview */}
        <View style={styles.statsRow}>
          <StatsCard 
            icon="flame" 
            label="Streak" 
            value={stats.currentStreak} 
            color={theme.warning}
          />
          <StatsCard 
            icon="checkmark-circle" 
            label="Today" 
            value={`${todayProgress}%`} 
            color={theme.success}
          />
          <StatsCard 
            icon="trophy" 
            label="Total" 
            value={stats.totalTasksCompleted} 
            color={theme.primary}
          />
        </View>

        {/* Today's Tasks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Today's Tasks</Text>
            <TouchableOpacity onPress={() => router.push('/tasks')}>
              <Text style={[styles.seeAll, { color: theme.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {todayTasks.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="checkmark-done" size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No tasks for today</Text>
              <TouchableOpacity onPress={() => router.push('/tasks')}>
                <Text style={[styles.addText, { color: theme.primary }]}>Add your first task</Text>
              </TouchableOpacity>
            </View>
          ) : (
            todayTasks.slice(0, 3).map(task => (
              <TaskCard
                key={task._id}
                task={task}
                onPress={() => router.push(`/task-detail?id=${task._id}`)}
                onComplete={() => task._id && completeTask(task._id)}
              />
            ))
          )}
        </View>

        {/* Upcoming Tasks */}
        {upcomingTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Upcoming</Text>
            {upcomingTasks.map(task => (
              <TaskCard
                key={task._id}
                task={task}
                onPress={() => router.push(`/task-detail?id=${task._id}`)}
                onComplete={() => completeTask(task._id!)}
              />
            ))}
          </View>
        )}

        {/* Today's Food Plan */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Today's Meals</Text>
            <TouchableOpacity onPress={() => router.push('/food')}>
              <Text style={[styles.seeAll, { color: theme.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {todayFoodPlans.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="restaurant" size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No meals planned</Text>
            </View>
          ) : (
            <View style={[styles.foodCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {todayFoodPlans.map((fp, index) => (
                <View key={fp._id} style={styles.foodRow}>
                  <Ionicons 
                    name={fp.eaten ? 'checkmark-circle' : 'ellipse-outline'} 
                    size={20} 
                    color={fp.eaten ? theme.success : theme.textSecondary} 
                  />
                  <Text style={[styles.foodMeal, { color: theme.text }]}>
                    {fp.mealType.charAt(0).toUpperCase() + fp.mealType.slice(1)}
                  </Text>
                  <Text style={[styles.foodItems, { color: theme.textSecondary }]} numberOfLines={1}>
                    {fp.items.join(', ')}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
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
  greeting: {
    fontSize: 14,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  themeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 24,
    marginHorizontal: -6,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyCard: {
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  addText: {
    fontSize: 14,
    fontWeight: '600',
  },
  foodCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  foodMeal: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    width: 100,
  },
  foodItems: {
    fontSize: 14,
    flex: 1,
  },
});
