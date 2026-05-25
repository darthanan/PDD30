import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../src/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

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

        {/* PDD Label */}
        <Text style={styles.pddLabel} testID="app-title">PDD</Text>

        {/* +R$30 Red pill button with glow */}
        <View style={styles.buttonGlowWrapper}>
          {/* Glow effect */}
          <View style={styles.glow} />
          
          <TouchableOpacity
            style={styles.buttonShadow}
            onPress={login}
            activeOpacity={0.85}
            testID="login-button"
          >
            <LinearGradient
              colors={['#B91C1C', '#7F1D1D', '#5C0F0F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.button}
            >
              {/* Outer silver border ring */}
              <View style={styles.silverRing}>
                {/* Inner gradient with gloss */}
                <LinearGradient
                  colors={['#DC2626', '#991B1B', '#7F1D1D']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.buttonInnerGradient}
                >
                  {/* Gloss highlight on top */}
                  <LinearGradient
                    colors={['rgba(255,255,255,0.45)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 0.6 }}
                    style={styles.buttonGloss}
                  />
                  <Text style={styles.buttonText}>+R$30</Text>
                </LinearGradient>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Bottom spacer */}
        <View style={styles.middleSpacer} />

        {/* Bottom text */}
        <View style={styles.bottomTextContainer}>
          <Text style={styles.bottomTitle}>Próxima viagem: +R$30</Text>
          <Text style={styles.bottomSubtitle}>Preço dinâmico mínimo</Text>
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
    flex: 0.4,
  },
  pddLabel: {
    fontSize: 64,
    fontWeight: '800',
    color: '#374151',
    letterSpacing: 2,
    marginBottom: 8,
  },
  buttonGlowWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    width: 360,
    height: 140,
    borderRadius: 80,
    backgroundColor: '#FCD34D',
    opacity: 0.5,
    shadowColor: '#FCD34D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 50,
    elevation: 20,
  },
  buttonShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 12,
    borderRadius: 100,
  },
  button: {
    width: 320,
    height: 110,
    borderRadius: 100,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  silverRing: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
    backgroundColor: '#9CA3AF',
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonInnerGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  buttonGloss: {
    position: 'absolute',
    top: 4,
    left: 12,
    right: 12,
    height: '45%',
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
  },
  buttonText: {
    fontSize: 44,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 0.5,
  },
  middleSpacer: {
    flex: 0.5,
  },
  bottomTextContainer: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  bottomTitle: {
    fontSize: 22,
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
