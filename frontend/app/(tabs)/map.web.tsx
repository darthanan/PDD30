import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useSocket } from '../../src/hooks/useSocket';
import { Ionicons } from '@expo/vector-icons';

export default function MapScreen() {
  const { connected } = useSocket();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="location" size={24} color="#667eea" />
          <Text style={styles.headerTitle}>Mapa ao Vivo</Text>
        </View>
        <View style={[styles.statusDot, connected && styles.statusConnected]} />
      </View>
      <View style={styles.webNotSupported}>
        <Ionicons name="phone-portrait-outline" size={64} color="#999" />
        <Text style={styles.webNotSupportedText}>Mapa Interativo</Text>
        <Text style={styles.webNotSupportedSubtext}>
          O mapa com localização em tempo real está disponível apenas no app mobile.
          Por favor, acesse pelo seu smartphone para ver a localização de todos os membros do grupo.
        </Text>
      </View>
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
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#999',
  },
  statusConnected: {
    backgroundColor: '#4CAF50',
  },
  webNotSupported: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  webNotSupportedText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
  },
  webNotSupportedSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});
