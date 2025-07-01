import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useDatabase } from '@/context/DatabaseContext';
import { CreditCard as Edit3, Trophy, Calendar, Target, TrendingUp, User, X, Check } from 'lucide-react-native';

interface WorkoutStats {
  totalWorkouts: number;
  thisWeekWorkouts: number;
  totalSets: number;
  favoriteExercise: string;
  totalWeight: number;
  currentStreak: number;
}

export default function ProfileScreen() {
  const { user, updateProfile } = useAuth();
  const { db } = useDatabase();
  const [stats, setStats] = useState<WorkoutStats>({
    totalWorkouts: 0,
    thisWeekWorkouts: 0,
    totalSets: 0,
    favoriteExercise: '',
    totalWeight: 0,
    currentStreak: 0,
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    weight: user?.weight?.toString() || '',
    height: user?.height?.toString() || '',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, [db, user]);

  const loadStats = async () => {
    if (!db || !user) return;

    try {
      // Total workouts
      const totalWorkouts = await db.getFirstAsync(
        'SELECT COUNT(*) as count FROM workouts WHERE user_id = ?',
        [user.id]
      ) as { count: number };

      // This week workouts
      const thisWeekWorkouts = await db.getFirstAsync(
        'SELECT COUNT(*) as count FROM workouts WHERE user_id = ? AND start_time >= date("now", "-7 days")',
        [user.id]
      ) as { count: number };

      // Total sets
      const totalSets = await db.getFirstAsync(
        'SELECT COUNT(*) as count FROM workout_sets ws JOIN workouts w ON ws.workout_id = w.id WHERE w.user_id = ? AND ws.completed = 1',
        [user.id]
      ) as { count: number };

      // Total weight lifted
      const totalWeight = await db.getFirstAsync(
        'SELECT SUM(ws.weight * ws.reps) as total FROM workout_sets ws JOIN workouts w ON ws.workout_id = w.id WHERE w.user_id = ? AND ws.completed = 1',
        [user.id]
      ) as { total: number };

      // Most used exercise
      const favoriteExercise = await db.getFirstAsync(
        `SELECT e.name, COUNT(*) as count 
         FROM workout_sets ws 
         JOIN workouts w ON ws.workout_id = w.id 
         JOIN exercises e ON ws.exercise_id = e.id 
         WHERE w.user_id = ? AND ws.completed = 1 
         GROUP BY e.name 
         ORDER BY count DESC 
         LIMIT 1`,
        [user.id]
      ) as { name: string; count: number };

      setStats({
        totalWorkouts: totalWorkouts.count,
        thisWeekWorkouts: thisWeekWorkouts.count,
        totalSets: totalSets.count,
        favoriteExercise: favoriteExercise?.name || 'None yet',
        totalWeight: Math.round(totalWeight.total || 0),
        currentStreak: thisWeekWorkouts.count, // Simplified streak calculation
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setError(null);
      const updates: any = {
        name: editForm.name,
        bio: editForm.bio,
      };

      if (editForm.weight) {
        updates.weight = parseFloat(editForm.weight);
      }

      if (editForm.height) {
        updates.height = parseFloat(editForm.height);
      }

      await updateProfile(updates);
      setShowEditModal(false);
    } catch (error) {
      setError('Failed to update profile');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profilePicture}>
            {user?.profile_picture_uri ? (
              <Image 
                source={{ uri: user.profile_picture_uri }} 
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileInitials}>
                <Text style={styles.initialsText}>{getInitials(user?.name || 'U')}</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.userName}>{user?.name}</Text>
          {user?.bio && <Text style={styles.userBio}>{user.bio}</Text>}
          
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => setShowEditModal(true)}
          >
            <Edit3 size={16} color="#FF6B9D" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Fitness Photo */}
        <View style={styles.fitnessPhotoContainer}>
          <Image 
            source={{ uri: 'https://images.pexels.com/photos/1552106/pexels-photo-1552106.jpeg?auto=compress&cs=tinysrgb&w=800' }}
            style={styles.fitnessPhoto}
          />
          <View style={styles.photoOverlay}>
            <Text style={styles.photoText}>Your fitness journey</Text>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsSection}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Trophy size={24} color="#FF6B9D" />
              </View>
              <Text style={styles.statNumber}>{stats.totalWorkouts}</Text>
              <Text style={styles.statLabel}>Total Workouts</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Calendar size={24} color="#A8E6CF" />
              </View>
              <Text style={styles.statNumber}>{stats.thisWeekWorkouts}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Target size={24} color="#DDA0DD" />
              </View>
              <Text style={styles.statNumber}>{stats.totalSets}</Text>
              <Text style={styles.statLabel}>Total Sets</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <TrendingUp size={24} color="#00D4FF" />
              </View>
              <Text style={styles.statNumber}>{stats.currentStreak}</Text>
              <Text style={styles.statLabel}>Week Streak</Text>
            </View>
          </View>
        </View>

        {/* Detailed Stats */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Workout Insights</Text>
          
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>Total Weight Lifted</Text>
            <Text style={styles.detailValue}>
              {stats.totalWeight.toLocaleString()} {user?.preferred_weight_unit || 'kg'}
            </Text>
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>Favorite Exercise</Text>
            <Text style={styles.detailValue}>{stats.favoriteExercise}</Text>
          </View>

          {(user?.weight || user?.height) && (
            <View style={styles.detailCard}>
              <Text style={styles.detailTitle}>Body Stats</Text>
              <View style={styles.bodyStats}>
                {user.weight && (
                  <Text style={styles.bodyStat}>
                    Weight: {user.weight} {user.preferred_weight_unit}
                  </Text>
                )}
                {user.height && (
                  <Text style={styles.bodyStat}>
                    Height: {user.height} cm
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Achievements */}
        <View style={styles.achievementsSection}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <View style={styles.achievementsList}>
            {stats.totalWorkouts >= 1 && (
              <View style={styles.achievementItem}>
                <Text style={styles.achievementEmoji}>🏃‍♀️</Text>
                <Text style={styles.achievementText}>First Workout Complete!</Text>
              </View>
            )}
            {stats.totalWorkouts >= 10 && (
              <View style={styles.achievementItem}>
                <Text style={styles.achievementEmoji}>💪</Text>
                <Text style={styles.achievementText}>10 Workouts Strong</Text>
              </View>
            )}
            {stats.thisWeekWorkouts >= 3 && (
              <View style={styles.achievementItem}>
                <Text style={styles.achievementEmoji}>🔥</Text>
                <Text style={styles.achievementText}>Weekly Warrior</Text>
              </View>
            )}
            {stats.totalSets >= 100 && (
              <View style={styles.achievementItem}>
                <Text style={styles.achievementEmoji}>🎯</Text>
                <Text style={styles.achievementText}>Century Club</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <X size={24} color="#2C2C2C" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={editForm.name}
                onChangeText={(text) => setEditForm({...editForm, name: text})}
                placeholder="Enter your name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editForm.bio}
                onChangeText={(text) => setEditForm({...editForm, bio: text})}
                placeholder="Tell us about yourself"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Weight ({user?.preferred_weight_unit})</Text>
              <TextInput
                style={styles.input}
                value={editForm.weight}
                onChangeText={(text) => setEditForm({...editForm, weight: text})}
                placeholder="Enter your weight"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Height (cm)</Text>
              <TextInput
                style={styles.input}
                value={editForm.height}
                onChangeText={(text) => setEditForm({...editForm, height: text})}
                placeholder="Enter your height"
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleSaveProfile}
            >
              <Check size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 32,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profileInitials: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FF6B9D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: 36,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#2C2C2C',
    marginBottom: 8,
  },
  userBio: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6C757D',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF6B9D',
  },
  editButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FF6B9D',
    marginLeft: 4,
  },
  fitnessPhotoContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    height: 160,
    position: 'relative',
  },
  fitnessPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 16,
  },
  photoText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  statsSection: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#F1F3F4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#2C2C2C',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6C757D',
    textAlign: 'center',
  },
  detailsSection: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#2C2C2C',
    marginBottom: 16,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F3F4',
  },
  detailTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6C757D',
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#2C2C2C',
  },
  bodyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bodyStat: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#2C2C2C',
  },
  achievementsSection: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  achievementsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F3F4',
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  achievementEmoji: {
    fontSize: 24,
    marginRight: 16,
  },
  achievementText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#2C2C2C',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#2C2C2C',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  errorContainer: {
    backgroundColor: '#FFE5E5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#2C2C2C',
    marginBottom: 8,
  },
  input: {
    height: 56,
    backgroundColor: '#F1F3F4',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#2C2C2C',
  },
  textArea: {
    height: 80,
    paddingTop: 16,
    textAlignVertical: 'top',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B9D',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 32,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});