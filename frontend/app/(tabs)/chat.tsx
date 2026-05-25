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
  SafeAreaView,
  Image,
  Keyboard,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { useSocket, Message } from '../../src/hooks/useSocket';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

export default function ChatScreen() {
  const { user, logout } = useAuth();
  const { connected, messages, users, userTalking, sendMessage, startTalking, stopTalking, sendVoiceData, onVoiceStream, offVoiceStream } = useSocket();
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showVoiceMode, setShowVoiceMode] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    // Request audio permissions
    requestAudioPermissions();

    // Setup audio mode
    Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: true,
    });

    // Listen for voice streams
    onVoiceStream(handleVoiceStream);

    return () => {
      offVoiceStream();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    // Scroll to bottom when new message arrives
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const requestAudioPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão Negada', 'Permita o acesso ao microfone para usar o walkie-talkie');
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
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Start recording
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

      // Start sending audio chunks periodically
      const interval = setInterval(async () => {
        if (recordingRef.current) {
          try {
            const status = await recordingRef.current.getStatusAsync();
            if (status.isRecording) {
              // Get recording URI and convert to base64
              const uri = recordingRef.current.getURI();
              if (uri) {
                // For real implementation, you would read and send chunks
                // This is simplified for the MVP
              }
            }
          } catch (error) {
            console.error('Error getting recording status:', error);
          }
        }
      }, 100);

      recordingRef.current._interval = interval;
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Erro', 'Não foi possível iniciar a gravação');
    }
  };

  const handlePressOut = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      if (recordingRef.current) {
        clearInterval(recordingRef.current._interval);
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }
      
      setIsRecording(false);
      stopTalking();
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  const handleVoiceStream = async (data: { user_id: string; audio_data: string }) => {
    try {
      // Play received audio
      // For real implementation, you would decode and play the audio data
      // This is simplified for the MVP
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.user_id === user?.user_id;

    return (
      <View style={[styles.messageContainer, isOwnMessage && styles.ownMessageContainer]}>
        {!isOwnMessage && (
          <Image
            source={{ uri: item.user_picture || 'https://via.placeholder.com/40' }}
            style={styles.avatar}
          />
        )}
        <View style={[styles.messageBubble, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
          {!isOwnMessage && <Text style={styles.senderName}>{item.user_name}</Text>}
          <Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>{item.text}</Text>
          <Text style={[styles.timestamp, isOwnMessage && styles.ownTimestamp]}>
            {new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.statusDot, connected && styles.statusConnected]} />
          <View>
            <Text style={styles.headerTitle}>Grupo</Text>
            <Text style={styles.headerSubtitle}>
              {users.length + 1} {users.length === 0 ? 'membro' : 'membros'} online
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.voiceModeButton}
            onPress={() => setShowVoiceMode(!showVoiceMode)}
          >
            <Ionicons name="mic" size={24} color="#667eea" />
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#666" />
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

      {/* Messages List */}
      {!showVoiceMode ? (
        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.message_id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />

          {/* Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Digite uma mensagem..."
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!inputText.trim()}
            >
              <Ionicons name="send" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : (
        /* Walkie-Talkie Mode */
        <View style={styles.voiceMode}>
          <Text style={styles.voiceModeTitle}>Modo Walkie-Talkie</Text>
          <Text style={styles.voiceModeSubtitle}>Pressione e segure para falar</Text>

          <TouchableOpacity
            style={[styles.talkButton, isRecording && styles.talkButtonActive]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.8}
          >
            <Ionicons name="mic" size={64} color="#FFFFFF" />
          </TouchableOpacity>

          {isRecording && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>Gravando...</Text>
            </View>
          )}

          <Text style={styles.voiceModeInstruction}>
            Pressione e segure o botão do microfone para falar.
            Todos no grupo ouvirão em tempo real.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#999',
    marginRight: 12,
  },
  statusConnected: {
    backgroundColor: '#4CAF50',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voiceModeButton: {
    padding: 8,
    marginRight: 8,
  },
  logoutButton: {
    padding: 8,
  },
  talkingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingVertical: 8,
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
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '70%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  otherMessage: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  ownMessage: {
    backgroundColor: '#667eea',
    borderBottomRightRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667eea',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
  ownTimestamp: {
    color: '#E8E8FF',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#667eea',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CCC',
  },
  voiceMode: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  voiceModeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  voiceModeSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 48,
  },
  talkButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  talkButtonActive: {
    backgroundColor: '#FF5252',
    transform: [{ scale: 1.1 }],
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF5252',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF5252',
  },
  voiceModeInstruction: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 48,
    lineHeight: 20,
  },
});
