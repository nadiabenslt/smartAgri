import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

type User = {
  id: number;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (data: any) => Promise<any>;
  register: (data: any) => Promise<any>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user on startup if token exists
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          // If you have a /user endpoint to fetch user details, call it here.
          // For now, if we have a token, we could fetch user info:
          const response = await api.get('/user');
          setUser(response.data);
        }
      } catch (e) {
        console.error('Failed to load user', e);
        // Clean up invalid token
        await AsyncStorage.removeItem('auth_token');
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (data: any) => {
    try {
      const response = await api.post('/login', data);
      const { user, access_token } = response.data;
      
      await AsyncStorage.setItem('auth_token', access_token);
      setUser(user);
      
      return response.data;
    } catch (e) {
      throw e;
    }
  };

  const register = async (data: any) => {
    try {
      const response = await api.post('/register', data);
      const { user, access_token } = response.data;
      
      await AsyncStorage.setItem('auth_token', access_token);
      setUser(user);
      
      return response.data;
    } catch (e) {
      throw e;
    }
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch (e) {
      console.error('Logout failed on backend', e);
    } finally {
      await AsyncStorage.removeItem('auth_token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
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
