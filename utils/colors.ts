// Light Mode Colors
export const lightColors = {
  // Primary brand colors - Energy and motivation focused
  primary: '#E63946',        // Energetic red - main brand color
  primaryLight: '#FF6B6B',   // Lighter red for hover states
  primaryDark: '#C62828',    // Darker red for pressed states
  
  // Secondary colors - Strength and progress
  secondary: '#457B9D',      // Steel blue - represents strength
  secondaryLight: '#6BB6FF', // Light blue for accents
  secondaryDark: '#1E3A5F',  // Dark blue for contrast
  
  // Accent colors - Success and achievement
  accent: '#2D9CDB',         // Bright blue - for actions and links
  accentLight: '#64B5F6',    // Light blue for backgrounds
  accentDark: '#1976D2',     // Dark blue for text
  
  // Success colors - Achievement and completion
  success: '#06D6A0',        // Mint green - workout completion
  successLight: '#4ECDC4',   // Light teal for success backgrounds
  successDark: '#00A085',    // Dark green for success text
  
  // Warning colors - Attention and caution
  warning: '#FFB627',        // Orange - rest time, warnings
  warningLight: '#FFD54F',   // Light orange for backgrounds
  warningDark: '#F57C00',    // Dark orange for text
  
  // Error colors - Mistakes and failures
  error: '#EF4444',          // Red - form errors, failed sets
  errorLight: '#FCA5A5',     // Light red for error backgrounds
  errorDark: '#DC2626',      // Dark red for error text
  
  // Neutral colors - Background and text
  background: '#FFFFFF',      // Pure white main background
  surface: '#F8FAFC',        // Light gray surface color
  surfaceVariant: '#F1F5F9',  // Slightly darker surface
  
  // Text colors
  text: {
    primary: '#1E293B',      // Dark slate for primary text
    secondary: '#64748B',    // Medium slate for secondary text
    tertiary: '#94A3B8',     // Light slate for tertiary text
    onPrimary: '#FFFFFF',    // White text on primary colors
    onSurface: '#334155',    // Dark text on surface colors
  },
  
  // Border and divider colors
  border: '#E2E8F0',         // Light border color
  divider: '#CBD5E1',        // Divider color
  
  // Fitness-specific colors
  cardio: '#FF6B35',         // Orange for cardio exercises
  strength: '#4ECDC4',       // Teal for strength training
  flexibility: '#A8E6CF',    // Light green for flexibility
  endurance: '#6C5CE7',      // Purple for endurance training
  
  // Muscle group colors
  chest: '#FF6B6B',          // Red for chest exercises
  back: '#4ECDC4',           // Teal for back exercises
  shoulders: '#A8E6CF',      // Light green for shoulders
  arms: '#FFD93D',           // Yellow for arms
  legs: '#6C5CE7',           // Purple for legs
  core: '#FF8A65',           // Orange for core
};

// Dark Mode Colors
export const darkColors = {
  // Primary colors - Maintained brand identity
  primary: '#FF6B6B',        // Softer red for dark mode
  primaryLight: '#FF8A80',   // Lighter red
  primaryDark: '#E53935',    // Darker red
  
  // Secondary colors - Cool and professional
  secondary: '#64B5F6',      // Light blue for dark mode
  secondaryLight: '#90CAF9', // Lighter blue
  secondaryDark: '#42A5F5',  // Darker blue
  
  // Accent colors - Bright and energetic
  accent: '#4FC3F7',         // Cyan for dark mode actions
  accentLight: '#81D4FA',    // Light cyan
  accentDark: '#29B6F6',     // Dark cyan
  
  // Success colors - Vibrant but not harsh
  success: '#4ECDC4',        // Teal for dark mode success
  successLight: '#80CBC4',   // Light teal
  successDark: '#26A69A',    // Dark teal
  
  // Warning colors - Warm but not aggressive
  warning: '#FFB74D',        // Orange for dark mode warnings
  warningLight: '#FFCC02',   // Light orange
  warningDark: '#FF9800',    // Dark orange
  
  // Error colors - Visible but not harsh
  error: '#EF5350',          // Red for dark mode errors
  errorLight: '#E57373',     // Light red
  errorDark: '#D32F2F',      // Dark red
  
  // Background colors - Dark theme
  background: '#0F1419',     // Very dark blue-gray
  surface: '#1A202C',        // Dark surface
  surfaceVariant: '#2D3748', // Lighter dark surface
  
  // Text colors for dark mode
  text: {
    primary: '#F7FAFC',      // Light gray for primary text
    secondary: '#CBD5E1',    // Medium gray for secondary text
    tertiary: '#94A3B8',     // Darker gray for tertiary text
    onPrimary: '#FFFFFF',    // White text on primary colors
    onSurface: '#E2E8F0',    // Light text on surface colors
  },
  
  // Border and divider colors
  border: '#374151',         // Gray border for dark mode
  divider: '#4B5563',        // Divider color
  
  // Fitness-specific colors (adjusted for dark mode)
  cardio: '#FF7043',         // Softer orange for cardio
  strength: '#4DB6AC',       // Softer teal for strength
  flexibility: '#81C784',    // Softer green for flexibility
  endurance: '#7986CB',      // Softer purple for endurance
  
  // Muscle group colors (dark mode optimized)
  chest: '#EF5350',          // Red for chest
  back: '#26C6DA',           // Cyan for back
  shoulders: '#66BB6A',      // Green for shoulders
  arms: '#FFCA28',           // Amber for arms
  legs: '#AB47BC',           // Purple for legs
  core: '#FF7043',           // Orange for core
};

// Color utility functions
export const colorUtils = {
  // Add transparency to any color
  withOpacity: (color: string, opacity: number) => 
    `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
  
  // Get contrast text color
  getContrastText: (backgroundColor: string, colors: typeof lightColors) => {
    // Simple contrast logic - can be enhanced
    const darkColors = ['#000000', '#1E293B', '#374151'];
    return darkColors.some(dark => backgroundColor.includes(dark.slice(1))) 
      ? colors.text.primary 
      : colors.text.onPrimary;
  },
};