import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppStore } from '../store/useAppStore';
import { router } from 'expo-router';
import { RINGTONES, playClickSound } from '../utils/sounds';

export default function SettingsScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const { preferences, updatePreferences, stats } = useAppStore();

  const handleToggleSound = async (value: boolean) => {
    if (value) playClickSound(true);
    await updatePreferences({ soundEnabled: value });
  };

  const handleToggleVibration = async (value: boolean) => {
    if (preferences.soundEnabled) playClickSound(true);
    await updatePreferences({ vibrationEnabled: value });
  };

  const handleToggleDarkMode = () => {
    if (preferences.soundEnabled) playClickSound(true);
    toggleTheme();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Appearance Section */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>APPEARANCE</Text>
        <View style={[styles.settingCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="moon" size={22} color={theme.primary} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Dark Mode</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={handleToggleDarkMode}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Sound Section */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>SOUND & VIBRATION</Text>
        <View style={[styles.settingCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <View style={styles.settingLeft}>
              <Ionicons name="volume-high" size={22} color={theme.primary} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Sound Effects</Text>
            </View>
            <Switch
              value={preferences.soundEnabled !== false}
              onValueChange={handleToggleSound}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="phone-portrait" size={22} color={theme.primary} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Vibration</Text>
            </View>
            <Switch
              value={preferences.vibrationEnabled !== false}
              onValueChange={handleToggleVibration}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Available Ringtones */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>AVAILABLE RINGTONES</Text>
        <View style={[styles.settingCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {RINGTONES.map((ringtone, index) => (
            <View 
              key={ringtone.id} 
              style={[
                styles.ringtoneRow,
                index < RINGTONES.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }
              ]}
            >
              <Ionicons name="musical-notes" size={18} color={theme.textSecondary} />
              <Text style={[styles.ringtoneLabel, { color: theme.text }]}>{ringtone.label}</Text>
            </View>
          ))}
        </View>

        {/* Stats Section */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>STATISTICS</Text>
        <View style={[styles.settingCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.statRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Current Streak</Text>
            <Text style={[styles.statValue, { color: theme.primary }]}>{stats.currentStreak} days</Text>
          </View>
          <View style={[styles.statRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Longest Streak</Text>
            <Text style={[styles.statValue, { color: theme.success }]}>{stats.longestStreak} days</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Tasks Completed</Text>
            <Text style={[styles.statValue, { color: theme.warning }]}>{stats.totalTasksCompleted}</Text>
          </View>
        </View>

        {/* About Section */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ABOUT</Text>
        <View style={[styles.settingCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.aboutRow}>
            <Text style={[styles.appName, { color: theme.text }]}>Noregret</Text>
            <Text style={[styles.version, { color: theme.textSecondary }]}>Version 1.0.0</Text>
            <Text style={[styles.tagline, { color: theme.textSecondary }]}>
              Your smart task manager for a life without regrets
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
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
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 12,
    marginLeft: 4,
  },
  settingCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    marginLeft: 12,
  },
  ringtoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  ringtoneLabel: {
    fontSize: 15,
    marginLeft: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  statLabel: {
    fontSize: 15,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  aboutRow: {
    padding: 20,
    alignItems: 'center',
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  version: {
    fontSize: 14,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    textAlign: 'center',
  },
});
