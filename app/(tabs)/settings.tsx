import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import { 
  User, 
  Palette, 
  Scale, 
  Download, 
  Upload, 
  Trash2, 
  LogOut,
  ChevronRight,
  Info,
  Mail,
  Shield,
  Moon,
  Sun,
  Monitor
} from 'lucide-react-native';
import { useThemeColors } from '@/utils/colorSystem';

export default function SettingsScreen() {
  const { user, logout, updateProfile } = useAuth();
  const colors = useThemeColors();
  const [isKgSelected, setIsKgSelected] = useState(user?.preferred_weight_unit === 'kg');

  const handleWeightUnitChange = async (value: boolean) => {
    setIsKgSelected(value);
    await updateProfile({ preferred_weight_unit: value ? 'kg' : 'lb' });
  };

  const handleThemeChange = async (theme: 'light' | 'dark' | 'system') => {
    await updateProfile({ theme_preference: theme });
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/auth/login');
          }
        }
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your workout data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete All', 
          style: 'destructive',
          onPress: () => {
            // TODO: Implement data clearing
            Alert.alert('Feature Coming Soon', 'Data clearing will be available in a future update');
          }
        }
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert('Feature Coming Soon', 'Data export will be available in a future update');
  };

  const handleImportData = () => {
    Alert.alert('Feature Coming Soon', 'Data import will be available in a future update');
  };

  const showThemeSelector = () => {
    Alert.alert(
      'Choose Theme',
      'Select your preferred theme',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Light', 
          onPress: () => handleThemeChange('light')
        },
        { 
          text: 'Dark', 
          onPress: () => handleThemeChange('dark')
        },
        { 
          text: 'System', 
          onPress: () => handleThemeChange('system')
        }
      ]
    );
  };

  const getThemeDisplayName = () => {
    switch (user?.theme_preference) {
      case 'dark': return 'Dark';
      case 'light': return 'Light';
      case 'system': return 'System';
      default: return 'Light';
    }
  };

  const getThemeIcon = () => {
    switch (user?.theme_preference) {
      case 'dark': return Moon;
      case 'light': return Sun;
      case 'system': return Monitor;
      default: return Sun;
    }
  };

  const settingsSections = [
    {
      title: 'Appearance',
      items: [
        {
          icon: getThemeIcon(),
          title: 'Theme',
          subtitle: getThemeDisplayName(),
          onPress: showThemeSelector,
          hasChevron: true,
        },
      ],
    },
    {
      title: 'Units & Measurements',
      items: [
        {
          icon: Scale,
          title: 'Weight Unit',
          subtitle: `${user?.preferred_weight_unit?.toUpperCase() || 'KG'}`,
          hasSwitch: true,
          switchValue: isKgSelected,
          onSwitchChange: handleWeightUnitChange,
        },
      ],
    },
    {
      title: 'Data Management',
      items: [
        {
          icon: Download,
          title: 'Export Data',
          subtitle: 'Save your workout history',
          onPress: handleExportData,
          hasChevron: true,
        },
        {
          icon: Upload,
          title: 'Import Data',
          subtitle: 'Import from other apps',
          onPress: handleImportData,
          hasChevron: true,
        },
        {
          icon: Trash2,
          title: 'Clear All Data',
          subtitle: 'Permanently delete all data',
          onPress: handleClearData,
          hasChevron: true,
          isDestructive: true,
        },
      ],
    },
    {
      title: 'About',
      items: [
        {
          icon: Info,
          title: 'App Version',
          subtitle: '1.0.0',
          hasChevron: false,
        },
        {
          icon: Shield,
          title: 'Privacy Policy',
          subtitle: 'How we protect your data',
          onPress: () => Alert.alert('Coming Soon', 'Privacy policy will be available soon'),
          hasChevron: true,
        },
        {
          icon: Mail,
          title: 'Contact Support',
          subtitle: 'Get help with the app',
          onPress: () => Alert.alert('Coming Soon', 'Support contact will be available soon'),
          hasChevron: true,
        },
      ],
    },
  ];

  const renderSettingItem = (item: any, index: number) => (
    <TouchableOpacity
      key={index}
      style={[
        styles.settingItem,
        item.isDestructive && styles.destructiveItem,
        !item.onPress && !item.hasSwitch && styles.disabledItem,
      ]}
      onPress={item.onPress}
      disabled={!item.onPress && !item.hasSwitch}
    >
      <View style={styles.settingLeft}>
        <View style={[
          styles.settingIcon,
          item.isDestructive && styles.destructiveIcon,
        ]}>
          <item.icon 
            size={20} 
            color={item.isDestructive ? colors.error : colors.primary} 
          />
        </View>
        <View style={styles.settingText}>
          <Text style={[
            styles.settingTitle,
            item.isDestructive && styles.destructiveText,
          ]}>
            {item.title}
          </Text>
          {item.subtitle && (
            <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
          )}
        </View>
      </View>
      
      <View style={styles.settingRight}>
        {item.hasSwitch && (
          <Switch
            value={item.switchValue}
            onValueChange={item.onSwitchChange}
            trackColor={{ false: colors.inputBackground, true: colors.primary }}
            thumbColor={item.switchValue ? colors.text.onPrimary : colors.text.secondary}
          />
        )}
        {item.hasChevron && (
          <ChevronRight size={20} color={colors.text.secondary} />
        )}
      </View>
    </TouchableOpacity>
  );

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Customize your app experience</Text>
        </View>

        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.userInfo}>
            <View style={styles.userAvatar}>
              <Text style={styles.userInitials}>
                {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user?.name}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => router.push('/profile')}
          >
            <User size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionItems}>
              {section.items.map((item, itemIndex) => renderSettingItem(item, itemIndex))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={20} color={colors.error} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Made with ❤️ for your fitness journey
          </Text>
          <Text style={styles.footerVersion}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: colors.text.secondary,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 32,
    shadowColor: colors.shadow.color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: colors.shadow.opacity,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInitials: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: colors.text.onPrimary,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: colors.text.primary,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.text.secondary,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: colors.text.primary,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  sectionItems: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow.color,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: colors.shadow.opacity,
    shadowRadius: 4,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  disabledItem: {
    opacity: 0.6,
  },
  destructiveItem: {
    borderBottomColor: 'rgba(255, 68, 68, 0.1)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  destructiveIcon: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: colors.text.primary,
    marginBottom: 2,
  },
  destructiveText: {
    color: colors.error,
  },
  settingSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.text.secondary,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutContainer: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.2)',
  },
  logoutText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: colors.error,
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  footerVersion: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: colors.text.secondary,
  },
});