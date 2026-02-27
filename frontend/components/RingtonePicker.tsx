import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RINGTONES, previewRingtone, stopRingtonePreview, isRingtonePreviewPlaying, getRingtoneLabel } from '../utils/sounds';

interface RingtonePickerProps {
  selectedRingtone: string;
  onSelect: (ringtoneId: string) => void;
  disabled?: boolean;
}

export const RingtonePicker: React.FC<RingtonePickerProps> = ({
  selectedRingtone,
  onSelect,
  disabled = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const handleSelectRingtone = async (ringtoneId: string) => {
    // Stop any currently playing preview
    await stopRingtonePreview();
    
    // Play preview of selected ringtone
    setPlayingId(ringtoneId);
    await previewRingtone(ringtoneId);
    
    // After sound finishes, clear the playing state
    setTimeout(() => {
      setPlayingId(null);
    }, 3000);
    
    // Update selected ringtone
    onSelect(ringtoneId);
  };

  const handleDone = async () => {
    await stopRingtonePreview();
    setPlayingId(null);
    setModalVisible(false);
  };

  const handlePreview = async (ringtoneId: string) => {
    if (playingId === ringtoneId) {
      // Stop preview
      await stopRingtonePreview();
      setPlayingId(null);
    } else {
      // Play preview
      await stopRingtonePreview();
      setPlayingId(ringtoneId);
      await previewRingtone(ringtoneId);
      
      // Auto-clear after preview finishes
      setTimeout(() => {
        setPlayingId(null);
      }, 3000);
    }
  };

  const renderRingtoneItem = ({ item }: { item: typeof RINGTONES[0] }) => {
    const isSelected = selectedRingtone === item.id;
    const isPlaying = playingId === item.id;
    
    return (
      <TouchableOpacity
        style={[styles.ringtoneItem, isSelected && styles.ringtoneItemSelected]}
        onPress={() => handleSelectRingtone(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.ringtoneInfo}>
          <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
            {isSelected && <View style={styles.radioInner} />}
          </View>
          <Text style={[styles.ringtoneLabel, isSelected && styles.ringtoneLabelSelected]}>
            {item.label}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.previewButton}
          onPress={() => handlePreview(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isPlaying ? "stop-circle" : "play-circle"}
            size={28}
            color={isPlaying ? "#EF4444" : "#8B5CF6"}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.pickerButton, disabled && styles.pickerButtonDisabled]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <View style={styles.pickerContent}>
          <Ionicons name="musical-notes" size={20} color="#8B5CF6" />
          <Text style={styles.pickerText}>
            {getRingtoneLabel(selectedRingtone)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#707070" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleDone}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Ringtone</Text>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={handleDone}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.helpText}>
            Tap to select and preview a ringtone
          </Text>
          
          <FlatList
            data={RINGTONES}
            renderItem={renderRingtoneItem}
            keyExtractor={(item) => item.id}
            style={styles.ringtoneList}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  pickerButtonDisabled: {
    opacity: 0.5,
  },
  pickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickerText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  doneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    color: '#808080',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 12,
  },
  ringtoneList: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  ringtoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  ringtoneItemSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  ringtoneInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#404040',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#8B5CF6',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#8B5CF6',
  },
  ringtoneLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
  },
  ringtoneLabelSelected: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  previewButton: {
    padding: 4,
  },
});
