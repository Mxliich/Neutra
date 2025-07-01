import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { useDatabase } from '@/context/DatabaseContext';
import { router } from 'expo-router';
import { Dumbbell, List, Activity, Heart, ChartBar as BarChart3, Calendar, Timer, Target } from 'lucide-react-native';
import { useThemeColors } from '@/utils/colorSystem';
import CustomPopup from '@/components/CustomPopup';
import { usePopup } from '@/hooks/usePopup';
import { getRandomMotivationalMessage, getStreakMessage } from '@/utils/fitnessMessages';

const { width } = Dimensions.get('window');
const bubbleWidth = (width - 48) / 2;

export default function HomeScreen() {
  const { user } = useAuth();
  const { db } = useDatabase();
  const colors = useThemeColors();
  const {
    popupConfig,
    hidePopup,
    showSuccess,
    showMotivation,
    showInfo,
  } = usePopup();
  
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    thisWeekWorkouts: 0,
    currentStreak: 0,
  });

  useEffect(() => {
    loadStats();
  }, [db]);

  // Show motivational popup on app open (occasionally)
  useEffect(() => {
    if (stats.totalWorkouts > 0 && Math.random() < 0.3) {
      const motivationMessage = getRandomMotivationalMessage('motivation');
      setTimeout(() => {
        showMotivation('Keep Going! 🔥', motivationMessage);
      }, 1500);
    }
  }, [stats.totalWorkouts]);

  const loadStats = async () => {
    if (!db || !user) return;

    try {
      // Get total workouts
      const totalResult = await db.getFirstAsync(
        'SELECT COUNT(*) as count FROM workouts WHERE user_id = ?',
        [user.id]
      ) as { count: number };

      // Get this week's workouts
      const weekResult = await db.getFirstAsync(
        'SELECT COUNT(*) as count FROM workouts WHERE user_id = ? AND start_time >= date("now", "-7 days")',
        [user.id]
      ) as { count: number };

      setStats({
        totalWorkouts: totalResult.count,
        thisWeekWorkouts: weekResult.count,
        currentStreak: weekResult.count, // Simplified streak calculation
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getFormattedDate = () => {
    const date = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  const handleStreakTap = () => {
    if (stats.currentStreak > 0) {
      const streakMessage = getStreakMessage(stats.currentStreak);
      showSuccess('Streak Master! 🔥', streakMessage);
    } else {
      showInfo('Start Your Streak! 💪', 'Complete a workout today to start building your streak!');
    }
  };

  const quickActions = [
    {
      title: 'Start Workout',
      subtitle: 'Begin new session',
      icon: Dumbbell,
      colors: [colors.primary, colors.primaryLight],
      onPress: () => router.push('/workout'),
    },
    {
      title: 'View Progress',
      subtitle: 'Track your stats',
      icon: BarChart3,
      colors: [colors.accent, colors.accentLight],
      onPress: () => router.push('/profile'),
    },
    {
      title: 'Relax & Recover',
      subtitle: 'Rest day vibes',
      icon: Heart,
      colors: [colors.secondary, colors.secondaryLight],
      onPress: () => router.push('/relax'),
    },
    {
      title: 'Exercise Library',
      subtitle: 'Browse exercises',
      icon: List,
      colors: [colors.warning, colors.warningLight],
      onPress: () => router.push('/workout'),
    },
  ];

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.greeting}>
            <Text style={styles.greetingText}>{getGreeting()}, {user?.name?.split(' ')[0]}! 👋</Text>
            <Text style={styles.dateText}>{getFormattedDate()}</Text>
          </View>
        </View>

        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <Image 
            source={{ uri: 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=800' }}
            style={styles.heroImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.heroOverlay}
          >
            <Text style={styles.heroText}>Ready to crush your goals?</Text>
            <Text style={styles.heroSubtext}>Every rep counts towards your success</Text>
          </LinearGradient>
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{stats.totalWorkouts}</Text>
            <Text style={styles.statLabel}>Total Workouts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.secondary }]}>{stats.thisWeekWorkouts}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
          <TouchableOpacity style={styles.statItem} onPress={handleStreakTap}>
            <Text style={[styles.statNumber, { color: colors.accent }]}>{stats.currentStreak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </TouchableOpacity>
        </View>

        {/* What are we doing today? */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What are we doing today?</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.actionBubble}
                onPress={action.onPress}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={action.colors}
                  style={styles.bubbleGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <action.icon size={32} color="#FFFFFF" />
                  <Text style={styles.bubbleTitle}>{action.title}</Text>
                  <Text style={styles.bubbleSubtitle}>{action.subtitle}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Motivational Quote */}
        <View style={[styles.motivationCard, { borderLeftColor: colors.primary }]}>
          <Text style={styles.motivationText}>
            "The only bad workout is the one that didn't happen."
          </Text>
          <Text style={styles.motivationAuthor}>- Unknown</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={[styles.quickActionsList, { borderColor: colors.border }]}>
            <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/workout')}>
              <View style={[styles.quickActionIcon, { backgroundColor: colors.primary + '20' }]}>
                <Timer size={20} color={colors.primary} />
              </View>
              <Text style={styles.quickActionText}>Start Quick Workout</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/profile')}>
              <View style={[styles.quickActionIcon, { backgroundColor: colors.secondary + '20' }]}>
                <Target size={20} color={colors.secondary} />
              </View>
              <Text style={styles.quickActionText}>View Goals</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/relax')}>
              <View style={[styles.quickActionIcon, { backgroundColor: colors.accent + '20' }]}>
                <Activity size={20} color={colors.accent} />
              </View>
              <Text style={styles.quickActionText}>Recovery Timer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <CustomPopup
        {...popupConfig}
        onClose={hidePopup}
      />
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
    paddingTop: 16,
    paddingBottom: 24,
  },
  greeting: {
    marginBottom: 16,
  },
  greetingText: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.text.secondary,
  },
  heroContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    height: 200,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  heroText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  heroSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    paddingVertical: 20,
    marginBottom: 32,
    shadowColor: colors.shadow.color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: colors.shadow.opacity,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: colors.text.secondary,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: colors.text.primary,
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionBubble: {
    width: bubbleWidth,
    height: 140,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: colors.shadow.color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: colors.shadow.opacity,
    shadowRadius: 8,
    elevation: 3,
  },
  bubbleGradient: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  bubbleSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
    textAlign: 'center',
  },
  motivationCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderLeftWidth: 4,
    shadowColor: colors.shadow.color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: colors.shadow.opacity,
    shadowRadius: 4,
    elevation: 2,
  },
  motivationText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: colors.text.primary,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  motivationAuthor: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.text.secondary,
    textAlign: 'right',
  },
  quickActionsList: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: colors.shadow.color,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: colors.shadow.opacity,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickActionText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: colors.text.primary,
  },
});