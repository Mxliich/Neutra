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
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [activeExercises, setActiveExercises] = useState<ActiveExercise[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState<string | null>(null);

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
      setError('Failed to load exercises');
    }
  };

  const startWorkout = () => {
    setIsWorkoutActive(true);
    setWorkoutStartTime(new Date());
    setTimer(0);
    setError(null);
  };

  const endWorkout = async () => {
    if (!user || !db || !workoutStartTime) return;

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

      resetWorkout();
    } catch (error) {
      console.error('Error saving workout:', error);
      setError('Failed to save workout');
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
      style={styles.exerciseItem}
      onPress={() => addExercise(item)}
    >
      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseName}>{item.name}</Text>
        <Text style={styles.exerciseDetails}>
          {item.primary_muscle} • {item.equipment} • {'★'.repeat(item.difficulty_level)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderActiveExercise = ({ item, index }: { item: ActiveExercise; index: number }) => (
    <View style={styles.activeExerciseCard}>
      <View style={styles.exerciseHeader}>
        <Text style={styles.activeExerciseName}>{item.exercise.name}</Text>
        <TouchableOpacity onPress={() => removeExercise(index)}>
          <X size={20} color="#6C757D" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.setsHeader}>
        <Text style={styles.setHeaderText}>Set</Text>
        <Text style={styles.setHeaderText}>Reps</Text>
        <Text style={styles.setHeaderText}>Weight</Text>
        <Text style={styles.setHeaderText}>Done</Text>
      </View>

      {item.sets.map((set, setIndex) => (
        <View key={setIndex} style={styles.setRow}>
          <Text style={styles.setNumber}>{set.set_number}</Text>
          <TextInput
            style={styles.setInput}
            value={set.reps.toString()}
            onChangeText={(text) => updateSet(index, setIndex, 'reps', parseInt(text) || 0)}
            keyboardType="numeric"
            placeholder="0"
          />
          <TextInput
            style={styles.setInput}
            value={set.weight.toString()}
            onChangeText={(text) => updateSet(index, setIndex, 'weight', parseFloat(text) || 0)}
            keyboardType="numeric"
            placeholder="0"
          />
          <TouchableOpacity
            style={[styles.checkButton, set.completed && styles.checkButtonCompleted]}
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
        <Plus size={16} color="#FF6B9D" />
        <Text style={styles.addSetText}>Add Set</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatTime(timer)}</Text>
        </View>
        {isWorkoutActive && (
          <TouchableOpacity style={styles.endButton} onPress={endWorkout}>
            <Text style={styles.endButtonText}>End</Text>
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

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
              colors={['#FF6B9D', '#FF8FA3']}
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
              <Text style={styles.emptyStateText}>Add your first exercise to get started!</Text>
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
              colors={['#FF6B9D', '#FF8FA3']}
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
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Exercise</Text>
            <TouchableOpacity onPress={() => setShowExerciseModal(false)}>
              <X size={24} color="#2C2C2C" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Search size={20} color="#6C757D" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises..."
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
                    selectedCategory === item && styles.categoryChipSelected,
                  ]}
                  onPress={() => setSelectedCategory(item)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === item && styles.categoryChipTextSelected,
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  timerContainer: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  timerText: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#2C2C2C',
  },
  endButton: {
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  endButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  errorContainer: {
    backgroundColor: '#FFE5E5',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
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
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
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
    color: '#6C757D',
    textAlign: 'center',
  },
  activeExerciseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F3F4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
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
    color: '#2C2C2C',
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
    color: '#6C757D',
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
    color: '#2C2C2C',
    width: 60,
    textAlign: 'center',
  },
  setInput: {
    width: 60,
    height: 40,
    backgroundColor: '#F1F3F4',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#2C2C2C',
  },
  checkButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F3F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkButtonCompleted: {
    backgroundColor: '#A8E6CF',
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
    color: '#FF6B9D',
    marginLeft: 4,
  },
  addExerciseButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F4',
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
    color: '#2C2C2C',
    marginLeft: 8,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F1F3F4',
    borderRadius: 20,
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#FF6B9D',
  },
  categoryChipText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6C757D',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#2C2C2C',
    marginBottom: 4,
  },
  exerciseDetails: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6C757D',
  },
});