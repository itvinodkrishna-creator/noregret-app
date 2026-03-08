/**
 * Floating Goals Button
 * 
 * A small button that appears at the top-right corner of all screens
 * to quickly access the Weekly Goals tracker
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GOALS_STORAGE_KEY = '@noregret_weekly_goals';

export function FloatingGoalsButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [totalGoals, setTotalGoals] = useState(0);
  const pulseAnim = new Animated.Value(1);

  // Don't show on goals screen itself
  if (pathname === '/goals') {
    return null;
  }

  // Load goals progress
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const stored = await AsyncStorage.getItem(GOALS_STORAGE_KEY);
        if (stored) {
          const data = JSON.parse(stored);
          const goals = data.goals || [];
          setTotalGoals(goals.length);
          
          if (goals.length > 0) {
            let totalCompleted = 0;
            let totalPossible = 0;
            
            goals.forEach((goal: any) => {
              const completed = Object.values(goal.completedDays || {}).filter(Boolean).length;
              totalCompleted += completed;
              totalPossible += 7;
            });
            
            setProgress(totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0);
          }
        }
      } catch (error) {
        console.log('Error loading goals progress');
      }
    };

    loadProgress();
    
    // Refresh every time screen changes
    const interval = setInterval(loadProgress, 5000);
    return () => clearInterval(interval);
  }, [pathname]);

  // Pulse animation when progress changes
  useEffect(() => {
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [progress]);

  const handlePress = () => {
    router.push('/goals');
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        { transform: [{ scale: pulseAnim }] }
      ]}
    >
      <TouchableOpacity
        style={styles.button}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="flag" size={18} color="#fff" />
        </View>
        {totalGoals > 0 && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>{progress}%</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 1000,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
});
