import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  TextInput,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { useDatabase } from '@/context/DatabaseContext';
import { Plus, Play, Square, X, Search, Check, Dumbbell } from 'lucide-react-native';
import { useThemeColors } from '@/utils/colorSystem';
import CustomPopup from '@/components/CustomPopup';
import { usePopup } from '@/hooks/usePopup';
import { getRandomMotivationalMessage } from '@/utils/fitnessMessages';

const { width } = Dimensions.get('window');

interface Exercise {
  id: number;
  name: string;
  category: string;
  primary_muscle: string;
  equipment: string;
  difficulty_level: number;
}

interface WorkoutSet {
  id?: number;
  exercise_id: number;
  set_number: number;
  reps: number;
  weight: number;
  completed: boolean;
}

interface ActiveExercise {
  exercise: Exercise;
  sets: WorkoutSet[];
}

export default function WorkoutScreen() {
  const { user } = useAuth();
  const { db } = useDatabase();
  const colors = useThemeColors();
  const {
    popupConfig,
    hidePopup,
    showSuccess,
    showError,
    showConfirmation,
  } = usePopup();
  
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [activeExercises, setActiveExercises] = useState<ActiveExercise[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [timer, setTimer] = useState(0);

  const categories = ['All', 'Chest', 'Back', 'Legs', 'Arms', 'Core'];

  useEffect(() => {
    loadExercises();
  }, [db]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWorkoutActive && workoutStartTime) {
      interval = setInterval(() => {
        setTimer(Math.floor((Date.now() - workoutStartTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isWorkoutActive, workoutStartTime]);

  const loadExercises = async () => {
    if (!db) return;
    try {
      const result = await db.getAllAsync('SELECT * FROM exercises ORDER BY category, name');
      setExercises(result as Exercise[]);
    } catch (error) {
      console.error('Error loading exercises:', error);
      showError('Error', 'Failed to load exercises');
    }
  };

  const startWorkout = () => {
    setIsWorkoutActive(true);
    setWorkoutStartTime(new Date());
    setTimer(0);
  };

  const endWorkout = async () => {
    if (!user || !db || !workoutStartTime) return;

    if (activeExercises.length === 0) {
      showConfirmation(
        'End Empty Workout?',
        'You haven\'t added any exercises. Are you sure you want to end this workout?',
        () => resetWorkout()
      );
      return;
    }

    try {
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - workoutStartTime.getTime()) / 1000);

      // Save workout
      const workoutResult = await db.runAsync(
        'INSERT INTO workouts (user_id, start_time, end_time, duration_seconds) VALUES (?, ?, ?, ?)',
        [user.id, workoutStartTime.toISOString(), endTime.toISOString(), duration]
      );

      // Save all sets
      for (const activeExercise of activeExercises) {
        for (const set of activeExercise.sets) {
          await db.runAsync(
            'INSERT INTO workout_sets (workout_id, exercise_id, set_number, reps, weight, completed, weight_unit) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [workoutResult.lastInsertRowId, set.exercise_id, set.set_number, set.reps, set.weight, set.completed, user.preferred_weight_unit]
          );
        }
      }

      // Show completion message
      const completionMessage = getRandomMotivationalMessage('workoutComplete');
      showSuccess('Workout Complete! 💪', completionMessage);
      
      resetWorkout();
    } catch (error) {
      console.error('Error saving workout:', error);
      showError('Save Error', 'Failed to save workout. Please try again.');
    }
  };

  const resetWorkout = () => {
    setIsWorkoutActive(false);
    setWorkoutStartTime(null);
    setActiveExercises([]);
    setTimer(0);
  };

  const addExercise = (exercise: Exercise) => {
    const newActiveExercise: ActiveExercise = {
      exercise,
      sets: [{
        exercise_id: exercise.id,
        set_number: 1,
        reps: 0,
        weight: 0,
        completed: false,
      }],
    };
    setActiveExercises([...activeExercises, newActiveExercise]);
    setShowExerciseModal(false);
  };

  const addSet = (exerciseIndex: number) => {
    const updatedExercises = [...activeExercises];
    const lastSet = updatedExercises[exerciseIndex].sets[updatedExercises[exerciseIndex].sets.length - 1];
    const newSet: WorkoutSet = {
      exercise_id: lastSet.exercise_id,
      set_number: lastSet.set_number + 1,
      reps: lastSet.reps,
      weight: lastSet.weight,
      completed: false,
    };
    updatedExercises[exerciseIndex].sets.push(newSet);
    setActiveExercises(updatedExercises);
  };

  const updateSet = (exerciseIndex: number, setIndex: number, field: 'reps' | 'weight' | 'completed', value: any) => {
    const updatedExercises = [...activeExercises];
    updatedExercises[exerciseIndex].sets[setIndex][field] = value;
    setActiveExercises(updatedExercises);
  };

  const removeExercise = (exerciseIndex: number) => {
    const updatedExercises = activeExercises.filter((_, index) => index !== exerciseIndex);
    setActiveExercises(updatedExercises);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || exercise.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderExerciseItem = ({ item }: { item: Exercise }) => (
    <TouchableOpacity
      style={[styles.exerciseItem, { borderBottomColor: colors.divider }]}
      onPress={() => addExercise(item)}
    >
      <View style={styles.exerciseInfo}>
        <Text style={[styles.exerciseName, { color: colors.text.primary }]}>{item.name}</Text>
        <Text style={[styles.exerciseDetails, { color: colors.text.secondary }]}>
          {item.primary_muscle} • {item.equipment} • {'★'.repeat(item.difficulty_level)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderActiveExercise = ({ item, index }: { item: ActiveExercise; index: number }) => (
    <View style={[styles.activeExerciseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.exerciseHeader}>
        <Text style={[styles.activeExerciseName, { color: colors.text.primary }]}>{item.exercise.name}</Text>
        <TouchableOpacity onPress={() => removeExercise(index)}>
          <X size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.setsHeader}>
        <Text style={[styles.setHeaderText, { color: colors.text.secondary }]}>Set</Text>
        <Text style={[styles.setHeaderText, { color: colors.text.secondary }]}>Reps</Text>
        <Text style={[styles.setHeaderText, { color: colors.text.secondary }]}>Weight</Text>
        <Text style={[styles.setHeaderText, { color: colors.text.secondary }]}>Done</Text>
      </View>

      {item.sets.map((set, setIndex) => (
        <View key={setIndex} style={styles.setRow}>
          <Text style={[styles.setNumber, { color: colors.text.primary }]}>{set.set_number}</Text>
          <TextInput
            style={[styles.setInput, { backgroundColor: colors.inputBackground, color: colors.text.primary }]}
            value={set.reps.toString()}
            onChangeText={(text) => updateSet(index, setIndex, 'reps', parseInt(text) || 0)}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.text.tertiary}
          />
          <TextInput
            style={[styles.setInput, { backgroundColor: colors.inputBackground, color: colors.text.primary }]}
            value={set.weight.toString()}
            onChangeText={(text) => updateSet(index, setIndex, 'weight', parseFloat(text) || 0)}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.text.tertiary}
          />
          <TouchableOpacity
            style={[
              styles.checkButton, 
              { backgroundColor: set.completed ? colors.success : colors.inputBackground }
            ]}
            onPress={() => updateSet(index, setIndex, 'completed', !set.completed)}
          >
            {set.completed && <Check size={16} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity
        style={styles.addSetButton}
        onPress={() => addSet(index)}
      >
        <Plus size={16} color={colors.primary} />
        <Text style={[styles.addSetText, { color: colors.primary }]}>Add Set</Text>
      </TouchableOpacity>
    </View>
  );

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.timerContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.timerText, { color: colors.text.primary }]}>{formatTime(timer)}</Text>
        </View>
        {isWorkoutActive && (
          <TouchableOpacity 
            style={[styles.endButton, { backgroundColor: colors.primary }]} 
            onPress={endWorkout}
          >
            <Text style={styles.endButtonText}>End</Text>
          </TouchableOpacity>
        )}
      </View>

      {!isWorkoutActive ? (
        <View style={styles.startContainer}>
          {/* Hero Image */}
          <View style={styles.heroContainer}>
            <Image 
              source={{ uri: 'https://images.pexels.com/photos/1552252/pexels-photo-1552252.jpeg?auto=compress&cs=tinysrgb&w=800' }}
              style={styles.heroImage}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.heroGradient}
            >
              <View style={styles.heroContent}>
                <Dumbbell size={48} color="#FFFFFF" />
                <Text style={styles.heroTitle}>Ready to Train?</Text>
                <Text style={styles.heroSubtitle}>Start your workout and track your progress</Text>
              </View>
            </LinearGradient>
          </View>
          
          <TouchableOpacity style={styles.startButton} onPress={startWorkout}>
            <LinearGradient
              colors={colors.gradients.primary}
              style={styles.startButtonGradient}
            >
              <Play size={24} color="#FFFFFF" />
              <Text style={styles.startButtonText}>Start Workout</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.workoutContainer}>
          {activeExercises.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: colors.text.secondary }]}>
                Add your first exercise to get started!
              </Text>
            </View>
          ) : (
            <FlatList
              data={activeExercises}
              renderItem={renderActiveExercise}
              keyExtractor={(item, index) => index.toString()}
              showsVerticalScrollIndicator={false}
            />
          )}
          
          <TouchableOpacity
            style={styles.addExerciseButton}
            onPress={() => setShowExerciseModal(true)}
          >
            <LinearGradient
              colors={colors.gradients.primary}
              style={styles.addExerciseGradient}
            >
              <Plus size={24} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Exercise Selection Modal */}
      <Modal
        visible={showExerciseModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Select Exercise</Text>
            <TouchableOpacity onPress={() => setShowExerciseModal(false)}>
              <X size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground }]}>
            <Search size={20} color={colors.text.secondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text.primary }]}
              placeholder="Search exercises..."
              placeholderTextColor={colors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.categoriesContainer}>
            <FlatList
              data={categories}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryChip,
                    { backgroundColor: selectedCategory === item ? colors.primary : colors.inputBackground },
                  ]}
                  onPress={() => setSelectedCategory(item)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: selectedCategory === item ? colors.text.onPrimary : colors.text.secondary },
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item}
              horizontal
              showsHorizontalScrollIndicator={false}
            />
          </View>

          <FlatList
            data={filteredExercises}
            renderItem={renderExerciseItem}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
          />
        </SafeAreaView>
      </Modal>

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  timerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  timerText: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
  },
  endButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  endButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  startContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  heroContainer: {
    height: 300,
    borderRadius: 20,
    overflow: 'hidden',
    marginVertical: 32,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    justifyContent: 'flex-end',
  },
  heroContent: {
    padding: 32,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
  },
  startButton: {
    borderRadius: 16,
    shadowColor: colors.shadow.color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: colors.shadow.opacity,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  startButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  workoutContainer: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  activeExerciseCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: colors.shadow.color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: colors.shadow.opacity,
    shadowRadius: 4,
    elevation: 2,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activeExerciseName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  setsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  setHeaderText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    width: 60,
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  setNumber: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    width: 60,
    textAlign: 'center',
  },
  setInput: {
    width: 60,
    height: 40,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  checkButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  addSetText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginLeft: 4,
  },
  addExerciseButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: colors.shadow.color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: colors.shadow.opacity,
    shadowRadius: 8,
    elevation: 5,
  },
  addExerciseGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginLeft: 8,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  exerciseDetails: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
});