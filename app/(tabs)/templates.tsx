import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, Star, CreditCard as Edit3, Trash2, Play, Dumbbell } from 'lucide-react-native';
import { useThemeColors } from '@/utils/colorSystem';
import { useDatabase } from '@/context/DatabaseContext';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import WorkoutTemplateModal from '@/components/WorkoutTemplateModal';
import CustomPopup from '@/components/CustomPopup';
import { usePopup } from '@/hooks/usePopup';

interface WorkoutTemplate {
  id: number;
  name: string;
  description: string;
  is_favorite: boolean;
  exercise_count: number;
  created_at: string;
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

export default function TemplatesScreen() {
  const colors = useThemeColors();
  const { db } = useDatabase();
  const { user } = useAuth();
  const {
    popupConfig,
    hidePopup,
    showSuccess,
    showError,
    showConfirmation,
  } = usePopup();

  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, [db, user]);

  const loadTemplates = async () => {
    if (!db || !user) return;

    try {
      setLoading(true);
      const result = await db.getAllAsync(`
        SELECT 
          wt.*,
          COUNT(te.id) as exercise_count
        FROM workout_templates wt
        LEFT JOIN template_exercises te ON wt.id = te.template_id
        WHERE wt.user_id = ?
        GROUP BY wt.id
        ORDER BY wt.is_favorite DESC, wt.updated_at DESC
      `, [user.id]);

      setTemplates(result as WorkoutTemplate[]);
    } catch (error) {
      console.error('Error loading templates:', error);
      showError('Error', 'Failed to load workout templates');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplateExercises = async (templateId: number): Promise<TemplateExercise[]> => {
    if (!db) return [];

    try {
      const result = await db.getAllAsync(`
        SELECT 
          te.*,
          e.name as exercise_name
        FROM template_exercises te
        JOIN exercises e ON te.exercise_id = e.id
        WHERE te.template_id = ?
        ORDER BY te.order_index
      `, [templateId]);

      return result.map((row: any) => ({
        exercise_id: row.exercise_id,
        exercise_name: row.exercise_name,
        default_sets: row.default_sets,
        default_reps: row.default_reps,
        default_weight: row.default_weight,
        rest_time_seconds: row.rest_time_seconds,
        notes: row.notes || '',
      }));
    } catch (error) {
      console.error('Error loading template exercises:', error);
      return [];
    }
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setShowTemplateModal(true);
  };

  const handleEditTemplate = async (template: WorkoutTemplate) => {
    const exercises = await loadTemplateExercises(template.id);
    setEditingTemplate({
      ...template,
      exercises,
    });
    setShowTemplateModal(true);
  };

  const handleDeleteTemplate = (template: WorkoutTemplate) => {
    showConfirmation(
      'Delete Template',
      `Are you sure you want to delete "${template.name}"? This action cannot be undone.`,
      () => deleteTemplate(template.id)
    );
  };

  const deleteTemplate = async (templateId: number) => {
    if (!db) return;

    try {
      await db.runAsync('DELETE FROM workout_templates WHERE id = ?', [templateId]);
      showSuccess('Template Deleted', 'Workout template has been deleted successfully');
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      showError('Error', 'Failed to delete template');
    }
  };

  const handleToggleFavorite = async (template: WorkoutTemplate) => {
    if (!db) return;

    try {
      await db.runAsync(
        'UPDATE workout_templates SET is_favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [!template.is_favorite, template.id]
      );
      loadTemplates();
    } catch (error) {
      console.error('Error updating favorite:', error);
      showError('Error', 'Failed to update favorite status');
    }
  };

  const handleStartWorkout = async (template: WorkoutTemplate) => {
    // Navigate to workout screen with template
    router.push({
      pathname: '/workout',
      params: { templateId: template.id.toString() }
    });
  };

  const handleTemplateSaved = () => {
    showSuccess('Template Saved', 'Workout template has been saved successfully');
    loadTemplates();
  };

  const renderTemplate = ({ item }: { item: WorkoutTemplate }) => (
    <View style={[styles.templateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.templateHeader}>
        <View style={styles.templateInfo}>
          <View style={styles.templateTitleRow}>
            <Text style={[styles.templateName, { color: colors.text.primary }]}>{item.name}</Text>
            <TouchableOpacity onPress={() => handleToggleFavorite(item)}>
              <Star 
                size={20} 
                color={item.is_favorite ? colors.warning : colors.text.tertiary}
                fill={item.is_favorite ? colors.warning : 'transparent'}
              />
            </TouchableOpacity>
          </View>
          {item.description && (
            <Text style={[styles.templateDescription, { color: colors.text.secondary }]}>
              {item.description}
            </Text>
          )}
          <Text style={[styles.templateMeta, { color: colors.text.tertiary }]}>
            {item.exercise_count} exercise{item.exercise_count !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      <View style={styles.templateActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => handleStartWorkout(item)}
        >
          <Play size={16} color={colors.text.onPrimary} />
          <Text style={[styles.actionButtonText, { color: colors.text.onPrimary }]}>
            Start
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
          onPress={() => handleEditTemplate(item)}
        >
          <Edit3 size={16} color={colors.text.primary} />
          <Text style={[styles.actionButtonText, { color: colors.text.primary }]}>
            Edit
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: colors.error + '20' }]}
          onPress={() => handleDeleteTemplate(item)}
        >
          <Trash2 size={16} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Image 
        source={{ uri: 'https://images.pexels.com/photos/1552106/pexels-photo-1552106.jpeg?auto=compress&cs=tinysrgb&w=400' }}
        style={styles.emptyImage}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={styles.emptyOverlay}
      >
        <Dumbbell size={48} color="#FFFFFF" />
        <Text style={styles.emptyTitle}>No Templates Yet</Text>
        <Text style={styles.emptySubtitle}>
          Create your first workout template to save time and stay consistent
        </Text>
        <TouchableOpacity
          style={[styles.createFirstButton, { backgroundColor: colors.primary }]}
          onPress={handleCreateTemplate}
        >
          <Plus size={20} color={colors.text.onPrimary} />
          <Text style={[styles.createFirstButtonText, { color: colors.text.onPrimary }]}>
            Create Template
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Workout Templates</Text>
          <Text style={styles.headerSubtitle}>Save and reuse your favorite workouts</Text>
        </View>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: colors.primary }]}
          onPress={handleCreateTemplate}
        >
          <Plus size={20} color={colors.text.onPrimary} />
        </TouchableOpacity>
      </View>

      {/* Templates List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
            Loading templates...
          </Text>
        </View>
      ) : templates.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={templates}
          renderItem={renderTemplate}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.templatesList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Template Modal */}
      <WorkoutTemplateModal
        visible={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        template={editingTemplate}
        onSave={handleTemplateSaved}
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
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.text.secondary,
  },
  createButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  templatesList: {
    padding: 16,
  },
  templateCard: {
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
  templateHeader: {
    marginBottom: 16,
  },
  templateInfo: {
    flex: 1,
  },
  templateTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  templateName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    flex: 1,
  },
  templateDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
    lineHeight: 20,
  },
  templateMeta: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  templateActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  emptyImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  emptyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 24,
    lineHeight: 22,
  },
  createFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  createFirstButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});