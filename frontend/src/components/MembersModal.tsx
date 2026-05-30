import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ConnectedUser } from '../hooks/useSocket';

interface User {
  user_id: string;
  name: string;
  picture?: string;
}

interface MembersModalProps {
  visible: boolean;
  onClose: () => void;
  currentUser: User | null;
  users: ConnectedUser[];
  connected: boolean;
}

export default function MembersModal({ visible, onClose, currentUser, users, connected }: MembersModalProps) {
  // Build unique members list (deduplicate by user_id)
  const seen = new Set<string>();
  const baseList = currentUser
    ? [
        {
          user_id: currentUser.user_id,
          user_name: currentUser.name + ' (Você)',
          user_picture: currentUser.picture,
          isOwner: true,
        },
        ...users.filter((u) => u.user_id !== currentUser.user_id).map((u) => ({ ...u, isOwner: false })),
      ]
    : users.map((u) => ({ ...u, isOwner: false }));
  const allMembers = baseList.filter((m) => {
    if (seen.has(m.user_id)) return false;
    seen.add(m.user_id);
    return true;
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
        testID="members-modal-overlay"
      />
      <View style={styles.modalContent}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.title}>Membros Online</Text>
          <View style={styles.countBadge}>
            <View style={[styles.statusDot, connected && styles.statusConnected]} />
            <Text style={styles.countText}>{allMembers.length}</Text>
          </View>
        </View>

        {allMembers.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>Nenhum membro online</Text>
          </View>
        ) : (
          <FlatList
            data={allMembers}
            keyExtractor={(item, index) => `${item.user_id}-${index}`}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.memberRow} testID={`member-${item.user_id}`}>
                <Image
                  source={{
                    uri:
                      item.user_picture ||
                      'https://ui-avatars.com/api/?name=' + encodeURIComponent(item.user_name),
                  }}
                  style={styles.avatar}
                />
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{item.user_name}</Text>
                  <View style={styles.onlineRow}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.onlineText}>Online</Text>
                  </View>
                </View>
              </View>
            )}
          />
        )}

        <TouchableOpacity style={styles.closeButton} onPress={onClose} testID="close-members-button">
          <Text style={styles.closeButtonText}>Fechar</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '75%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
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
  countText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  list: {
    paddingHorizontal: 24,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D1D5DB',
    marginRight: 14,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  onlineText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '500',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9CA3AF',
  },
  closeButton: {
    marginTop: 20,
    marginHorizontal: 24,
    backgroundColor: '#1E40AF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
