import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Share, Alert, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppStore } from '../store/useAppStore';
import { router } from 'expo-router';
import { RINGTONES, playClickSound } from '../utils/sounds';
import * as Clipboard from 'expo-clipboard';

export default function SettingsScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const { preferences, updatePreferences, stats } = useAppStore();
  const [copied, setCopied] = useState(false);

  const SHARE_MESSAGE = "Try Noregret app, you will not regret! 🚀\n\nDownload now and stay disciplined with your tasks!";
  const APP_LINK = "https://noregret.app"; // Placeholder link

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

  const handleShare = async () => {
    playClickSound(preferences.soundEnabled);
    try {
      await Share.share({
        message: SHARE_MESSAGE,
        title: 'Noregret - Task Manager',
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share');
    }
  };

  const handleShareWhatsApp = () => {
    playClickSound(preferences.soundEnabled);
    const url = `whatsapp://send?text=${encodeURIComponent(SHARE_MESSAGE)}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('WhatsApp not installed', 'Please install WhatsApp to share');
        }
      })
      .catch(() => Alert.alert('Error', 'Could not open WhatsApp'));
  };

  const handleShareSMS = () => {
    playClickSound(preferences.soundEnabled);
    const url = Platform.OS === 'ios' 
      ? `sms:&body=${encodeURIComponent(SHARE_MESSAGE)}`
      : `sms:?body=${encodeURIComponent(SHARE_MESSAGE)}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open SMS'));
  };

  const handleCopyLink = async () => {
    playClickSound(preferences.soundEnabled);
    await Clipboard.setStringAsync(SHARE_MESSAGE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    Alert.alert('Copied!', 'Share message copied to clipboard');
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
              <View style={[styles.iconBox, { backgroundColor: theme.primary + '20' }]}>
                <Ionicons name="moon" size={20} color={theme.primary} />
              </View>
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
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>SOUND & HAPTICS</Text>
        <View style={[styles.settingCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#10B981' + '20' }]}>
                <Ionicons name="volume-high" size={20} color="#10B981" />
              </View>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Sound Effects</Text>
            </View>
            <Switch
              value={preferences.soundEnabled !== false}
              onValueChange={handleToggleSound}
              trackColor={{ false: theme.border, true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#F97316' + '20' }]}>
                <Ionicons name="phone-portrait" size={20} color="#F97316" />
              </View>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Vibration</Text>
            </View>
            <Switch
              value={preferences.vibrationEnabled !== false}
              onValueChange={handleToggleVibration}
              trackColor={{ false: theme.border, true: '#F97316' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Refer a Friend Section */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>SHARE WITH FRIENDS</Text>
        <View style={[styles.settingCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.referHeader}>
            <Ionicons name="gift" size={40} color={theme.primary} />
            <Text style={[styles.referTitle, { color: theme.text }]}>Refer a Friend</Text>
            <Text style={[styles.referSubtitle, { color: theme.textSecondary }]}>
              Share Noregret with your friends and help them stay productive!
            </Text>
          </View>
          
          <View style={styles.shareButtons}>
            <TouchableOpacity 
              style={[styles.shareButton, { backgroundColor: '#25D366' }]}
              onPress={handleShareWhatsApp}
            >
              <Ionicons name="logo-whatsapp" size={24} color="#FFFFFF" />
              <Text style={styles.shareButtonText}>WhatsApp</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.shareButton, { backgroundColor: '#3B82F6' }]}
              onPress={handleShareSMS}
            >
              <Ionicons name="chatbubble" size={24} color="#FFFFFF" />
              <Text style={styles.shareButtonText}>SMS</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.shareButton, { backgroundColor: theme.primary }]}
              onPress={handleCopyLink}
            >
              <Ionicons name={copied ? "checkmark" : "copy"} size={24} color="#FFFFFF" />
              <Text style={styles.shareButtonText}>{copied ? "Copied!" : "Copy"}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.mainShareButton, { backgroundColor: theme.primary }]}
            onPress={handleShare}
          >
            <Ionicons name="share-social" size={22} color="#FFFFFF" />
            <Text style={styles.mainShareButtonText}>Share via Other Apps</Text>
          </TouchableOpacity>
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
              <Ionicons name="musical-notes" size={16} color={theme.textSecondary} />
              <Text style={[styles.ringtoneLabel, { color: theme.text }]}>{ringtone.label}</Text>
            </View>
          ))}
        </View>

        {/* Stats Section */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>YOUR STATISTICS</Text>
        <View style={[styles.settingCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: theme.warning + '15' }]}>
              <Ionicons name="flame" size={28} color={theme.warning} />
              <Text style={[styles.statValue, { color: theme.warning }]}>{stats.currentStreak}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Current Streak</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: theme.success + '15' }]}>
              <Ionicons name="trophy" size={28} color={theme.success} />
              <Text style={[styles.statValue, { color: theme.success }]}>{stats.longestStreak}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Best Streak</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: theme.primary + '15' }]}>
              <Ionicons name="checkmark-done" size={28} color={theme.primary} />
              <Text style={[styles.statValue, { color: theme.primary }]}>{stats.totalTasksCompleted}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Completed</Text>
            </View>
          </View>
        </View>

        {/* About Section */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ABOUT</Text>
        <View style={[styles.settingCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.aboutRow}>
            <View style={[styles.logoBox, { backgroundColor: theme.primary + '15' }]}>
              <Ionicons name="shield-checkmark" size={36} color={theme.primary} />
            </View>
            <Text style={[styles.appName, { color: theme.text }]}>NOREGRET</Text>
            <Text style={[styles.version, { color: theme.textSecondary }]}>Version 1.0.0</Text>
            <Text style={[styles.tagline, { color: theme.textSecondary }]}>
              Stay disciplined. No regrets.
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
    borderRadius: 16,
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
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
  },
  referHeader: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  referTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
  },
  referSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  shareButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  shareButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  mainShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
  },
  mainShareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
  statsGrid: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  aboutRow: {
    padding: 24,
    alignItems: 'center',
  },
  logoBox: {
    width: 70,
    height: 70,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
  },
  version: {
    fontSize: 13,
    marginTop: 4,
  },
  tagline: {
    fontSize: 14,
    marginTop: 8,
  },
});
