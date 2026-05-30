import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { useSocket } from '../../src/hooks/useSocket';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import MembersModal from '../../src/components/MembersModal';

export default function VoiceScreen() {
  const { user } = useAuth();
  const {
    connected,
    users,
    userTalking,
    startTalking,
    stopTalking,
    sendVoiceData,
    onVoiceStream,
    offVoiceStream,
  } = useSocket();

  const [isRecording, setIsRecording] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Animated values for pulse rings
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef<Animated.CompositeAnimation | null>(null);

  // ─── Pulse animation ────────────────────────────────────────────────────────

  const startPulse = useCallback(() => {
    pulse1.setValue(0);
    pulse2.setValue(0);
    pulseAnim.current = Animated.loop(
      Animated.stagger(300, [
        Animated.sequence([
          Animated.timing(pulse1, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulse1, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(pulse2, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulse2, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    pulseAnim.current.start();
  }, [pulse1, pulse2]);

  const stopPulse = useCallback(() => {
    pulseAnim.current?.stop();
    pulse1.setValue(0);
    pulse2.setValue(0);
  }, [pulse1, pulse2]);

  // ─── Audio permissions ───────────────────────────────────────────────────────

  useEffect(() => {
    requestAudioPermissions();

    Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    });

    return () => {
      offVoiceStream();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  // ─── Register incoming voice handler ────────────────────────────────────────

  useEffect(() => {
    onVoiceStream(handleIncomingVoice);
    return () => {
      offVoiceStream();
    };
  }, []);

  const requestAudioPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      setPermissionGranted(status === 'granted');
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
    }
  };

  // ─── Play incoming audio from another user ───────────────────────────────────

  const handleIncomingVoice = async (data: { user_id: string; audio_data: string }) => {
    // Don't play our own audio back
    if (data.user_id === user?.user_id) return;
    if (!data.audio_data) return;

    try {
      setIsPlaying(true);

      // Unload any previously playing sound
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      // Write base64 audio to a temp file
      const fileUri = `${FileSystem.cacheDirectory}incoming_voice_${Date.now()}.m4a`;
      await FileSystem.writeAsStringAsync(fileUri, data.audio_data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Play it
      const { sound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        { shouldPlay: true, volume: 1.0 }
      );
      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          sound.unloadAsync().catch(() => {});
          // Clean up temp file
          FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
        }
      });
    } catch (error) {
      console.error('Error playing incoming voice:', error);
      setIsPlaying(false);
    }
  };

  // ─── Push-to-talk: press down ────────────────────────────────────────────────

  const handlePressIn = async () => {
    if (!permissionGranted) {
      Alert.alert(
        'Permissão Necessária',
        'Permita o acesso ao microfone para usar o walkie-talkie',
        [{ text: 'OK', onPress: requestAudioPermissions }]
      );
      return;
    }

    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 22050,
          numberOfChannels: 1,
          bitRate: 64000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.IOSAudioQuality.MEDIUM,
          sampleRate: 22050,
          numberOfChannels: 1,
          bitRate: 64000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 64000,
        },
      });

      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      startTalking();
      startPulse();
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  // ─── Push-to-talk: release ───────────────────────────────────────────────────

  const handlePressOut = async () => {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      stopPulse();
      setIsRecording(false);
      stopTalking();

      if (!recordingRef.current) return;

      // Stop and get the URI
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        console.warn('No recording URI available');
        return;
      }

      // Switch audio mode back to playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      // Read file as base64 and transmit
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      sendVoiceData(base64Audio);

      // Clean up the local recording file
      FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsRecording(false);
      stopPulse();
      recordingRef.current = null;
    }
  };

  // ─── Derived data ────────────────────────────────────────────────────────────

  const allMembers = user
    ? [
        { user_id: user.user_id, user_name: user.name, user_picture: user.picture },
        ...users.filter((u) => u.user_id !== user.user_id),
      ]
    : users;

  const pulseScale1 = pulse1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] });
  const pulseOpacity1 = pulse1.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 0.2, 0] });
  const pulseScale2 = pulse2.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] });
  const pulseOpacity2 = pulse2.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.35, 0.1, 0] });

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setShowMembers(true)}
        activeOpacity={0.7}
        testID="voice-header"
      >
        <View style={styles.headerLeft}>
          <View style={styles.groupIcon}>
            <Ionicons name="radio" size={22} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.headerName}>Walkie-Talkie</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, connected && styles.statusConnected]} />
              <Text style={styles.statusText}>
                {connected ? `${allMembers.length} online · Toque para ver` : 'Conectando...'}
              </Text>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-down" size={20} color="#6B7280" />
      </TouchableOpacity>

      {/* Incoming audio / someone talking banner */}
      {(userTalking?.talking || isPlaying) && (
        <View style={[styles.talkingBanner, isPlaying && styles.playingBanner]}>
          <Animated.View style={styles.talkingPulse} />
          <Ionicons name={isPlaying ? 'volume-high' : 'mic'} size={16} color="#FFFFFF" />
          <Text style={styles.talkingText}>
            {isPlaying
              ? 'Reproduzindo áudio...'
              : `${userTalking?.user_name} está falando...`}
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {/* Online Members */}
        <View style={styles.membersSection}>
          <Text style={styles.sectionTitle}>Membros Online ({allMembers.length})</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.membersScroll}
          >
            {allMembers.map((member) => {
              const isTalkingNow = userTalking?.talking && userTalking?.user_id === member.user_id;
              const isYou = member.user_id === user?.user_id;
              return (
                <View key={member.user_id} style={styles.memberCard} testID={`voice-member-${member.user_id}`}>
                  <View style={[styles.memberAvatarWrapper, isTalkingNow && styles.memberAvatarTalking]}>
                    <Image
                      source={{
                        uri:
                          member.user_picture ||
                          'https://ui-avatars.com/api/?name=' + encodeURIComponent(member.user_name),
                      }}
                      style={styles.memberAvatar}
                    />
                    {isTalkingNow && (
                      <View style={styles.talkingBadge}>
                        <Ionicons name="mic" size={10} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.memberName} numberOfLines={1}>
                    {isYou ? 'Você' : member.user_name.split(' ')[0]}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* Walkie-Talkie Button */}
        <View style={styles.walkieSection}>
          <Text style={styles.walkieTitle}>Pressione e segure para falar</Text>

          <View style={styles.talkButtonWrapper}>
            {/* Animated pulse rings */}
            {isRecording && (
              <>
                <Animated.View
                  style={[
                    styles.pulseRing,
                    { transform: [{ scale: pulseScale1 }], opacity: pulseOpacity1 },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.pulseRing,
                    styles.pulseRing2,
                    { transform: [{ scale: pulseScale2 }], opacity: pulseOpacity2 },
                  ]}
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.talkButton, isRecording && styles.talkButtonActive]}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              activeOpacity={0.9}
              testID="walkie-talkie-button"
            >
              <View style={[styles.talkButtonInner, isRecording && styles.talkButtonInnerActive]}>
                <Ionicons name="mic" size={72} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>

          {isRecording ? (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>Transmitindo...</Text>
            </View>
          ) : (
            <Text style={styles.walkieHint}>
              {permissionGranted
                ? `Sua voz será ouvida por todos os ${allMembers.length} membros`
                : 'Permita o acesso ao microfone para começar'}
            </Text>
          )}
        </View>
      </ScrollView>

      <MembersModal
        visible={showMembers}
        onClose={() => setShowMembers(false)}
        currentUser={user}
        users={users}
        connected={connected}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#B91C1C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9CA3AF',
    marginRight: 6,
  },
  statusConnected: {
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  talkingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B91C1C',
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  playingBanner: {
    backgroundColor: '#1D4ED8',
  },
  talkingPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 10,
  },
  talkingText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  membersSection: {
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  membersScroll: {
    paddingRight: 16,
  },
  memberCard: {
    alignItems: 'center',
    marginRight: 16,
    width: 64,
  },
  memberAvatarWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    padding: 2,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 6,
    position: 'relative',
  },
  memberAvatarTalking: {
    borderColor: '#B91C1C',
  },
  memberAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    backgroundColor: '#D1D5DB',
  },
  talkingBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#B91C1C',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  memberName: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
    textAlign: 'center',
  },
  walkieSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 32,
  },
  walkieTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 48,
  },
  talkButtonWrapper: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#B91C1C',
  },
  pulseRing2: {
    backgroundColor: '#B91C1C',
  },
  talkButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  talkButtonInner: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#B91C1C',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#B91C1C',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
  },
  talkButtonInnerActive: {
    backgroundColor: '#991B1B',
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 24,
  },
  talkButtonActive: {
    transform: [{ scale: 1.05 }],
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
  },
  recordingDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#DC2626',
    marginRight: 10,
  },
  recordingText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#DC2626',
  },
  walkieHint: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 40,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
});
