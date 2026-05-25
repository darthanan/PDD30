import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useAuth } from '../../src/contexts/AuthContext';
import { useSocket } from '../../src/hooks/useSocket';
import { Ionicons } from '@expo/vector-icons';

export default function MapScreen() {
  const { user } = useAuth();
  const { connected, users, updateLocation } = useSocket();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setErrorMsg('Permissão de localização negada');
        Alert.alert(
          'Permissão Negada',
          'Permita o acesso à localização para ver o mapa ao vivo'
        );
        return;
      }

      // Get current location
      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);

      // Start watching location
      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Or when moved 10 meters
        },
        (newLocation) => {
          setLocation(newLocation);
          
          // Send location update to server
          if (connected) {
            updateLocation(
              newLocation.coords.latitude,
              newLocation.coords.longitude
            );
          }
        }
      );
    } catch (error) {
      console.error('Error getting location:', error);
      setErrorMsg('Erro ao obter localização');
    }
  };

  if (errorMsg) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="location-outline" size={64} color="#999" />
          <Text style={styles.errorText}>{errorMsg}</Text>
          <Text style={styles.errorSubtext}>
            Ative a permissão de localização nas configurações do app
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!location) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="location" size={64} color="#667eea" />
          <Text style={styles.loadingText}>Obtendo sua localização...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="location" size={24} color="#667eea" />
          <Text style={styles.headerTitle}>Mapa ao Vivo</Text>
        </View>
        <View style={[styles.statusDot, connected && styles.statusConnected]} />
      </View>

      {/* User Count */}
      <View style={styles.userCountContainer}>
        <Ionicons name="people" size={16} color="#FFFFFF" />
        <Text style={styles.userCountText}>
          {users.filter(u => u.location).length + 1} {users.length === 0 ? 'usuário' : 'usuários'} visíveis
        </Text>
      </View>

      {/* Map */}
      <MapView
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
      >
        {/* Current user marker */}
        <Marker
          coordinate={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }}
          title={user?.name}
          description="Você"
        >
          <View style={styles.markerContainer}>
            <View style={[styles.marker, styles.ownMarker]}>
              <Ionicons name="person" size={20} color="#FFFFFF" />
            </View>
          </View>
        </Marker>

        {/* Other users markers */}
        {users.map((connectedUser) => {
          if (!connectedUser.location) return null;

          return (
            <Marker
              key={connectedUser.user_id}
              coordinate={{
                latitude: connectedUser.location.latitude,
                longitude: connectedUser.location.longitude,
              }}
              title={connectedUser.user_name}
            >
              <View style={styles.markerContainer}>
                <View style={styles.marker}>
                  <Ionicons name="person" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.markerLabel}>{connectedUser.user_name}</Text>
              </View>
            </Marker>
          );
        })}
      </MapView>
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
  userCountContainer: {
    position: 'absolute',
    top: 70,
    right: 16,
    backgroundColor: '#667eea',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  userCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  ownMarker: {
    backgroundColor: '#4CAF50',
  },
  markerLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});
