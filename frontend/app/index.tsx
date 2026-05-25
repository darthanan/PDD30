import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useAuth } from '../src/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function Index() {
  const { user, loading, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/(tabs)/chat');
    }
  }, [user, loading]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B91C1C" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Top spacer */}
        <View style={styles.topSpacer} />

        {/* App Title */}
        <Text style={styles.title} testID="app-title">SVH</Text>

        {/* Main red pill button */}
        <TouchableOpacity
          style={styles.buttonShadow}
          onPress={login}
          activeOpacity={0.85}
          testID="login-button"
        >
          <LinearGradient
            colors={['#DC2626', '#991B1B', '#7F1D1D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.button}
          >
            {/* Inner highlight to create gloss effect */}
            <LinearGradient
              colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 0.5 }}
              style={styles.buttonGloss}
            />
            <View style={styles.buttonInner}>
              <Ionicons name="logo-google" size={26} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Entrar</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Bottom spacer */}
        <View style={styles.middleSpacer} />

        {/* Bottom text */}
        <View style={styles.bottomTextContainer}>
          <Text style={styles.bottomTitle}>Social Voice Hub</Text>
          <Text style={styles.bottomSubtitle}>Chat ao vivo + Walkie-Talkie</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  topSpacer: {
    flex: 0.45,
  },
  title: {
    fontSize: 56,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: 2,
    marginBottom: 16,
  },
  buttonShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 14,
    borderRadius: 100,
  },
  button: {
    width: 280,
    height: 90,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#7F1D1D',
    overflow: 'hidden',
  },
  buttonGloss: {
    position: 'absolute',
    top: 2,
    left: 8,
    right: 8,
    height: '50%',
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 12,
  },
  buttonText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
  middleSpacer: {
    flex: 0.45,
  },
  bottomTextContainer: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  bottomTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  bottomSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '400',
  },
});
