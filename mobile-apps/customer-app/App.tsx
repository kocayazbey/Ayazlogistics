import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeIcon, MagnifyingGlassIcon, DocumentTextIcon, UserIcon } from 'react-native-heroicons/outline';

import { HomeScreen, TrackingScreen, InvoicesScreen, ProfileScreen } from './src/screens';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#3b82f6',
            tabBarInactiveTintColor: '#9ca3af',
            tabBarStyle: {
              backgroundColor: '#ffffff',
              borderTopWidth: 1,
              borderTopColor: '#e5e7eb',
              paddingBottom: 5,
              height: 60,
            },
          }}
        >
          <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size} /> }} />
          <Tab.Screen name="Tracking" component={TrackingScreen} options={{ tabBarIcon: ({ color, size }) => <MagnifyingGlassIcon color={color} size={size} /> }} />
          <Tab.Screen name="Invoices" component={InvoicesScreen} options={{ tabBarIcon: ({ color, size }) => <DocumentTextIcon color={color} size={size} /> }} />
          <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: ({ color, size }) => <UserIcon color={color} size={size} /> }} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

