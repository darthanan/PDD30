import { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useAuth } from '../src/contexts/AuthContext';

// This screen handles the OAuth redirect callback.
// When Google/Emergent Auth redirects back to exp://.../auth?session_id=XXX
// this screen processes the session_id and logs the user in.
export default function AuthCallback() {
  const router = useRouter();
  const { loading } = useAuth();

  useEffect(() => {
    // The AuthContext already listens for Linking URL events and processes
    // session_id automatically via Linking.addEventListener('url', ...).
    // We just need to wait for loading to finish and redirect.
    const timeout = setTimeout(() => {
      // If still here after 5s, redirect to home
      router.replace('/');
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!loading) {
      router.replace('/');
    }
  }, [loading]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#B91C1C" />
      <Text style={styles.text}>Autenticando...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
});
