import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Passenger {
  passenger_id: string;
  user_id: string;
  name: string;
  date: string;
  created_at: string;
}

export default function PassengersScreen() {
  const { sessionToken } = useAuth();
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPassengerName, setNewPassengerName] = useState('');

  useEffect(() => {
    fetchPassengers();
  }, []);

  const fetchPassengers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/passengers`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPassengers(data);
      } else {
        Alert.alert('Erro', 'Não foi possível carregar os passageiros');
      }
    } catch (error) {
      console.error('Error fetching passengers:', error);
      Alert.alert('Erro', 'Erro ao carregar passageiros');
    } finally {
      setLoading(false);
    }
  };

  const addPassenger = async () => {
    if (!newPassengerName.trim()) {
      Alert.alert('Atenção', 'Digite o nome do passageiro');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/passengers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          name: newPassengerName.trim(),
          date: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        const newPassenger = await response.json();
        setPassengers([newPassenger, ...passengers]);
        setNewPassengerName('');
        setShowAddModal(false);
      } else {
        Alert.alert('Erro', 'Não foi possível adicionar o passageiro');
      }
    } catch (error) {
      console.error('Error adding passenger:', error);
      Alert.alert('Erro', 'Erro ao adicionar passageiro');
    }
  };

  const deletePassenger = async (passengerId: string) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Deseja realmente excluir este passageiro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/api/passengers/${passengerId}`, {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${sessionToken}`,
                },
              });

              if (response.ok) {
                setPassengers(passengers.filter((p) => p.passenger_id !== passengerId));
              } else {
                Alert.alert('Erro', 'Não foi possível excluir o passageiro');
              }
            } catch (error) {
              console.error('Error deleting passenger:', error);
              Alert.alert('Erro', 'Erro ao excluir passageiro');
            }
          },
        },
      ]
    );
  };

  const renderPassenger = ({ item }: { item: Passenger }) => {
    const date = new Date(item.date);
    const dateStr = date.toLocaleDateString('pt-BR');
    const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={styles.passengerCard}>
        <View style={styles.passengerInfo}>
          <View style={styles.passengerIcon}>
            <Ionicons name="person" size={24} color="#667eea" />
          </View>
          <View style={styles.passengerDetails}>
            <Text style={styles.passengerName}>{item.name}</Text>
            <Text style={styles.passengerDate}>
              {dateStr} às {timeStr}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deletePassenger(item.passenger_id)}
        >
          <Ionicons name="trash-outline" size={20} color="#FF5252" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="people" size={24} color="#1E40AF" />
          <Text style={styles.headerTitle}>Passageiros Uber</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Passengers List */}
      {loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Carregando...</Text>
        </View>
      ) : passengers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>Nenhum passageiro cadastrado</Text>
          <Text style={styles.emptySubtext}>Toque no + para adicionar seu primeiro passageiro</Text>
        </View>
      ) : (
        <FlatList
          data={passengers}
          renderItem={renderPassenger}
          keyExtractor={(item) => item.passenger_id}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Add Passenger Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowAddModal(false)}
          />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Novo Passageiro</Text>
            <Text style={styles.modalSubtitle}>
              A data e hora serão registradas automaticamente
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Nome do passageiro"
              value={newPassengerName}
              onChangeText={setNewPassengerName}
              autoFocus
              maxLength={100}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowAddModal(false);
                  setNewPassengerName('');
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={addPassenger}
              >
                <Text style={styles.modalButtonTextSave}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E40AF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  passengerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  passengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  passengerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  passengerDetails: {
    flex: 1,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  passengerDate: {
    fontSize: 14,
    color: '#666',
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  modalInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F5F5F5',
  },
  modalButtonSave: {
    backgroundColor: '#1E40AF',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalButtonTextSave: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
