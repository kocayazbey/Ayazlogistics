import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

// Import screens
import DashboardScreen from '../screens/DashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Driver specific screens
import DriverDashboardScreen from '../screens/driver/DriverDashboardScreen';
import RouteScreen from '../screens/driver/RouteScreen';
import DeliveryScreen from '../screens/driver/DeliveryScreen';
import VehicleScreen from '../screens/driver/VehicleScreen';

// Customer specific screens
import CustomerDashboardScreen from '../screens/customer/CustomerDashboardScreen';
import OrdersScreen from '../screens/customer/OrdersScreen';
import TrackingScreen from '../screens/customer/TrackingScreen';
import SupportScreen from '../screens/customer/SupportScreen';

// Warehouse specific screens
import WarehouseHomeScreen from '../screens/warehouse/WarehouseHomeScreen';
import GoodsReceiptScreen from '../screens/warehouse/GoodsReceiptScreen';
import ShipmentScreen from '../screens/warehouse/ShipmentScreen';
import InventoryScreen from '../screens/warehouse/InventoryScreen';

// Forklift specific screens
import ForkliftHomeScreen from '../screens/forklift/ForkliftHomeScreen';
import IncomingOrdersScreen from '../screens/forklift/IncomingOrdersScreen';
import PalletAddressingScreen from '../screens/forklift/PalletAddressingScreen';

// Admin specific screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import UsersScreen from '../screens/admin/UsersScreen';
import AnalyticsScreen from '../screens/admin/AnalyticsScreen';
import SystemScreen from '../screens/admin/SystemScreen';

// Accounting screens
import AccountingHomeScreen from '../screens/accounting/AccountingHomeScreen';
import InvoicesScreen from '../screens/accounting/InvoicesScreen';
import PaymentsScreen from '../screens/accounting/PaymentsScreen';

// Sales screens
import SalesHomeScreen from '../screens/sales/SalesHomeScreen';
import CustomersScreen from '../screens/sales/CustomersScreen';
import OpportunitiesScreen from '../screens/sales/OpportunitiesScreen';

// HR screens
import HRHomeScreen from '../screens/hr/HRHomeScreen';
import EmployeesScreen from '../screens/hr/EmployeesScreen';
import LeaveManagementScreen from '../screens/hr/LeaveManagementScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const RoleBasedNavigator: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
      return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  const getTabBarIcon = (routeName: string, focused: boolean) => {
    const icons: { [key: string]: string } = {
      Dashboard: focused ? '🏠' : '🏠',
      Profile: focused ? '👤' : '👤',
      Settings: focused ? '⚙️' : '⚙️',
      Route: focused ? '🗺️' : '🗺️',
      Delivery: focused ? '📦' : '📦',
      Vehicle: focused ? '🚛' : '🚛',
      Orders: focused ? '📋' : '📋',
      Tracking: focused ? '📍' : '📍',
      Support: focused ? '🆘' : '🆘',
      Users: focused ? '👥' : '👥',
      Analytics: focused ? '📊' : '📊',
      System: focused ? '🔧' : '🔧',
      // Warehouse icons
      Home: focused ? '🏭' : '🏭',
      'Goods Receipt': focused ? '📥' : '📥',
      Shipment: focused ? '📤' : '📤',
      Inventory: focused ? '📦' : '📦',
      // Forklift icons
      'Incoming Orders': focused ? '📋' : '📋',
      'Pallet Addressing': focused ? '📍' : '📍',
      // Accounting icons
      Invoices: focused ? '🧾' : '🧾',
      Payments: focused ? '💳' : '💳',
      // Sales icons
      Customers: focused ? '👥' : '👥',
      Opportunities: focused ? '🎯' : '🎯',
      // HR icons
      Employees: focused ? '👥' : '👥',
      'Leave Management': focused ? '📅' : '📅',
    };
    return icons[routeName] || '❓';
  };

  const getTabBarLabel = (routeName: string) => {
    const labels: { [key: string]: string } = {
      Dashboard: 'Ana Sayfa',
      Profile: 'Profil',
      Settings: 'Ayarlar',
      Route: 'Rota',
      Delivery: 'Teslimat',
      Vehicle: 'Araç',
      Orders: 'Siparişler',
      Tracking: 'Takip',
      Support: 'Destek',
      Users: 'Kullanıcılar',
      Analytics: 'Analitik',
      System: 'Sistem',
      // Warehouse labels
      Home: 'Ana Sayfa',
      'Goods Receipt': 'Mal Kabul',
      Shipment: 'Sevkiyat',
      Inventory: 'Envanter',
      // Forklift labels
      'Incoming Orders': 'Gelen Siparişler',
      'Pallet Addressing': 'Palet Adresleme',
      // Accounting labels
      Invoices: 'Faturalar',
      Payments: 'Ödemeler',
      // Sales labels
      Customers: 'Müşteriler',
      Opportunities: 'Fırsatlar',
      // HR labels
      Employees: 'Çalışanlar',
      'Leave Management': 'İzin Yönetimi',
    };
    return labels[routeName] || routeName;
  };

  const renderDriverTabs = () => (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <Text style={styles.tabIcon}>{getTabBarIcon(route.name, focused)}</Text>
        ),
        tabBarLabel: getTabBarLabel(route.name),
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
      })}
    >
      <Tab.Screen name="Dashboard" component={DriverDashboardScreen} />
      <Tab.Screen name="Route" component={RouteScreen} />
      <Tab.Screen name="Delivery" component={DeliveryScreen} />
      <Tab.Screen name="Vehicle" component={VehicleScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
      );

  const renderCustomerTabs = () => (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <Text style={styles.tabIcon}>{getTabBarIcon(route.name, focused)}</Text>
        ),
        tabBarLabel: getTabBarLabel(route.name),
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
      })}
    >
      <Tab.Screen name="Dashboard" component={CustomerDashboardScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Tracking" component={TrackingScreen} />
      <Tab.Screen name="Support" component={SupportScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
      );

  const renderAdminTabs = () => (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <Text style={styles.tabIcon}>{getTabBarIcon(route.name, focused)}</Text>
        ),
        tabBarLabel: getTabBarLabel(route.name),
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
      })}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
      <Tab.Screen name="Users" component={UsersScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="System" component={SystemScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );

  const renderWarehouseTabs = () => (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <Text style={styles.tabIcon}>{getTabBarIcon(route.name, focused)}</Text>
        ),
        tabBarLabel: getTabBarLabel(route.name),
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: '#6B7280',
      })}
    >
      <Tab.Screen name="Home" component={WarehouseHomeScreen} />
      <Tab.Screen name="Inventory" component={InventoryScreen} />
      <Tab.Screen name="Goods Receipt" component={GoodsReceiptScreen} />
      <Tab.Screen name="Shipment" component={ShipmentScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );

  const renderForkliftTabs = () => (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <Text style={styles.tabIcon}>{getTabBarIcon(route.name, focused)}</Text>
        ),
        tabBarLabel: getTabBarLabel(route.name),
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarActiveTintColor: '#DC2626',
        tabBarInactiveTintColor: '#6B7280',
      })}
    >
      <Tab.Screen name="Dashboard" component={ForkliftHomeScreen} />
      <Tab.Screen name="Incoming Orders" component={IncomingOrdersScreen} />
      <Tab.Screen name="Pallet Addressing" component={PalletAddressingScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );

  const renderCustomerTabs = () => (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <Text style={styles.tabIcon}>{getTabBarIcon(route.name, focused)}</Text>
        ),
        tabBarLabel: getTabBarLabel(route.name),
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarActiveTintColor: '#7C3AED',
        tabBarInactiveTintColor: '#6B7280',
      })}
    >
      <Tab.Screen name="Dashboard" component={CustomerDashboardScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Tracking" component={TrackingScreen} />
      <Tab.Screen name="Support" component={SupportScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );

  const renderAccountingTabs = () => (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <Text style={styles.tabIcon}>{getTabBarIcon(route.name, focused)}</Text>
        ),
        tabBarLabel: getTabBarLabel(route.name),
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: '#6B7280',
      })}
    >
      <Tab.Screen name="Dashboard" component={AccountingHomeScreen} />
      <Tab.Screen name="Invoices" component={InvoicesScreen} />
      <Tab.Screen name="Payments" component={PaymentsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );

  const renderSalesTabs = () => (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <Text style={styles.tabIcon}>{getTabBarIcon(route.name, focused)}</Text>
        ),
        tabBarLabel: getTabBarLabel(route.name),
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarActiveTintColor: '#DC2626',
        tabBarInactiveTintColor: '#6B7280',
      })}
    >
      <Tab.Screen name="Dashboard" component={SalesHomeScreen} />
      <Tab.Screen name="Customers" component={CustomersScreen} />
      <Tab.Screen name="Opportunities" component={OpportunitiesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );

  const renderHRTabs = () => (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <Text style={styles.tabIcon}>{getTabBarIcon(route.name, focused)}</Text>
        ),
        tabBarLabel: getTabBarLabel(route.name),
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarActiveTintColor: '#7C3AED',
        tabBarInactiveTintColor: '#6B7280',
      })}
    >
      <Tab.Screen name="Dashboard" component={HRHomeScreen} />
      <Tab.Screen name="Employees" component={EmployeesScreen} />
      <Tab.Screen name="Leave Management" component={LeaveManagementScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );

  const renderDefaultTabs = () => (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <Text style={styles.tabIcon}>{getTabBarIcon(route.name, focused)}</Text>
        ),
        tabBarLabel: getTabBarLabel(route.name),
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
      );

  const getNavigator = () => {
    switch (user.role) {
      case 'driver':
        return renderDriverTabs();
      case 'customer':
        return renderCustomerTabs();
      case 'admin':
        return renderAdminTabs();
      case 'warehouse_operator':
      case 'depo':
        return renderWarehouseTabs();
      case 'forklift_operator':
        return renderForkliftTabs();
      case 'accountant':
        return renderAccountingTabs();
      case 'sales_representative':
        return renderSalesTabs();
      case 'hr_manager':
        return renderHRTabs();
      case 'supervisor':
        return renderAdminTabs(); // Supervisors use admin interface
      default:
        return renderDefaultTabs();
    }
  };

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={getNavigator} />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  text: {
    fontSize: 18,
    color: '#6B7280',
  },
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    paddingBottom: 8,
    height: 60,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  tabIcon: {
    fontSize: 20,
  },
});

export default RoleBasedNavigator;