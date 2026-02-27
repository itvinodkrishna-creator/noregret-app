import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

interface VoiceRecorderProps {
  visible: boolean;
  onClose: () => void;
  onSave: (recordingUri: string, recordingName: string) => void;
}

const MAX_RECORDING_TIME = 30; // 30 seconds max

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  visible,
  onClose,
  onSave,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    checkPermissions();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const checkPermissions = async () => {
    try {
      if (Platform.OS === 'web') {
        // Web doesn't need explicit permissions through expo-av
        setPermissionGranted(true);
        return;
      }
      
      const { status } = await Audio.requestPermissionsAsync();
      setPermissionGranted(status === 'granted');
      
      if (status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      }
    } catch (error) {
      console.error('Permission error:', error);
      setPermissionGranted(false);
    }
  };

  const cleanup = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (e) {}
    }
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch (e) {}
    }
  };

  const startRecording = async () => {
    try {
      // Clean up any existing recording
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
      }
      setRecordingUri(null);
      setRecordingTime(0);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      recordingRef.current = recording;
      setIsRecording(true);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= MAX_RECORDING_TIME - 1) {
            stopRecording();
            return MAX_RECORDING_TIME;
          }
          return prev + 1;
        });
      }, 1000);

      console.log('🎙️ Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = async () => {
    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (recordingRef.current) {
        setIsRecording(false);
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        setRecordingUri(uri);
        console.log('🎙️ Recording saved to:', uri);
        recordingRef.current = null;
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsRecording(false);
    }
  };

  const playRecording = async () => {
    if (!recordingUri) return;

    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: recordingUri },
        { shouldPlay: true }
      );
      
      soundRef.current = sound;
      setIsPlaying(true);

      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error('Failed to play recording:', error);
      setIsPlaying(false);
    }
  };

  const stopPlayback = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      setIsPlaying(false);
    }
  };

  const handleSave = () => {
    if (recordingUri) {
      const recordingName = `My Voice ${new Date().toLocaleTimeString()}`;
      onSave(recordingUri, recordingName);
      handleClose();
    }
  };

  const handleClose = async () => {
    await cleanup();
    setRecordingUri(null);
    setRecordingTime(0);
    setIsRecording(false);
    setIsPlaying(false);
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Record Voice Ringtone</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#A0A0A0" />
            </TouchableOpacity>
          </View>

          {!permissionGranted ? (
            <View style={styles.permissionContainer}>
              <Ionicons name="mic-off" size={48} color="#EF4444" />
              <Text style={styles.permissionText}>
                Microphone permission is required to record voice.
              </Text>
              <TouchableOpacity style={styles.permissionButton} onPress={checkPermissions}>
                <Text style={styles.permissionButtonText}>Grant Permission</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.recordingContainer}>
                <Animated.View style={[
                  styles.recordingCircle,
                  isRecording && styles.recordingCircleActive,
                  { transform: [{ scale: pulseAnim }] }
                ]}>
                  <TouchableOpacity
                    style={[
                      styles.recordButton,
                      isRecording && styles.recordButtonActive
                    ]}
                    onPress={isRecording ? stopRecording : startRecording}
                    disabled={!!recordingUri}
                  >
                    <Ionicons 
                      name={isRecording ? "stop" : "mic"} 
                      size={40} 
                      color={isRecording ? "#EF4444" : "#FFFFFF"} 
                    />
                  </TouchableOpacity>
                </Animated.View>

                <Text style={styles.timerText}>
                  {formatTime(recordingTime)} / {formatTime(MAX_RECORDING_TIME)}
                </Text>

                {isRecording && (
                  <Text style={styles.recordingHint}>Recording... Tap to stop</Text>
                )}

                {!isRecording && !recordingUri && (
                  <Text style={styles.recordingHint}>Tap the mic to start recording</Text>
                )}
              </View>

              {recordingUri && (
                <View style={styles.previewContainer}>
                  <Text style={styles.previewTitle}>Preview Your Recording</Text>
                  
                  <View style={styles.previewControls}>
                    <TouchableOpacity
                      style={styles.playButton}
                      onPress={isPlaying ? stopPlayback : playRecording}
                    >
                      <Ionicons 
                        name={isPlaying ? "stop-circle" : "play-circle"} 
                        size={50} 
                        color="#8B5CF6" 
                      />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.retryButton}
                      onPress={() => {
                        setRecordingUri(null);
                        setRecordingTime(0);
                      }}
                    >
                      <Ionicons name="refresh" size={24} color="#F59E0B" />
                      <Text style={styles.retryText}>Record Again</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSave}
                  >
                    <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Use This Recording</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  permissionContainer: {
    alignItems: 'center',
    padding: 24,
  },
  permissionText: {
    color: '#A0A0A0',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  recordingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  recordingCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  recordingCircleActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonActive: {
    backgroundColor: '#EF4444',
  },
  timerText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  recordingHint: {
    color: '#808080',
    fontSize: 14,
    marginTop: 12,
  },
  previewContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  previewTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  previewControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 16,
  },
  playButton: {
    padding: 4,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
  },
  retryText: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
