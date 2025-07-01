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
  error: string | null;
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
  const [error, setError] = useState<string | null>(null);
  const { db, isReady, error: dbError } = useDatabase();

  useEffect(() => {
    if (isReady && !dbError) {
      checkAuthState();
    } else if (dbError) {
      setError(dbError);
      setIsLoading(false);
    }
  }, [isReady, dbError]);

  const checkAuthState = async () => {
    try {
      setError(null);
      const userId = await AsyncStorage.getItem('userId');
      if (userId && db) {
        const userData = await db.getFirstAsync(
          'SELECT * FROM users WHERE id = ?',
          [parseInt(userId)]
        ) as User;
        
        if (userData) {
          setUser(userData);
        } else {
          // Clear invalid user ID
          await AsyncStorage.removeItem('userId');
        }
      }
    } catch (error) {
      console.error('Auth state check error:', error);
      setError('Failed to check authentication state');
      await AsyncStorage.removeItem('userId');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);
      if (!db) return { success: false, error: 'Database not ready' };
      
      const user = await db.getFirstAsync(
        'SELECT * FROM users WHERE email = ? AND password_hash = ?',
        [email.toLowerCase().trim(), password] // In production, use proper password hashing
      ) as User;

      if (user) {
        setUser(user);
        await AsyncStorage.setItem('userId', user.id.toString());
        return { success: true };
      } else {
        return { success: false, error: 'Invalid email or password' };
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const register = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);
      if (!db) return { success: false, error: 'Database not ready' };
      
      const trimmedEmail = email.toLowerCase().trim();
      const trimmedName = name.trim();
      
      // Validate inputs
      if (!trimmedName || !trimmedEmail || !password) {
        return { success: false, error: 'All fields are required' };
      }
      
      if (password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters long' };
      }
      
      // Check if user already exists
      const existingUser = await db.getFirstAsync(
        'SELECT * FROM users WHERE email = ?',
        [trimmedEmail]
      );

      if (existingUser) {
        return { success: false, error: 'User already exists with this email' };
      }

      // Create new user
      const result = await db.runAsync(
        'INSERT INTO users (name, email, password_hash, preferred_weight_unit, theme_preference) VALUES (?, ?, ?, ?, ?)',
        [trimmedName, trimmedEmail, password, 'kg', 'light'] // In production, use proper password hashing
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
        return { success: false, error: 'Failed to create user account' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userId');
      setUser(null);
      setError(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    try {
      setError(null);
      if (!db || !user) return;
      
      // Build dynamic SQL query
      const updateFields = Object.keys(updates);
      const setClause = updateFields.map(field => `${field} = ?`).join(', ');
      const values = updateFields.map(field => updates[field as keyof User]);
      
      // Use runAsync instead of prepareAsync to avoid the null pointer exception
      await db.runAsync(
        `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [...values, user.id]
      );

      // Fetch updated user data
      const updatedUser = await db.getFirstAsync(
        'SELECT * FROM users WHERE id = ?',
        [user.id]
      ) as User;

      if (updatedUser) {
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Profile update error:', error);
      setError('Failed to update profile');
      throw error; // Re-throw to handle in UI
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      logout,
      updateProfile,
      isLoading,
      error
    }}>
      {children}
    </AuthContext.Provider>
  );
};