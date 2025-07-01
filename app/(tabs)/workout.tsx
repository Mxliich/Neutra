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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { useDatabase } from '@/context/DatabaseContext';
import { useLocalSearchParams } from 'expo-router';
import { Plus, Play, Square, X, Search, Check, Dumbbell, Timer, BookOpen, Trash2, MoveVertical as MoreVertical, Clock } from 'lucide-react-native';
import { useThemeColors } from '@/utils/colorSystem';
import CustomPopup from '@/components/CustomPopup';
import { usePopup } from '@/hooks/usePopup';
import { getRandomMotivationalMessage } from '@/utils/fitnessMessages';
import RestTimer from '@/components/RestTimer';

const { width } = Dimensions.get('window');

interface Exercise {
  id: number;
  name: string;
  category: string;
  primary_muscle: string;
  equipment: string;
  difficulty_level: number;
  instructions: string;
}

interface WorkoutSet {
  id?: number;
  set_number: number;
  reps: number;
  weight: number;
  completed: boolean;
  is_warmup: boolean;
  rest_time_seconds?: number;
  rpe?: number;
  notes?: string;
}

interface ActiveExercise {
  id?: number;
  exercise: Exercise;
  sets: WorkoutSet[];
  notes?: string;
}

interface WorkoutTemplate {
  id: number;
  name: string;
  exercises: any[];
}

export default function WorkoutScreen() {
  const { user } = useAuth();
  const { db } = useDatabase();
  const colors = useThemeColors();
  const params = useLocalSearchParams();
  const templateId = params.templateId ? parseInt(params.templateId as string) : null;
  
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
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [timer, setTimer] = useState(0);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [currentRestTime, setCurrentRestTime] = useState(60);
  const [workoutNotes, setWorkoutNotes] = useState('');

  const categories = ['All', 'Chest', 'Back', 'Legs', 'Arms', 'Core', 'Cardio'];

  useEffect(() => {
    loadExercises();
    loadTemplates();
    
    // Load template if provided
    if (templateId) {
      loadTemplate(templateId);
    }
  }, [db, templateId]);

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
      const result = await db.getAllAsync(`
        SELECT * FROM exercises 
        WHERE is_custom = FALSE OR user_id = ? 
        ORDER BY category, name
      `, [user?.id || 0]);
      setExercises(result as Exercise[]);
    } catch (error) {
      console.error('Error loading exercises:', error);
      showError('Error', 'Failed to load exercises');
    }
  };

  const loadTemplates = async () => {
    if (!db || !user) return;
    try {
      const result = await db.getAllAsync(`
        SELECT wt.*, COUNT(te.id) as exercise_count
        FROM workout_templates wt
        LEFT JOIN template_exercises te ON wt.id = te.template_id
        WHERE wt.user_id = ?
        GROUP BY wt.id
        ORDER BY wt.is_favorite DESC, wt.name
      `, [user.id]);
      setTemplates(result as WorkoutTemplate[]);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadTemplate = async (templateId: number) => {
    if (!db) return;
    
    try {
      // Get template exercises
      const templateExercises = await db.getAllAsync(`
        SELECT te.*, e.*
        FROM template_exercises te
        JOIN exercises e ON te.exercise_id = e.id
        WHERE te.template_id = ?
        ORDER BY te.order_index
      `, [templateId]);

      const loadedExercises: ActiveExercise[] = templateExercises.map((te: any) => ({
        exercise: {
          id: te.exercise_id,
          name: te.name,
          category: te.category,
          primary_muscle: te.primary_muscle,
          equipment: te.equipment,
          difficulty_level: te.difficulty_level,
          instructions: te.instructions,
        },
        sets: Array.from({ length: te.default_sets }, (_, i) => ({
          set_number: i + 1,
          reps: te.default_reps,
          weight: te.default_weight,
          completed: false,
          is_warmup: i === 0, // First set as warmup
          rest_time_seconds: te.rest_time_seconds,
        })),
        notes: te.notes,
      }));

      setActiveExercises(loadedExercises);
      
      // Auto-start workout if template is loaded
      if (!isWorkoutActive) {
        startWorkout();
      }
    } catch (error) {
      console.error('Error loading template:', error);
      showError('Error', 'Failed to load workout template');
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

      // Calculate total volume
      let totalVolume = 0;
      activeExercises.forEach(exercise => {
        exercise.sets.forEach(set => {
          if (set.completed) {
            totalVolume += set.weight * set.reps;
          }
        });
      });

      // Save workout
      const workoutResult = await db.runAsync(
        'INSERT INTO workouts (user_id, start_time, end_time, duration_seconds, total_volume, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [user.id, workoutStartTime.toISOString(), endTime.toISOString(), duration, totalVolume, workoutNotes]
      );

      const workoutId = workoutResult.lastInsertRowId as number;

      // Save exercises and sets
      for (let i = 0; i < activeExercises.length; i++) {
        const activeExercise = activeExercises[i];
        
        // Save workout exercise
        const exerciseResult = await db.runAsync(
          'INSERT INTO workout_exercises (workout_id, exercise_id, order_index, notes) VALUES (?, ?, ?, ?)',
          [workoutId, activeExercise.exercise.id, i, activeExercise.notes || '']
        );

        const workoutExerciseId = exerciseResult.lastInsertRowId as number;

        // Save sets
        for (const set of activeExercise.sets) {
          await db.runAsync(
            'INSERT INTO workout_sets (workout_exercise_id, set_number, reps, weight, weight_unit, completed, is_warmup, rest_time_seconds, rpe, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              workoutExerciseId,
              set.set_number,
              set.reps,
              set.weight,
              user.preferred_weight_unit,
              set.completed,
              set.is_warmup,
              set.rest_time_seconds || null,
              set.rpe || null,
              set.notes || ''
            ]
          );
        }
      }

      // Check for personal records
      await checkPersonalRecords(workoutId);

      // Show completion message
      const completionMessage = getRandomMotivationalMessage('workoutComplete');
      showSuccess('Workout Complete! 💪', completionMessage);
      
      resetWorkout();
    } catch (error) {
      console.error('Error saving workout:', error);
      showError('Save Error', 'Failed to save workout. Please try again.');
    }
  };

  const checkPersonalRecords = async (workoutId: number) => {
    if (!db || !user) return;

    try {
      for (const activeExercise of activeExercises) {
        const completedSets = activeExercise.sets.filter(set => set.completed && !set.is_warmup);
        
        if (completedSets.length === 0) continue;

        // Check for 1RM PR (highest weight)
        const maxWeight = Math.max(...completedSets.map(set => set.weight));
        const maxWeightSet = completedSets.find(set => set.weight === maxWeight);
        
        if (maxWeightSet) {
          const estimated1RM = maxWeight * (1 + maxWeightSet.reps / 30); // Epley formula
          
          const existingPR = await db.getFirstAsync(
            'SELECT value FROM personal_records WHERE user_id = ? AND exercise_id = ? AND record_type = "1RM"',
            [user.id, activeExercise.exercise.id]
          ) as { value: number } | null;

          if (!existingPR || estimated1RM > existingPR.value) {
            await db.runAsync(
              'INSERT OR REPLACE INTO personal_records (user_id, exercise_id, record_type, value, reps, weight, weight_unit, workout_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [user.id, activeExercise.exercise.id, '1RM', estimated1RM, maxWeightSet.reps, maxWeight, user.preferred_weight_unit, workoutId]
            );
            
            showSuccess('New Personal Record! 🏆', `New 1RM estimate for ${activeExercise.exercise.name}: ${Math.round(estimated1RM)} ${user.preferred_weight_unit}`);
          }
        }

        // Check for volume PR
        const totalVolume = completedSets.reduce((sum, set) => sum + (set.weight * set.reps), 0);
        
        const existingVolumePR = await db.getFirstAsync(
          'SELECT value FROM personal_records WHERE user_id = ? AND exercise_id = ? AND record_type = "volume"',
          [user.id, activeExercise.exercise.id]
        ) as { value: number } | null;

        if (!existingVolumePR || totalVolume > existingVolumePR.value) {
          await db.runAsync(
            'INSERT OR REPLACE INTO personal_records (user_id, exercise_id, record_type, value, workout_id) VALUES (?, ?, ?, ?, ?)',
            [user.id, activeExercise.exercise.id, 'volume', totalVolume, workoutId]
          );
        }
      }
    } catch (error) {
      console.error('Error checking personal records:', error);
    }
  };

  const resetWorkout = () => {
    setIsWorkoutActive(false);
    setWorkoutStartTime(null);
    setActiveExercises([]);
    setTimer(0);
    setWorkoutNotes('');
  };

  const addExercise = (exercise: Exercise) => {
    const newActiveExercise: ActiveExercise = {
      exercise,
      sets: [{
        set_number: 1,
        reps: 0,
        weight: 0,
        completed: false,
        is_warmup: true,
      }],
    };
    setActiveExercises([...activeExercises, newActiveExercise]);
    setShowExerciseModal(false);
  };

  const addSet = (exerciseIndex: number) => {
    const updatedExercises = [...activeExercises];
    const lastSet = updatedExercises[exerciseIndex].sets[updatedExercises[exerciseIndex].sets.length - 1];
    const newSet: WorkoutSet = {
      set_number: lastSet.set_number + 1,
      reps: lastSet.reps,
      weight: lastSet.weight,
      completed: false,
      is_warmup: false,
      rest_time_seconds: lastSet.rest_time_seconds,
    };
    updatedExercises[exerciseIndex].sets.push(newSet);
    setActiveExercises(updatedExercises);
  };

  const updateSet = (exerciseIndex: number, setIndex: number, field: keyof WorkoutSet, value: any) => {
    const updatedExercises = [...activeExercises];
    updatedExercises[exerciseIndex].sets[setIndex] = {
      ...updatedExercises[exerciseIndex].sets[setIndex],
      [field]: value
    };
    setActiveExercises(updatedExercises);

    // Auto-start rest timer when set is completed
    if (field === 'completed' && value === true) {
      const set = updatedExercises[exerciseIndex].sets[setIndex];
      if (set.rest_time_seconds && set.rest_time_seconds > 0) {
        setCurrentRestTime(set.rest_time_seconds);
        setShowRestTimer(true);
      }
    }
  };

  const removeExercise = (exerciseIndex: number) => {
    const updatedExercises = activeExercises.filter((_, index) => index !== exerciseIndex);
    setActiveExercises(updatedExercises);
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const updatedExercises = [...activeExercises];
    updatedExercises[exerciseIndex].sets = updatedExercises[exerciseIndex].sets.filter((_, index) => index !== setIndex);
    
    // Renumber remaining sets
    updatedExercises[exerciseIndex].sets.forEach((set, index) => {
      set.set_number = index + 1;
    });
    
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

  const renderTemplateItem = ({ item }: { item: WorkoutTemplate }) => (
    <TouchableOpacity
      style={[styles.templateItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => {
        loadTemplate(item.id);
        setShowTemplateModal(false);
      }}
    >
      <Text style={[styles.templateName, { color: colors.text.primary }]}>{item.name}</Text>
      <Text style={[styles.templateExercises, { color: colors.text.secondary }]}>
        {item.exercise_count} exercises
      </Text>
    </TouchableOpacity>
  );

  const renderActiveExercise = ({ item, index }: { item: ActiveExercise; index: number }) => (
    <View style={[styles.activeExerciseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseHeaderLeft}>
          <Text style={[styles.activeExerciseName, { color: colors.text.primary }]}>{item.exercise.name}</Text>
          <Text style={[styles.exerciseMuscle, { color: colors.text.secondary }]}>
            {item.exercise.primary_muscle}
          </Text>
        </View>
        <View style={styles.exerciseHeaderRight}>
          <TouchableOpacity
            style={[styles.restTimerButton, { backgroundColor: colors.primary + '20' }]}
            onPress={() => {
              setCurrentRestTime(60);
              setShowRestTimer(true);
            }}
          >
            <Clock size={16} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => removeExercise(index)}>
            <X size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.setsHeader}>
        <Text style={[styles.setHeaderText, { color: colors.text.secondary }]}>Set</Text>
        <Text style={[styles.setHeaderText, { color: colors.text.secondary }]}>Reps</Text>
        <Text style={[styles.setHeaderText, { color: colors.text.secondary }]}>Weight</Text>
        <Text style={[styles.setHeaderText, { color: colors.text.secondary }]}>✓</Text>
        <Text style={[styles.setHeaderText, { color: colors.text.secondary }]}>•••</Text>
      </View>

      {item.sets.map((set, setIndex) => (
        <View key={setIndex} style={styles.setRow}>
          <View style={styles.setNumberContainer}>
            <Text style={[styles.setNumber, { color: colors.text.primary }]}>
              {set.is_warmup ? 'W' : set.set_number}
            </Text>
          </View>
          
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

          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => {
              Alert.alert(
                'Set Options',
                'What would you like to do?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Delete Set', 
                    style: 'destructive',
                    onPress: () => removeSet(index, setIndex)
                  },
                  {
                    text: 'Toggle Warmup',
                    onPress: () => updateSet(index, setIndex, 'is_warmup', !set.is_warmup)
                  }
                ]
              );
            }}
          >
            <MoreVertical size={16} color={colors.text.secondary} />
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
          <Timer size={20} color={colors.text.primary} />
          <Text style={[styles.timerText, { color: colors.text.primary }]}>{formatTime(timer)}</Text>
        </View>
        
        <View style={styles.headerActions}>
          {!isWorkoutActive && (
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: colors.secondary }]}
              onPress={() => setShowTemplateModal(true)}
            >
              <BookOpen size={16} color={colors.text.onSecondary} />
            </TouchableOpacity>
          )}
          
          {isWorkoutActive && (
            <TouchableOpacity 
              style={[styles.endButton, { backgroundColor: colors.error }]} 
              onPress={endWorkout}
            >
              <Text style={styles.endButtonText}>End</Text>
            </TouchableOpacity>
          )}
        </View>
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
          
          <View style={styles.startActions}>
            <TouchableOpacity style={styles.startButton} onPress={startWorkout}>
              <LinearGradient
                colors={colors.gradients.primary}
                style={styles.startButtonGradient}
              >
                <Play size={24} color="#FFFFFF" />
                <Text style={styles.startButtonText}>Start Empty Workout</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.templateButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowTemplateModal(true)}
            >
              <BookOpen size={20} color={colors.text.primary} />
              <Text style={[styles.templateButtonText, { color: colors.text.primary }]}>
                Use Template
              </Text>
            </TouchableOpacity>
          </View>
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
              contentContainerStyle={styles.exercisesList}
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

      {/* Template Selection Modal */}
      <Modal
        visible={showTemplateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Select Template</Text>
            <TouchableOpacity onPress={() => setShowTemplateModal(false)}>
              <X size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {templates.length === 0 ? (
            <View style={styles.emptyTemplates}>
              <Text style={[styles.emptyTemplatesText, { color: colors.text.secondary }]}>
                No templates found. Create one in the Templates tab!
              </Text>
            </View>
          ) : (
            <FlatList
              data={templates}
              renderItem={renderTemplateItem}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.templatesList}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Rest Timer */}
      <RestTimer
        visible={showRestTimer}
        onClose={() => setShowRestTimer(false)}
        initialTime={currentRestTime}
        onComplete={() => {
          setShowRestTimer(false);
          showSuccess('Rest Complete!', 'Time for your next set! 💪');
        }}
      />

      {/* Popup */}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  timerText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
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
    height: 250,
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
  startActions: {
    gap: 16,
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
    gap: 8,
  },
  startButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  templateButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  workoutContainer: {
    flex: 1,
  },
  exercisesList: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  exerciseHeaderLeft: {
    flex: 1,
  },
  exerciseHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeExerciseName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  exerciseMuscle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  restTimerButton: {
    padding: 8,
    borderRadius: 8,
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
    width: 50,
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: 8,
  },
  setNumberContainer: {
    width: 50,
    alignItems: 'center',
  },
  setNumber: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  setInput: {
    width: 50,
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
  moreButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    gap: 4,
  },
  addSetText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
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
  templatesList: {
    padding: 16,
  },
  templateItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  templateName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  templateExercises: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  emptyTemplates: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTemplatesText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
});