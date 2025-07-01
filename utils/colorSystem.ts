import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from './colors';

export const useThemeColors = () => {
  const isDarkMode = useColorScheme() === 'dark';
  return isDarkMode ? darkColors : lightColors;
};

// Alternative: Manual theme switching
export const getThemeColors = (isDarkMode: boolean) => {
  return isDarkMode ? darkColors : lightColors;
};

export { colorUtils } from './colors';