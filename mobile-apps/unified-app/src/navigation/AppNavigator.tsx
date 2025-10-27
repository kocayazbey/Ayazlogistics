import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, Text, StyleSheet } from 'react-native';
import { CorporateTheme } from '../styles/CorporateTheme';
import { useAuth } from '../contexts/AuthContext';

// Import screens
import { TaskScreen } from '../screens/TaskScreen';
import { InventoryScreen } from '../screens/InventoryScreen';
import { OrderScreen } from '../screens/OrderScreen';
import { InvoiceScreen } from '../screens/InvoiceScreen';
import { CustomerScreen } from '../screens/CustomerScreen';
import { EmployeeScreen } from '../screens/EmployeeScreen';
import { ReportScreen } from '../screens/ReportScreen';
import { NotificationScreen } from '../screens/NotificationScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

// Import components
import { RealTimeStatus } from '../components/RealTimeStatus';
import RoleBasedNavigator from './RoleBasedNavigator';
import LoginScreen from '../screens/LoginScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

// Role-based navigation configuration
const getRoleBasedTabs = (role: string) => {
  const commonTabs = [
    {
      name: 'Tasks',
      component: TaskScreen,
      title: 'Görevler',
      icon: '📋',
    },
    {
      name: 'Notifications',
      component: NotificationScreen,
      title: 'Bildirimler',
      icon: '🔔',
    },
    {
      name: 'Profile',
      component: ProfileScreen,
      title: 'Profil',
      icon: '👤',
    },
  ];

  switch (role) {
    case 'warehouse_operator':
      return [
        ...commonTabs,
        {
          name: 'Inventory',
          component: InventoryScreen,
          title: 'Envanter',
          icon: '📦',
        },
        {
          name: 'Orders',
          component: OrderScreen,
          title: 'Siparişler',
          icon: '📋',
        },
      ];
    
    case 'forklift_operator':
      return [
        ...commonTabs,
        {
          name: 'Inventory',
          component: InventoryScreen,
          title: 'Envanter',
          icon: '📦',
        },
        {
          name: 'Tasks',
          component: TaskScreen,
          title: 'Görevler',
          icon: '🚜',
        },
      ];
    
    case 'accountant':
      return [
        ...commonTabs,
        {
          name: 'Invoices',
          component: InvoiceScreen,
          title: 'Faturalar',
          icon: '💰',
        },
        {
          name: 'Reports',
          component: ReportScreen,
          title: 'Raporlar',
          icon: '📊',
        },
      ];
    
    case 'sales_representative':
      return [
        ...commonTabs,
        {
          name: 'Customers',
          component: CustomerScreen,
          title: 'Müşteriler',
          icon: '👥',
        },
        {
          name: 'Orders',
          component: OrderScreen,
          title: 'Siparişler',
          icon: '📋',
        },
      ];
    
    case 'hr_manager':
      return [
        ...commonTabs,
        {
          name: 'Employees',
          component: EmployeeScreen,
          title: 'Çalışanlar',
          icon: '👥',
        },
        {
          name: 'Reports',
          component: ReportScreen,
          title: 'Raporlar',
          icon: '📊',
        },
      ];
    
    case 'supervisor':
      return [
        ...commonTabs,
        {
          name: 'Inventory',
          component: InventoryScreen,
          title: 'Envanter',
          icon: '📦',
        },
        {
          name: 'Orders',
          component: OrderScreen,
          title: 'Siparişler',
          icon: '📋',
        },
        {
          name: 'Reports',
          component: ReportScreen,
          title: 'Raporlar',
          icon: '📊',
        },
      ];
    
    case 'admin':
      return [
        ...commonTabs,
        {
          name: 'Inventory',
          component: InventoryScreen,
          title: 'Envanter',
          icon: '📦',
        },
        {
          name: 'Orders',
          component: OrderScreen,
          title: 'Siparişler',
          icon: '📋',
        },
        {
          name: 'Invoices',
          component: InvoiceScreen,
          title: 'Faturalar',
          icon: '💰',
        },
        {
          name: 'Customers',
          component: CustomerScreen,
          title: 'Müşteriler',
          icon: '👥',
        },
        {
          name: 'Employees',
          component: EmployeeScreen,
          title: 'Çalışanlar',
          icon: '👥',
        },
        {
          name: 'Reports',
          component: ReportScreen,
          title: 'Raporlar',
          icon: '📊',
        },
        {
          name: 'Settings',
          component: SettingsScreen,
          title: 'Ayarlar',
          icon: '⚙️',
        },
      ];
    
    default:
      return commonTabs;
  }
};

// Custom tab bar component
const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  return (
    <View style={styles.tabBar}>
      <RealTimeStatus />
      <View style={styles.tabContainer}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              style={[
                styles.tabItem,
                isFocused && styles.tabItemFocused,
              ]}
              onPress={onPress}
            >
              <Text style={[
                styles.tabIcon,
                isFocused && styles.tabIconFocused,
              ]}>
                {options.tabBarIcon}
              </Text>
              <Text style={[
                styles.tabLabel,
                isFocused && styles.tabLabelFocused,
              ]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// Main tab navigator
const TabNavigator = ({ role }: { role: string }) => {
  const tabs = getRoleBasedTabs(role);

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      {tabs.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            title: tab.title,
            tabBarIcon: tab.icon,
            tabBarLabel: tab.title,
          }}
          initialParams={{ role }}
        />
      ))}
    </Tab.Navigator>
  );
};

// Stack navigator for each tab
const StackNavigator = ({ role }: { role: string }) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: CorporateTheme.colors.primary[500],
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="Main"
        component={() => <TabNavigator role={role} />}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

// Main app navigator with authentication
export const AppNavigator = () => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Ayaz Logistics'e Hoş Geldiniz</Text>
        <Text style={styles.loadingSubtext}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user && token ? (
        <Stack.Screen name="Main" component={RoleBasedNavigator} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CorporateTheme.colors.primary[50],
  },
  loadingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: CorporateTheme.colors.primary[500],
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 16,
    color: CorporateTheme.colors.gray[600],
  },
  tabBar: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: CorporateTheme.colors.gray[200],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tabItemFocused: {
    backgroundColor: CorporateTheme.colors.primary[50],
    borderRadius: 8,
    marginHorizontal: 4,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabIconFocused: {
    color: CorporateTheme.colors.primary[500],
  },
  tabLabel: {
    fontSize: 12,
    color: CorporateTheme.colors.gray[600],
    textAlign: 'center',
  },
  tabLabelFocused: {
    color: CorporateTheme.colors.primary[500],
    fontWeight: '500',
  },
});