import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppStore } from '../store/useAppStore';
import { TaskCard } from '../components/TaskCard';
import { StatsCard } from '../components/StatsCard';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { CATEGORY_CONFIG } from '../types';
import { playClickSound } from '../utils/sounds';

export default function Dashboard() {
  const { theme, isDark } = useTheme();
  const { 
    tasks, 
    foodPlans, 
    stats, 
    preferences,
    loadData, 
    completeTask, 
    getTodayTasks, 
    getUpcomingTasks,
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

  const handlePress = (action: () => void) => {
    playClickSound(preferences.soundEnabled);
    action();
  };

  const todayTasks = getTodayTasks();
  const upcomingTasks = getUpcomingTasks().slice(0, 3);
  const completedToday = todayTasks.filter(t => t.status === 'completed').length;
  const todayProgress = todayTasks.length > 0 ? Math.round((completedToday / todayTasks.length) * 100) : 0;
  
  const todayDate = format(new Date(), 'yyyy-MM-dd');
  const todayFoodPlans = foodPlans.filter(fp => fp.date === todayDate);

  // Get category counts
  const categoryCounts = Object.keys(CATEGORY_CONFIG).map(cat => ({
    category: cat,
    count: tasks.filter(t => t.category === cat && t.status === 'pending').length,
    color: CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG].color,
    icon: CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG].icon,
  }));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <Ionicons name="shield-checkmark" size={28} color={theme.primary} />
          </View>
          <View>
            <Text style={[styles.greeting, { color: theme.textSecondary }]}>Welcome to</Text>
            <Text style={[styles.title, { color: theme.text }]}>Noregret</Text>
          </View>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            onPress={() => handlePress(() => router.push('/tasks'))}
            style={[styles.headerButton, { backgroundColor: theme.primary }]}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => handlePress(() => router.push('/settings'))}
            style={[styles.headerButton, { backgroundColor: theme.card }]}
          >
            <Ionicons name="settings-outline" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Daily Progress */}
        <View style={[styles.progressCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: theme.text }]}>Today's Progress</Text>
            <Text style={[styles.progressPercent, { color: theme.primary }]}>{todayProgress}%</Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  backgroundColor: theme.primary,
                  width: `${todayProgress}%` 
                }
              ]} 
            />
          </View>
          <Text style={[styles.progressText, { color: theme.textSecondary }]}>
            {completedToday} of {todayTasks.length} tasks completed
          </Text>
        </View>

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

        {/* Categories Quick View */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Categories</Text>
        <View style={styles.categoriesRow}>
          {categoryCounts.map(cat => (
            <TouchableOpacity 
              key={cat.category}
              style={[styles.categoryCard, { backgroundColor: cat.color + '15', borderColor: cat.color }]}
              onPress={() => handlePress(() => router.push('/tasks'))}
            >
              <Ionicons name={cat.icon as any} size={20} color={cat.color} />
              <Text style={[styles.categoryCount, { color: cat.color }]}>{cat.count}</Text>
              <Text style={[styles.categoryLabel, { color: theme.textSecondary }]}>{cat.category}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Today's Tasks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Today's Tasks</Text>
            <TouchableOpacity onPress={() => handlePress(() => router.push('/tasks'))}>
              <Text style={[styles.seeAll, { color: theme.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {todayTasks.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="checkmark-done" size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No tasks for today</Text>
              <TouchableOpacity onPress={() => handlePress(() => router.push('/tasks'))}>
                <Text style={[styles.addText, { color: theme.primary }]}>Add your first task</Text>
              </TouchableOpacity>
            </View>
          ) : (
            todayTasks.slice(0, 3).map(task => (
              <TaskCard
                key={task._id}
                task={task}
                onPress={() => {}}
                onComplete={() => {
                  playClickSound(preferences.soundEnabled);
                  task._id && completeTask(task._id);
                }}
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
                onPress={() => {}}
                onComplete={() => {
                  playClickSound(preferences.soundEnabled);
                  task._id && completeTask(task._id);
                }}
              />
            ))}
          </View>
        )}

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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  greeting: {
    fontSize: 12,
    marginBottom: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  progressCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 24,
    marginHorizontal: -6,
  },
  categoriesRow: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 10,
  },
  categoryCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryCount: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 6,
  },
  categoryLabel: {
    fontSize: 11,
    marginTop: 2,
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
    fontSize: 18,
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
});
