import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const SESSION_KEY = 'user_session_token';

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  sessionToken: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkExistingSession();
  }, []);

  // Handle deep linking for auth callback
  useEffect(() => {
    const handleUrl = async ({ url }: { url: string }) => {
      const sessionId = extractSessionId(url);
      if (sessionId) {
        await processSessionId(sessionId);
      }
    };

    // Check initial URL (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl({ url });
      }
    });

    // Listen for URL changes (hot linking)
    const subscription = Linking.addEventListener('url', handleUrl);

    return () => {
      subscription.remove();
    };
  }, []);

  const checkExistingSession = async () => {
    try {
      setLoading(true);
      
      // Get stored token
      let token: string | null = null;
      
      if (Platform.OS === 'web') {
        token = localStorage.getItem(SESSION_KEY);
      } else {
        token = await SecureStore.getItemAsync(SESSION_KEY);
      }
      
      if (token) {
        // Verify token with backend
        const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setSessionToken(token);
        } else {
          // Token invalid, clear it
          await clearSession();
        }
      }
    } catch (error) {
      console.error('Error checking session:', error);
      await clearSession();
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    try {
      // Get redirect URL based on platform
      const redirectUrl = Platform.OS === 'web'
        ? window.location.origin + '/'
        : Linking.createURL('auth');
      
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      
      if (Platform.OS === 'web') {
        // On web, navigate directly
        window.location.href = authUrl;
      } else {
        // On mobile, use WebBrowser
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
        
        if (result.type === 'success' && result.url) {
          const sessionId = extractSessionId(result.url);
          if (sessionId) {
            await processSessionId(sessionId);
          }
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const extractSessionId = (url: string): string | null => {
    try {
      // Check hash fragment
      if (url.includes('#session_id=')) {
        return url.split('#session_id=')[1].split('&')[0];
      }
      // Check query parameter
      if (url.includes('?session_id=') || url.includes('&session_id=')) {
        const urlObj = new URL(url);
        return urlObj.searchParams.get('session_id');
      }
      return null;
    } catch (error) {
      console.error('Error extracting session_id:', error);
      return null;
    }
  };

  const processSessionId = async (sessionId: string) => {
    try {
      // Exchange session_id for session_token
      const response = await fetch(`${BACKEND_URL}/api/auth/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ session_token: sessionId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create session');
      }
      
      const data = await response.json();
      const token = data.session_token;
      const userData = data.user;
      
      // Store token
      if (Platform.OS === 'web') {
        localStorage.setItem(SESSION_KEY, token);
        // Clean URL
        window.history.replaceState(null, '', window.location.pathname);
      } else {
        await SecureStore.setItemAsync(SESSION_KEY, token);
      }
      
      setSessionToken(token);
      setUser(userData);
      setLoading(false);
    } catch (error) {
      console.error('Error processing session:', error);
      setLoading(false);
      throw error;
    }
  };

  const clearSession = async () => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(SESSION_KEY);
    } else {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    }
    setSessionToken(null);
    setUser(null);
  };

  const logout = async () => {
    try {
      if (sessionToken) {
        // Call logout endpoint
        await fetch(`${BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionToken}`
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await clearSession();
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, sessionToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
