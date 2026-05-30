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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { useSocket, Message } from '../../src/hooks/useSocket';
import MembersModal from '../../src/components/MembersModal';

export default function ChatScreen() {
  const { user, logout } = useAuth();
  const { connected, messages, users, sendMessage } = useSocket();
  const [inputText, setInputText] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (inputText.trim()) {
      sendMessage(inputText.trim());
      setInputText('');
      Keyboard.dismiss();
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
      {/* Header - clickable to open members modal */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setShowMembers(true)}
        activeOpacity={0.7}
        testID="chat-header"
      >
        <View style={styles.headerLeft}>
          <View style={styles.groupIcon}>
            <Ionicons name="chatbubbles" size={22} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.headerName}>PDD+30</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, connected && styles.statusConnected]} />
              <Text style={styles.statusText}>
                {connected ? `${users.length + 1} online · Toque para ver` : 'Conectando...'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
          <TouchableOpacity onPress={logout} style={styles.logoutButton} testID="logout-button">
            <Ionicons name="log-out-outline" size={24} color="#374151" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Watermark Background */}
        <View style={styles.watermarkContainer} pointerEvents="none">
          <Text style={styles.watermarkText}>+30</Text>
        </View>

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
    backgroundColor: '#1E40AF',
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutButton: {
    padding: 8,
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  watermarkContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: -1,
  },
  watermarkText: {
    fontSize: 120,
    fontWeight: 'bold',
    color: '#000000',
    opacity: 0.05,
    transform: [{ rotate: '-45deg' }],
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    paddingBottom: 20,
  },
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
});
