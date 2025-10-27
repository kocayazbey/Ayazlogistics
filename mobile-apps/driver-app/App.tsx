import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TruckIcon, MapIcon, ClipboardIcon, UserIcon } from 'react-native-heroicons/outline';

import HomeScreen from './src/screens/HomeScreen';
import RoutesScreen from './src/screens/RoutesScreen';
import TasksScreen from './src/screens/TasksScreen';
import ProfileScreen from './src/screens/ProfileScreen';

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
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{
              tabBarIcon: ({ color, size }) => <TruckIcon color={color} size={size} />,
              tabBarLabel: 'Dashboard',
            }}
          />
          <Tab.Screen
            name="Routes"
            component={RoutesScreen}
            options={{
              tabBarIcon: ({ color, size }) => <MapIcon color={color} size={size} />,
              tabBarLabel: 'Routes',
            }}
          />
          <Tab.Screen
            name="Tasks"
            component={TasksScreen}
            options={{
              tabBarIcon: ({ color, size }) => <ClipboardIcon color={color} size={size} />,
              tabBarLabel: 'Tasks',
            }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              tabBarIcon: ({ color, size }) => <UserIcon color={color} size={size} />,
              tabBarLabel: 'Profile',
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

