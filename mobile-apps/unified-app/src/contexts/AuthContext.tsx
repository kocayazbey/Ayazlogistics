import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  permissions?: string[];
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  tenantId?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for stored token on mount
    checkStoredAuth();
  }, []);

  const checkStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const storedUser = await AsyncStorage.getItem('user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error checking stored auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      // Real API call to backend
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();

      // Ensure user has role information
      if (!data.user || !data.user.role) {
        throw new Error('User role information is missing');
      }

      setToken(data.accessToken);
      setUser(data.user);

      // Store in AsyncStorage
      await AsyncStorage.setItem('authToken', data.accessToken);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));

    } catch (err) {
      // Enhanced fallback to mock authentication for development with more roles
      const mockCredentials = {
        'admin@ayazlogistics.com': { password: 'admin123', role: 'admin' },
        'warehouse@ayazlogistics.com': { password: 'warehouse123', role: 'warehouse_operator' },
        'depo@ayazlogistics.com': { password: 'depo123', role: 'warehouse_operator' },
        'forklift@ayazlogistics.com': { password: 'forklift123', role: 'forklift_operator' },
        'customer@ayazlogistics.com': { password: 'customer123', role: 'customer' },
        'driver@ayazlogistics.com': { password: 'driver123', role: 'driver' },
        'accountant@ayazlogistics.com': { password: 'accountant123', role: 'accountant' },
        'sales@ayazlogistics.com': { password: 'sales123', role: 'sales_representative' },
        'hr@ayazlogistics.com': { password: 'hr123', role: 'hr_manager' },
        'supervisor@ayazlogistics.com': { password: 'supervisor123', role: 'supervisor' },
        'user@ayazlogistics.com': { password: 'user123', role: 'user' },
      };

      const credentials = mockCredentials[email as keyof typeof mockCredentials];

      if (credentials && credentials.password === password) {
        const mockUser = {
          id: Date.now().toString(),
          email: email,
          firstName: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
          lastName: 'User',
          role: credentials.role,
          isActive: true,
          lastLogin: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          permissions: getPermissionsForRole(credentials.role),
        };
        const mockToken = 'mock-jwt-token-' + Date.now();

        setToken(mockToken);
        setUser(mockUser);

        await AsyncStorage.setItem('authToken', mockToken);
        await AsyncStorage.setItem('user', JSON.stringify(mockUser));
      } else {
        setError('Geçersiz kullanıcı bilgileri');
        throw new Error('Invalid credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setLoading(true);
      setError(null);

      // Mock API call - replace with actual API
      const response = await fetch('https://api.ayazlogistics.com/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      const data = await response.json();
      
      setToken(data.accessToken);
      setUser(data.user);
      
      // Store in AsyncStorage
      await AsyncStorage.setItem('authToken', data.accessToken);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      
    } catch (err) {
      // Fallback to mock registration for development
      const mockUser = {
        id: Date.now().toString(),
        email: userData.email,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        role: userData.role || 'user',
        isActive: true,
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      const mockToken = 'mock-jwt-token-' + Date.now();
      
      setToken(mockToken);
      setUser(mockUser);
      
      await AsyncStorage.setItem('authToken', mockToken);
      await AsyncStorage.setItem('user', JSON.stringify(mockUser));
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    setError(null);
    
    // Clear AsyncStorage
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('user');
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    loading,
    error,
  };

  // Helper function to get permissions based on role
  const getPermissionsForRole = (role: string): string[] => {
    const rolePermissions: { [key: string]: string[] } = {
      admin: ['*', 'admin.read', 'admin.write', 'users.read', 'users.write', 'system.read', 'system.write'],
      warehouse_operator: ['inventory.read', 'inventory.write', 'orders.read', 'tasks.read', 'tasks.write'],
      forklift_operator: ['inventory.read', 'inventory.write', 'tasks.read', 'tasks.write'],
      customer: ['orders.read', 'tracking.read', 'profile.read', 'profile.write'],
      driver: ['routes.read', 'routes.write', 'deliveries.read', 'deliveries.write', 'vehicle.read'],
      accountant: ['invoices.read', 'invoices.write', 'payments.read', 'reports.read'],
      sales_representative: ['customers.read', 'customers.write', 'orders.read', 'orders.write'],
      hr_manager: ['employees.read', 'employees.write', 'reports.read', 'leave.read', 'leave.write'],
      supervisor: ['inventory.read', 'orders.read', 'employees.read', 'reports.read', 'tasks.read'],
      user: ['profile.read', 'profile.write', 'notifications.read'],
    };

    return rolePermissions[role] || ['profile.read'];
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};