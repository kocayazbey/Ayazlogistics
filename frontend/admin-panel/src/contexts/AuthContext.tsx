'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../lib/api-comprehensive';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
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
    // Check for stored user info and token from cookies on mount
    const getCookieValue = (name: string): string | null => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) {
        return parts.pop()?.split(';').shift() || null;
      }
      return null;
    };

    const userInfoCookie = getCookieValue('user_info');
    const tokenCookie = getCookieValue('access_token');

    if (tokenCookie && userInfoCookie) {
      try {
        const userInfo = JSON.parse(decodeURIComponent(userInfoCookie));
        setToken(tokenCookie);
        setUser(userInfo);
      } catch (error) {
        console.error('Error parsing user info from cookie:', error);
        // Clear invalid cookies
        document.cookie = 'user_info=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      }
    }

    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      // Login API call - cookies will be set by backend
      await authApi.login(email, password);

      // After successful login, get user info from cookie
      const getCookieValue = (name: string): string | null => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
          return parts.pop()?.split(';').shift() || null;
        }
        return null;
      };

      const userInfoCookie = getCookieValue('user_info');
      const tokenCookie = getCookieValue('access_token');

      if (tokenCookie && userInfoCookie) {
        const userInfo = JSON.parse(decodeURIComponent(userInfoCookie));
        setToken(tokenCookie);
        setUser(userInfo);
      } else {
        throw new Error('Authentication failed - no cookies received');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setLoading(true);
      setError(null);

      // Register API call - cookies will be set by backend
      await authApi.register(userData);

      // After successful registration, get user info from cookie
      const getCookieValue = (name: string): string | null => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
          return parts.pop()?.split(';').shift() || null;
        }
        return null;
      };

      const userInfoCookie = getCookieValue('user_info');
      const tokenCookie = getCookieValue('access_token');

      if (tokenCookie && userInfoCookie) {
        const userInfo = JSON.parse(decodeURIComponent(userInfoCookie));
        setToken(tokenCookie);
        setUser(userInfo);
      } else {
        throw new Error('Registration failed - no cookies received');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setError(null);

    // Clear cookies
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'user_info=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

    // Also call logout API to server-side cleanup
    authApi.logout().catch(err => console.error('Logout API call failed:', err));
  };

  const isAuthenticated = !!user && !!token;

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    // Super admin tüm izinlere sahip
    if (user.role === 'super_admin' || user.permissions.includes('all')) return true;
    return user.permissions.includes(permission);
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    return user.role === role;
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    loading,
    error,
    isAuthenticated,
    hasPermission,
    hasRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};