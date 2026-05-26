import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { useSocket } from '../../src/hooks/useSocket';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import MembersModal from '../../src/components/MembersModal';

export default function VoiceScreen() {
  const { user } = useAuth();
  const { connected, users, userTalking, startTalking, stopTalking, onVoiceStream, offVoiceStream } = useSocket();
  const [isRecording, setIsRecording] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  useEffect(() => {
    requestAudioPermissions();

    Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    });

    onVoiceStream(() => {});

    return () => {
      offVoiceStream();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
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

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });

      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      startTalking();
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const handlePressOut = async () => {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }

      setIsRecording(false);
      stopTalking();
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  const allMembers = user
    ? [
        { user_id: user.user_id, user_name: user.name, user_picture: user.picture },
        ...users,
      ]
    : users;

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

      {/* Talking Indicator */}
      {userTalking && userTalking.talking && (
        <View style={styles.talkingBanner}>
          <View style={styles.talkingPulse} />
          <Ionicons name="mic" size={16} color="#FFFFFF" />
          <Text style={styles.talkingText}>{userTalking.user_name} está falando...</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {/* Online Members Horizontal List */}
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

          <TouchableOpacity
            style={[styles.talkButton, isRecording && styles.talkButtonActive]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.9}
            testID="walkie-talkie-button"
          >
            {/* Outer pulse rings when recording */}
            {isRecording && (
              <>
                <View style={[styles.pulseRing, styles.pulseRing1]} />
                <View style={[styles.pulseRing, styles.pulseRing2]} />
              </>
            )}
            <View style={styles.talkButtonInner}>
              <Ionicons name="mic" size={72} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

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
    marginBottom: 32,
  },
  talkButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
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
  talkButtonActive: {
    transform: [{ scale: 1.05 }],
  },
  pulseRing: {
    position: 'absolute',
    borderRadius: 200,
    borderWidth: 4,
    borderColor: '#B91C1C',
    opacity: 0.3,
  },
  pulseRing1: {
    width: 240,
    height: 240,
  },
  pulseRing2: {
    width: 280,
    height: 280,
    opacity: 0.15,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
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
    marginTop: 32,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
});
