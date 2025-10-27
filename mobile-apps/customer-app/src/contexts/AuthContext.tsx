import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../services/api.service';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  address: string;
  isVerified: boolean;
  joinDate: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profileData: Partial<User>) => Promise<void>;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone: string;
  company?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in on app start
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userData = await AsyncStorage.getItem('userProfile');

      if (token && userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Auth state check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await apiService.login(email, password);

      if (response.success && response.data) {
        const { token, user: userData } = response.data;

        // Save to AsyncStorage
        await AsyncStorage.setItem('authToken', token);
        await AsyncStorage.setItem('userProfile', JSON.stringify(userData));

        setUser(userData);
      } else {
        throw new Error(response.message || 'Giriş başarısız');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Giriş yapılırken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setIsLoading(true);
      const response = await apiService.register(userData);

      if (response.success && response.data) {
        const { token, user: newUser } = response.data;

        // Save to AsyncStorage
        await AsyncStorage.setItem('authToken', token);
        await AsyncStorage.setItem('userProfile', JSON.stringify(newUser));

        setUser(newUser);
      } else {
        throw new Error(response.message || 'Kayıt başarısız');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Kayıt olurken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);

      // Call logout API
      await apiService.logout();

      // Clear local storage
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userProfile');

      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Clear local storage anyway
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userProfile');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (profileData: Partial<User>) => {
    try {
      const response = await apiService.updateProfile(profileData);

      if (response.success && response.data) {
        const updatedUser = response.data;

        // Update local storage
        await AsyncStorage.setItem('userProfile', JSON.stringify(updatedUser));
        setUser(updatedUser);
      } else {
        throw new Error(response.message || 'Profil güncelleme başarısız');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Profil güncellenirken hata oluştu');
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
