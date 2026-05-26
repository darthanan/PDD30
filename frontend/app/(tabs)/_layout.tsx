import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  
  // Add extra padding for Android navigation bar
  const bottomPadding = Platform.OS === 'android' ? Math.max(insets.bottom, 12) : insets.bottom;
  const tabBarHeight = 60 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1E40AF',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: tabBarHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="passengers"
        options={{
          title: 'Passageiros',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="voice"
        options={{
          title: 'Walkie',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="radio" size={size} color={color} />
          ),
          tabBarActiveTintColor: '#B91C1C',
        }}
      />
    </Tabs>
  );
}
