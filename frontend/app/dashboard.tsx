import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppStore } from '../store/useAppStore';
import { TaskCard } from '../components/TaskCard';
import { StatsCard } from '../components/StatsCard';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { CATEGORY_CONFIG, CategoryType, STATUS_CONFIG } from '../types';
import { playClickSound } from '../utils/sounds';

type StatusTabType = 'pending' | 'completed' | 'rescheduled' | 'missed';

const STATUS_TABS: { key: StatusTabType; label: string; icon: string; color: string }[] = [
  { key: 'pending', label: 'Pending', icon: 'time-outline', color: '#F59E0B' },
  { key: 'completed', label: 'Completed', icon: 'checkmark-circle', color: '#10B981' },
  { key: 'rescheduled', label: 'Rescheduled', icon: 'calendar-outline', color: '#06B6D4' },
  { key: 'missed', label: 'Missed', icon: 'close-circle', color: '#EF4444' },
];

export default function Dashboard() {
  const { theme } = useTheme();
  const { 
    tasks, 
    foodPlans, 
    stats, 
    preferences,
    loadData, 
    completeTask, 
    getTodayTasks, 
    getUpcomingTasks,
    getPendingTasks,
    getCompletedTasks,
    getRescheduledTasks,
    getMissedTasks,
    getTasksByStatus,
  } = useAppStore();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(null);
  const [activeStatusTab, setActiveStatusTab] = useState<StatusTabType>('pending');

  // Get counts for each status
  const statusCounts = {
    pending: getPendingTasks().length,
    completed: getCompletedTasks().length,
    rescheduled: getRescheduledTasks().length,
    missed: getMissedTasks().length,
  };

  // Get tasks for active tab
  const activeStatusTasks = getTasksByStatus(activeStatusTab);

  // Animation for category cards
  const scaleAnims = Object.keys(CATEGORY_CONFIG).reduce((acc, key) => {
    acc[key] = new Animated.Value(1);
    return acc;
  }, {} as {[key: string]: Animated.Value});

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

  const handleCategoryPress = (category: CategoryType) => {
    playClickSound(preferences.soundEnabled);
    
    // Animate press
    Animated.sequence([
      Animated.timing(scaleAnims[category], {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnims[category], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    setSelectedCategory(category);
    router.push('/tasks');
  };

  const todayTasks = getTodayTasks();
  const upcomingTasks = getUpcomingTasks().slice(0, 3);
  const completedToday = todayTasks.filter(t => t.status === 'completed').length;
  const todayProgress = todayTasks.length > 0 ? Math.round((completedToday / todayTasks.length) * 100) : 0;

  // Get category counts
  const categoryCounts = Object.keys(CATEGORY_CONFIG).map(cat => ({
    category: cat as CategoryType,
    count: tasks.filter(t => t.category === cat && t.status === 'pending').length,
    config: CATEGORY_CONFIG[cat as CategoryType],
  }));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header with NO big, regret small branding */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <Ionicons name="shield-checkmark" size={32} color={theme.primary} />
          </View>
          <View>
            <View style={styles.brandContainer}>
              <Text style={[styles.brandNO, { color: theme.text }]}>NO</Text>
              <Text style={[styles.brandRegret, { color: theme.primary }]}>regret</Text>
            </View>
            <Text style={[styles.welcomeText, { color: theme.textSecondary }]}>Stay disciplined</Text>
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
        {/* Daily Progress - Compact */}
        <View style={[styles.progressCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.progressRow}>
            <Text style={[styles.progressTitle, { color: theme.text }]}>Today</Text>
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
            {completedToday}/{todayTasks.length} tasks done
          </Text>
        </View>

        {/* Mini Stats Row - Compact */}
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

        {/* BIG Category Cards */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Categories</Text>
        <View style={styles.categoryGrid}>
          {categoryCounts.map(({ category, count, config }) => (
            <Animated.View 
              key={category}
              style={[
                styles.categoryCardWrapper,
                { transform: [{ scale: scaleAnims[category] }] }
              ]}
            >
              <TouchableOpacity 
                style={[
                  styles.categoryCard, 
                  { 
                    backgroundColor: config.color + '15', 
                    borderColor: config.color,
                  }
                ]}
                onPress={() => handleCategoryPress(category)}
                activeOpacity={0.8}
              >
                <View style={[styles.categoryIconContainer, { backgroundColor: config.color + '30' }]}>
                  <Ionicons name={config.icon as any} size={28} color={config.color} />
                </View>
                <Text style={[styles.categoryCount, { color: config.color }]}>{count}</Text>
                <Text style={[styles.categoryLabel, { color: theme.text }]}>{category}</Text>
                <Text style={[styles.categorySubtext, { color: theme.textSecondary }]}>
                  {count === 1 ? 'task' : 'tasks'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* Task Status Tabs */}
        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20 }]}>Task Status</Text>
        <View style={styles.statusTabsContainer}>
          {STATUS_TABS.map((tab) => {
            const isActive = activeStatusTab === tab.key;
            const count = statusCounts[tab.key];
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.statusTab,
                  isActive && { backgroundColor: tab.color + '20', borderColor: tab.color },
                  { borderColor: theme.border },
                ]}
                onPress={() => {
                  playClickSound(preferences.soundEnabled);
                  setActiveStatusTab(tab.key);
                }}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={tab.icon as any} 
                  size={16} 
                  color={isActive ? tab.color : theme.textSecondary} 
                />
                <Text style={[
                  styles.statusTabLabel,
                  { color: isActive ? tab.color : theme.textSecondary }
                ]}>
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.statusBadge, { backgroundColor: tab.color }]}>
                    <Text style={styles.statusBadgeText}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tasks for Selected Status */}
        <View style={styles.section}>
          {activeStatusTasks.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons 
                name={STATUS_TABS.find(t => t.key === activeStatusTab)?.icon as any || 'list'} 
                size={40} 
                color={theme.textSecondary} 
              />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No {activeStatusTab} tasks
              </Text>
            </View>
          ) : (
            activeStatusTasks.slice(0, 5).map(task => (
              <TaskCard
                key={task._id}
                task={task}
                onPress={() => router.push('/tasks')}
                onComplete={() => {
                  if (task.status !== 'done' && task.status !== 'attempted' && task.status !== 'missed') {
                    playClickSound(preferences.soundEnabled);
                    task._id && completeTask(task._id);
                  }
                }}
              />
            ))
          )}
          {activeStatusTasks.length > 5 && (
            <TouchableOpacity 
              style={styles.viewMoreBtn}
              onPress={() => handlePress(() => router.push('/tasks'))}
            >
              <Text style={[styles.viewMoreText, { color: theme.primary }]}>
                View all {activeStatusTasks.length} tasks →
              </Text>
            </TouchableOpacity>
          )}
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
              <Ionicons name="checkmark-done" size={40} color={theme.textSecondary} />
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
                onPress={() => router.push('/tasks')}
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
                onPress={() => router.push('/tasks')}
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
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  welcomeText: {
    fontSize: 11,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandNO: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 1,
  },
  brandRegret: {
    fontSize: 18,
    fontWeight: '500',
    marginLeft: 2,
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
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 20,
    marginHorizontal: -4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 20,
  },
  categoryCardWrapper: {
    width: '50%',
    padding: 6,
  },
  categoryCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
  },
  categoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  categoryCount: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  categorySubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyCard: {
    padding: 28,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    marginTop: 10,
    marginBottom: 6,
  },
  addText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
