import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDatabase } from './DatabaseContext';

interface User {
  id: number;
  name: string;
  email: string;
  profile_picture_uri?: string;
  bio?: string;
  weight?: number;
  height?: number;
  gender?: string;
  preferred_weight_unit: string;
  theme_preference: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { db, isReady } = useDatabase();

  useEffect(() => {
    if (isReady) {
      checkAuthState();
    }
  }, [isReady]);

  const checkAuthState = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (userId && db) {
        const userData = await db.getFirstAsync(
          'SELECT * FROM users WHERE id = ?',
          [parseInt(userId)]
        ) as User;
        
        if (userData) {
          setUser(userData);
        }
      }
    } catch (error) {
      console.error('Auth state check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!db) return { success: false, error: 'Database not ready' };
      
      const user = await db.getFirstAsync(
        'SELECT * FROM users WHERE email = ? AND password_hash = ?',
        [email, password] // In production, use proper password hashing
      ) as User;

      if (user) {
        setUser(user);
        await AsyncStorage.setItem('userId', user.id.toString());
        return { success: true };
      } else {
        return { success: false, error: 'Invalid email or password' };
      }
    } catch (error) {
      return { success: false, error: 'Login failed' };
    }
  };

  const register = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!db) return { success: false, error: 'Database not ready' };
      
      // Check if user already exists
      const existingUser = await db.getFirstAsync(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      if (existingUser) {
        return { success: false, error: 'User already exists' };
      }

      // Create new user
      const result = await db.runAsync(
        'INSERT INTO users (name, email, password_hash, preferred_weight_unit, theme_preference) VALUES (?, ?, ?, ?, ?)',
        [name, email, password, 'kg', 'light'] // In production, use proper password hashing
      );

      const newUser = await db.getFirstAsync(
        'SELECT * FROM users WHERE id = ?',
        [result.lastInsertRowId]
      ) as User;

      if (newUser) {
        setUser(newUser);
        await AsyncStorage.setItem('userId', newUser.id.toString());
        return { success: true };
      } else {
        return { success: false, error: 'Failed to create user' };
      }
    } catch (error) {
      return { success: false, error: 'Registration failed' };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userId');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    try {
      if (!db || !user) return;
      
      const updateFields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      
      await db.runAsync(
        `UPDATE users SET ${updateFields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [...values, user.id]
      );

      const updatedUser = await db.getFirstAsync(
        'SELECT * FROM users WHERE id = ?',
        [user.id]
      ) as User;

      if (updatedUser) {
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Profile update error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      logout,
      updateProfile,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};