import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  Keyboard,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { useSocket, Message } from '../../src/hooks/useSocket';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

export default function ChatScreen() {
  const { user, logout } = useAuth();
  const { connected, messages, users, userTalking, sendMessage, startTalking, stopTalking, onVoiceStream, offVoiceStream } = useSocket();
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showVoiceMode, setShowVoiceMode] = useState(false);
  const flatListRef = useRef<FlatList>(null);
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

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const requestAudioPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Audio permission denied');
      }
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
    }
  };

  const handleSendMessage = () => {
    if (inputText.trim()) {
      sendMessage(inputText.trim());
      setInputText('');
      Keyboard.dismiss();
    }
  };

  const handlePressIn = async () => {
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

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const msgTime = new Date(timestamp);
    const diff = Math.floor((now.getTime() - msgTime.getTime()) / 1000);
    
    if (diff < 60) return 'agora';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.user_id === user?.user_id;
    const timeAgo = formatTimeAgo(item.timestamp);

    if (isOwnMessage) {
      // Own message - blue, right side, avatar on right
      return (
        <View style={styles.ownMessageRow} testID={`message-${item.message_id}`}>
          <View style={styles.ownBubble}>
            <Text style={styles.ownMessageText}>{item.text}</Text>
            <View style={styles.ownTimeContainer}>
              <Text style={styles.ownTimeText}>{timeAgo}</Text>
              <Ionicons name="checkmark" size={12} color="#FFFFFF" style={{ marginLeft: 2 }} />
            </View>
          </View>
          <Image
            source={{ uri: item.user_picture || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(item.user_name) }}
            style={styles.messageAvatar}
          />
        </View>
      );
    }

    // Other person's message - gray, left side, avatar on left
    return (
      <View style={styles.otherMessageRow} testID={`message-${item.message_id}`}>
        <Image
          source={{ uri: item.user_picture || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(item.user_name) }}
          style={styles.messageAvatar}
        />
        <View style={styles.otherBubble}>
          <Text style={styles.otherSenderName}>{item.user_name}</Text>
          <View style={styles.otherMessageContent}>
            <Text style={styles.otherMessageText}>{item.text}</Text>
            <Text style={styles.otherTimeText}>{timeAgo}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={{ uri: user?.picture || 'https://ui-avatars.com/api/?name=PDD&background=B91C1C&color=fff' }}
            style={styles.headerAvatar}
          />
          <View>
            <Text style={styles.headerName}>PDD+30</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, connected && styles.statusConnected]} />
              <Text style={styles.statusText}>
                {connected ? `${users.length + 1} online` : 'Conectando...'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => setShowVoiceMode(!showVoiceMode)}
            testID="voice-mode-toggle"
          >
            <Ionicons 
              name={showVoiceMode ? "chatbubbles-outline" : "mic-outline"} 
              size={24} 
              color="#374151" 
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} style={styles.headerIconButton} testID="logout-button">
            <Ionicons name="log-out-outline" size={24} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Talking Indicator */}
      {userTalking && userTalking.talking && (
        <View style={styles.talkingIndicator}>
          <Ionicons name="mic" size={16} color="#FFFFFF" />
          <Text style={styles.talkingText}>{userTalking.user_name} está falando...</Text>
        </View>
      )}

      {!showVoiceMode ? (
        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyChat}>
              <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyChatText}>Nenhuma mensagem ainda</Text>
              <Text style={styles.emptyChatSubtext}>Envie a primeira mensagem para o grupo</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.message_id}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />
          )}

          {/* Input - Uber style */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Digite uma mensagem..."
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              testID="message-input"
            />
            {inputText.trim().length > 0 && (
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSendMessage}
                testID="send-message-button"
              >
                <Ionicons name="send" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      ) : (
        /* Walkie-Talkie Mode */
        <View style={styles.voiceMode}>
          <Text style={styles.voiceModeTitle}>Walkie-Talkie</Text>
          <Text style={styles.voiceModeSubtitle}>Pressione e segure para falar</Text>

          <TouchableOpacity
            style={[styles.talkButton, isRecording && styles.talkButtonActive]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.8}
            testID="walkie-talkie-button"
          >
            <Ionicons name="mic" size={72} color="#FFFFFF" />
          </TouchableOpacity>

          {isRecording && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>Gravando...</Text>
            </View>
          )}

          <Text style={styles.voiceModeInstruction}>
            Todos os {users.length + 1} membros do grupo ouvirão sua mensagem.
          </Text>
        </View>
      )}
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
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: '#D1D5DB',
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    padding: 8,
    marginLeft: 4,
  },
  talkingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B91C1C',
    paddingVertical: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  talkingText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    paddingBottom: 20,
  },
  // OTHER MESSAGE (gray, left)
  otherMessageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  messageAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D1D5DB',
  },
  otherBubble: {
    backgroundColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginLeft: 8,
    maxWidth: '75%',
  },
  otherSenderName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 2,
  },
  otherMessageContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  otherMessageText: {
    fontSize: 15,
    color: '#1F2937',
    marginRight: 8,
    flexShrink: 1,
  },
  otherTimeText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  // OWN MESSAGE (blue, right)
  ownMessageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  ownBubble: {
    backgroundColor: '#1E40AF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxWidth: '75%',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  ownMessageText: {
    fontSize: 15,
    color: '#FFFFFF',
    marginRight: 8,
    flexShrink: 1,
  },
  ownTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownTimeText: {
    fontSize: 10,
    color: '#FFFFFF',
    opacity: 0.8,
    fontWeight: '500',
  },
  // EMPTY STATE
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyChatText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptyChatSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  // INPUT (Uber style)
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
    maxHeight: 100,
    color: '#111827',
  },
  sendButton: {
    backgroundColor: '#1E40AF',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  // VOICE MODE
  voiceMode: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  voiceModeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  voiceModeSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 56,
  },
  talkButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#B91C1C',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#B91C1C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  talkButtonActive: {
    backgroundColor: '#DC2626',
    transform: [{ scale: 1.08 }],
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#DC2626',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
  },
  voiceModeInstruction: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 56,
    lineHeight: 20,
  },
});
