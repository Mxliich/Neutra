import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from './colors';
import { useAuth } from '@/context/AuthContext';

export const useThemeColors = () => {
  const { user } = useAuth();
  const systemColorScheme = useColorScheme();
  
  // Use user preference if available, otherwise fall back to system preference
  const isDarkMode = user?.theme_preference === 'dark' || 
    (user?.theme_preference === 'system' && systemColorScheme === 'dark') ||
    (!user?.theme_preference && systemColorScheme === 'dark');
  
  return isDarkMode ? darkColors : lightColors;
};

// Alternative: Manual theme switching
export const getThemeColors = (isDarkMode: boolean) => {
  return isDarkMode ? darkColors : lightColors;
};

export { colorUtils } from './colors';