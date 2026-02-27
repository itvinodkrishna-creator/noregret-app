import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppStore } from '../store/useAppStore';
import { StatsCard } from '../components/StatsCard';
import { format, subDays, parseISO } from 'date-fns';

export default function StatsScreen() {
  const { theme } = useTheme();
  const { tasks, stats, loadData } = useAppStore();

  React.useEffect(() => {
    loadData();
  }, []);

  // Calculate weekly stats
  const last7Days = Array.from({ length: 7 }, (_, i) => 
    format(subDays(new Date(), 6 - i), 'yyyy-MM-dd')
  );

  const weeklyData = last7Days.map(date => {
    const dateTasks = tasks.filter(task => {
      const taskDate = format(parseISO(task.time), 'yyyy-MM-dd');
      return taskDate === date;
    });
    const completed = dateTasks.filter(t => t.status === 'done').length;
    const total = dateTasks.length;
    return {
      date,
      completed,
      total,
      rate: total > 0 ? (completed / total) * 100 : 0,
    };
  });

  const weeklyAverage = weeklyData.reduce((sum, day) => sum + day.rate, 0) / 7;
  const totalCompleted = stats.totalTasksCompleted;
  const currentStreak = stats.currentStreak;
  const longestStreak = stats.longestStreak;

  // Calculate category breakdown
  const categoryStats = tasks.reduce((acc, task) => {
    if (task.status === 'done') {
      acc[task.category] = (acc[task.category] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const categoryColors: Record<string, string> = {
    Work: theme.primary,
    Health: theme.success,
    Food: theme.warning,
    Personal: theme.secondary,
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Statistics</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Overview Stats */}
        <View style={styles.statsRow}>
          <StatsCard 
            icon="trophy" 
            label="Total Tasks" 
            value={totalCompleted} 
            color={theme.primary}
          />
          <StatsCard 
            icon="flame" 
            label="Current Streak" 
            value={`${currentStreak}d`} 
            color={theme.warning}
          />
        </View>

        <View style={styles.statsRow}>
          <StatsCard 
            icon="star" 
            label="Longest Streak" 
            value={`${longestStreak}d`} 
            color={theme.secondary}
          />
          <StatsCard 
            icon="trending-up" 
            label="Weekly Avg" 
            value={`${Math.round(weeklyAverage)}%`} 
            color={theme.success}
          />
        </View>

        {/* Weekly Performance */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Weekly Performance</Text>
          <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.chart}>
              {weeklyData.map((day, index) => (
                <View key={day.date} style={styles.chartBar}>
                  <View style={styles.barContainer}>
                    <View 
                      style={[
                        styles.bar,
                        { 
                          height: `${Math.max(day.rate, 5)}%`,
                          backgroundColor: day.rate > 70 ? theme.success : day.rate > 40 ? theme.warning : theme.error,
                        }
                      ]} 
                    />
                  </View>
                  <Text style={[styles.barLabel, { color: theme.textSecondary }]}>
                    {format(parseISO(day.date), 'EEE').charAt(0)}
                  </Text>
                  <Text style={[styles.barValue, { color: theme.text }]}>
                    {day.total > 0 ? `${day.completed}/${day.total}` : '-'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Category Breakdown */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Category Breakdown</Text>
          <View style={[styles.categoryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {Object.keys(categoryStats).length === 0 ? (
              <View style={styles.emptyCategory}>
                <Ionicons name="pie-chart-outline" size={48} color={theme.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No completed tasks yet</Text>
              </View>
            ) : (
              Object.entries(categoryStats).map(([category, count]) => (
                <View key={category} style={styles.categoryRow}>
                  <View style={styles.categoryLeft}>
                    <View style={[styles.categoryDot, { backgroundColor: categoryColors[category] }]} />
                    <Text style={[styles.categoryName, { color: theme.text }]}>{category}</Text>
                  </View>
                  <View style={styles.categoryRight}>
                    <Text style={[styles.categoryCount, { color: theme.text }]}>{count}</Text>
                    <Text style={[styles.categoryPercent, { color: theme.textSecondary }]}>
                      ({Math.round((count / totalCompleted) * 100)}%)
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Motivational Message */}
        <View style={[styles.motivationCard, { backgroundColor: theme.primary + '15', borderColor: theme.primary }]}>
          <Ionicons name="sparkles" size={32} color={theme.primary} />
          <Text style={[styles.motivationText, { color: theme.text }]}>
            {currentStreak > 0 
              ? `Great job! You're on a ${currentStreak}-day streak! Keep it up! 🚀`
              : "Start your streak today! Complete a task to begin! 💪"}
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
    marginHorizontal: -6,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  chartCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
  },
  barContainer: {
    flex: 1,
    width: '70%',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 8,
  },
  barLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  barValue: {
    fontSize: 11,
    fontWeight: '600',
  },
  categoryCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  emptyCategory: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryCount: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 8,
  },
  categoryPercent: {
    fontSize: 14,
  },
  motivationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 24,
  },
  motivationText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 16,
    lineHeight: 22,
  },
});
