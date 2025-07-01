import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Plus, Trash2, Save, Star } from 'lucide-react-native';
import { useThemeColors } from '@/utils/colorSystem';
import { useDatabase } from '@/context/DatabaseContext';
import { useAuth } from '@/context/AuthContext';

interface Exercise {
  id: number;
  name: string;
  category: string;
  primary_muscle: string;
}

interface TemplateExercise {
  exercise_id: number;
  exercise_name: string;
  default_sets: number;
  default_reps: number;
  default_weight: number;
  rest_time_seconds: number;
  notes: string;
}

interface WorkoutTemplate {
  id?: number;
  name: string;
  description: string;
  is_favorite: boolean;
  exercises: TemplateExercise[];
}

interface WorkoutTemplateModalProps {
  visible: boolean;
  onClose: () => void;
  template?: WorkoutTemplate;
  onSave: (template: WorkoutTemplate) => void;
}

export default function WorkoutTemplateModal({
  visible,
  onClose,
  template,
  onSave,
}: WorkoutTemplateModalProps) {
  const colors = useThemeColors();
  const { db } = useDatabase();
  const { user } = useAuth();
  
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [templateExercises, setTemplateExercises] = useState<TemplateExercise[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);

  useEffect(() => {
    if (visible) {
      loadExercises();
      if (template) {
        setTemplateName(template.name);
        setTemplateDescription(template.description);
        setIsFavorite(template.is_favorite);
        setTemplateExercises(template.exercises);
      } else {
        resetForm();
      }
    }
  }, [visible, template]);

  const resetForm = () => {
    setTemplateName('');
    setTemplateDescription('');
    setIsFavorite(false);
    setTemplateExercises([]);
  };

  const loadExercises = async () => {
    if (!db) return;
    try {
      const result = await db.getAllAsync(
        'SELECT id, name, category, primary_muscle FROM exercises ORDER BY category, name'
      );
      setExercises(result as Exercise[]);
    } catch (error) {
      console.error('Error loading exercises:', error);
    }
  };

  const addExercise = (exercise: Exercise) => {
    const newTemplateExercise: TemplateExercise = {
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      default_sets: 3,
      default_reps: 10,
      default_weight: 0,
      rest_time_seconds: 60,
      notes: '',
    };
    setTemplateExercises([...templateExercises, newTemplateExercise]);
    setShowExerciseSelector(false);
  };

  const removeExercise = (index: number) => {
    const updated = templateExercises.filter((_, i) => i !== index);
    setTemplateExercises(updated);
  };

  const updateExercise = (index: number, field: keyof TemplateExercise, value: any) => {
    const updated = [...templateExercises];
    updated[index] = { ...updated[index], [field]: value };
    setTemplateExercises(updated);
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      Alert.alert('Error', 'Please enter a template name');
      return;
    }

    if (templateExercises.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise');
      return;
    }

    const templateData: WorkoutTemplate = {
      id: template?.id,
      name: templateName.trim(),
      description: templateDescription.trim(),
      is_favorite: isFavorite,
      exercises: templateExercises,
    };

    try {
      if (!db || !user) return;

      if (template?.id) {
        // Update existing template
        await db.runAsync(
          'UPDATE workout_templates SET name = ?, description = ?, is_favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [templateData.name, templateData.description, templateData.is_favorite, template.id]
        );

        // Delete existing template exercises
        await db.runAsync('DELETE FROM template_exercises WHERE template_id = ?', [template.id]);
      } else {
        // Create new template
        const result = await db.runAsync(
          'INSERT INTO workout_templates (user_id, name, description, is_favorite) VALUES (?, ?, ?, ?)',
          [user.id, templateData.name, templateData.description, templateData.is_favorite]
        );
        templateData.id = result.lastInsertRowId as number;
      }

      // Insert template exercises
      for (let i = 0; i < templateExercises.length; i++) {
        const exercise = templateExercises[i];
        await db.runAsync(
          'INSERT INTO template_exercises (template_id, exercise_id, order_index, default_sets, default_reps, default_weight, rest_time_seconds, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            templateData.id,
            exercise.exercise_id,
            i,
            exercise.default_sets,
            exercise.default_reps,
            exercise.default_weight,
            exercise.rest_time_seconds,
            exercise.notes,
          ]
        );
      }

      onSave(templateData);
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      Alert.alert('Error', 'Failed to save template');
    }
  };

  const renderTemplateExercise = ({ item, index }: { item: TemplateExercise; index: number }) => (
    <View style={[styles.exerciseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.exerciseHeader}>
        <Text style={[styles.exerciseName, { color: colors.text.primary }]}>{item.exercise_name}</Text>
        <TouchableOpacity onPress={() => removeExercise(index)}>
          <Trash2 size={20} color={colors.error} />
        </TouchableOpacity>
      </View>

      <View style={styles.exerciseInputs}>
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.text.secondary }]}>Sets</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text.primary }]}
            value={item.default_sets.toString()}
            onChangeText={(text) => updateExercise(index, 'default_sets', parseInt(text) || 0)}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.text.secondary }]}>Reps</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text.primary }]}
            value={item.default_reps.toString()}
            onChangeText={(text) => updateExercise(index, 'default_reps', parseInt(text) || 0)}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.text.secondary }]}>Weight</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text.primary }]}
            value={item.default_weight.toString()}
            onChangeText={(text) => updateExercise(index, 'default_weight', parseFloat(text) || 0)}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.text.secondary }]}>Rest (s)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text.primary }]}
            value={item.rest_time_seconds.toString()}
            onChangeText={(text) => updateExercise(index, 'rest_time_seconds', parseInt(text) || 0)}
            keyboardType="numeric"
          />
        </View>
      </View>

      <TextInput
        style={[styles.notesInput, { backgroundColor: colors.inputBackground, color: colors.text.primary }]}
        placeholder="Notes (optional)"
        placeholderTextColor={colors.text.tertiary}
        value={item.notes}
        onChangeText={(text) => updateExercise(index, 'notes', text)}
        multiline
      />
    </View>
  );

  const renderExercise = ({ item }: { item: Exercise }) => (
    <TouchableOpacity
      style={[styles.exerciseItem, { borderBottomColor: colors.divider }]}
      onPress={() => addExercise(item)}
    >
      <View>
        <Text style={[styles.exerciseItemName, { color: colors.text.primary }]}>{item.name}</Text>
        <Text style={[styles.exerciseItemDetails, { color: colors.text.secondary }]}>
          {item.category} • {item.primary_muscle}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const styles = createStyles(colors);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {template ? 'Edit Template' : 'Create Template'}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Template Info */}
        <View style={styles.content}>
          <View style={styles.templateInfo}>
            <View style={styles.nameRow}>
              <TextInput
                style={[styles.nameInput, { backgroundColor: colors.inputBackground, color: colors.text.primary }]}
                placeholder="Template Name"
                placeholderTextColor={colors.text.tertiary}
                value={templateName}
                onChangeText={setTemplateName}
              />
              <TouchableOpacity
                style={[styles.favoriteButton, { backgroundColor: isFavorite ? colors.warning : colors.inputBackground }]}
                onPress={() => setIsFavorite(!isFavorite)}
              >
                <Star size={20} color={isFavorite ? colors.text.onPrimary : colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.descriptionInput, { backgroundColor: colors.inputBackground, color: colors.text.primary }]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.text.tertiary}
              value={templateDescription}
              onChangeText={setTemplateDescription}
              multiline
            />
          </View>

          {/* Exercises */}
          <View style={styles.exercisesSection}>
            <View style={styles.exercisesHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Exercises</Text>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowExerciseSelector(true)}
              >
                <Plus size={20} color={colors.text.onPrimary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={templateExercises}
              renderItem={renderTemplateExercise}
              keyExtractor={(item, index) => index.toString()}
              showsVerticalScrollIndicator={false}
              style={styles.exercisesList}
            />
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleSave}
          >
            <Save size={20} color={colors.text.onPrimary} />
            <Text style={[styles.saveButtonText, { color: colors.text.onPrimary }]}>
              Save Template
            </Text>
          </TouchableOpacity>
        </View>

        {/* Exercise Selector Modal */}
        <Modal
          visible={showExerciseSelector}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>Select Exercise</Text>
              <TouchableOpacity onPress={() => setShowExerciseSelector(false)}>
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={exercises}
              renderItem={renderExercise}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
            />
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </Modal>
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
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: colors.text.primary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  templateInfo: {
    marginBottom: 24,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  nameInput: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  favoriteButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  descriptionInput: {
    height: 80,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlignVertical: 'top',
  },
  exercisesSection: {
    flex: 1,
  },
  exercisesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exercisesList: {
    flex: 1,
  },
  exerciseCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  exerciseInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  input: {
    height: 36,
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  notesInput: {
    height: 60,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingTop: 8,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlignVertical: 'top',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  exerciseItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  exerciseItemName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  exerciseItemDetails: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
});