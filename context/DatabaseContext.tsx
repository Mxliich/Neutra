import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SQLite from 'expo-sqlite';

interface DatabaseContextType {
  db: SQLite.SQLiteDatabase | null;
  isReady: boolean;
  error: string | null;
}

const DatabaseContext = createContext<DatabaseContextType>({
  db: null,
  isReady: false,
  error: null,
});

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initDatabase = async () => {
      try {
        console.log('Initializing database...');
        const database = await SQLite.openDatabaseAsync('gym_logger.db');
        
        // Drop existing tables to ensure clean schema
        await database.execAsync(`
          PRAGMA journal_mode = WAL;
          PRAGMA foreign_keys = OFF;
          
          DROP TABLE IF EXISTS workout_sets;
          DROP TABLE IF EXISTS workout_exercises;
          DROP TABLE IF EXISTS personal_records;
          DROP TABLE IF EXISTS workouts;
          DROP TABLE IF EXISTS template_exercises;
          DROP TABLE IF EXISTS workout_templates;
          DROP TABLE IF EXISTS user_settings;
          DROP TABLE IF EXISTS exercises;
          DROP TABLE IF EXISTS users;
          
          PRAGMA foreign_keys = ON;
        `);
        
        // Create comprehensive tables with correct schema
        await database.execAsync(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(150) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            profile_picture_uri VARCHAR(255),
            bio TEXT,
            weight DECIMAL(5,2),
            height DECIMAL(5,2),
            gender VARCHAR(20),
            preferred_weight_unit VARCHAR(5) DEFAULT 'kg',
            theme_preference VARCHAR(20) DEFAULT 'light',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS exercises (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL,
            category VARCHAR(50) NOT NULL,
            primary_muscle VARCHAR(50) NOT NULL,
            secondary_muscles TEXT,
            equipment VARCHAR(50),
            difficulty_level INTEGER CHECK(difficulty_level BETWEEN 1 AND 5),
            instructions TEXT,
            form_video_uri VARCHAR(255),
            form_image_uri VARCHAR(255),
            is_custom BOOLEAN DEFAULT FALSE,
            user_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS workout_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            is_favorite BOOLEAN DEFAULT FALSE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS template_exercises (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_id INTEGER NOT NULL,
            exercise_id INTEGER NOT NULL,
            order_index INTEGER NOT NULL,
            default_sets INTEGER DEFAULT 3,
            default_reps INTEGER DEFAULT 10,
            default_weight DECIMAL(6,2) DEFAULT 0,
            rest_time_seconds INTEGER DEFAULT 60,
            notes TEXT,
            FOREIGN KEY (template_id) REFERENCES workout_templates (id) ON DELETE CASCADE,
            FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS workouts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            template_id INTEGER,
            name VARCHAR(100),
            start_time DATETIME NOT NULL,
            end_time DATETIME,
            duration_seconds INTEGER,
            total_volume DECIMAL(10,2) DEFAULT 0,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY (template_id) REFERENCES workout_templates (id) ON DELETE SET NULL
          );

          CREATE TABLE IF NOT EXISTS workout_exercises (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workout_id INTEGER NOT NULL,
            exercise_id INTEGER NOT NULL,
            order_index INTEGER NOT NULL,
            notes TEXT,
            FOREIGN KEY (workout_id) REFERENCES workouts (id) ON DELETE CASCADE,
            FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS workout_sets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workout_id INTEGER NOT NULL,
            exercise_id INTEGER NOT NULL,
            set_number INTEGER NOT NULL,
            reps INTEGER DEFAULT 0,
            weight DECIMAL(6,2) DEFAULT 0,
            weight_unit VARCHAR(5) DEFAULT 'kg',
            completed BOOLEAN DEFAULT FALSE,
            is_warmup BOOLEAN DEFAULT FALSE,
            rest_time_seconds INTEGER,
            rpe INTEGER CHECK(rpe BETWEEN 1 AND 10),
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workout_id) REFERENCES workouts (id) ON DELETE CASCADE,
            FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS personal_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            exercise_id INTEGER NOT NULL,
            record_type VARCHAR(20) NOT NULL, -- '1RM', 'volume', 'reps'
            value DECIMAL(10,2) NOT NULL,
            reps INTEGER,
            weight DECIMAL(6,2),
            weight_unit VARCHAR(5),
            workout_id INTEGER,
            achieved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE,
            FOREIGN KEY (workout_id) REFERENCES workouts (id) ON DELETE SET NULL
          );

          CREATE TABLE IF NOT EXISTS user_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            rest_timer_enabled BOOLEAN DEFAULT TRUE,
            default_rest_time INTEGER DEFAULT 60,
            auto_start_timer BOOLEAN DEFAULT TRUE,
            sound_enabled BOOLEAN DEFAULT TRUE,
            vibration_enabled BOOLEAN DEFAULT TRUE,
            dark_mode BOOLEAN DEFAULT FALSE,
            backup_enabled BOOLEAN DEFAULT TRUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
          );

          -- Indexes for better performance
          CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, start_time);
          CREATE INDEX IF NOT EXISTS idx_workout_sets_workout ON workout_sets(workout_id);
          CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise ON workout_sets(exercise_id);
          CREATE INDEX IF NOT EXISTS idx_personal_records_user_exercise ON personal_records(user_id, exercise_id);
          CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
          CREATE INDEX IF NOT EXISTS idx_exercises_muscle ON exercises(primary_muscle);
        `);

        // Check if exercises exist and insert comprehensive data if needed
        const exerciseCount = await database.getFirstAsync('SELECT COUNT(*) as count FROM exercises WHERE is_custom = FALSE');
        if ((exerciseCount as any)?.count === 0) {
          console.log('Inserting comprehensive exercise library...');
          await insertComprehensiveExercises(database);
        }

        console.log('Database initialized successfully');
        setDb(database);
        setIsReady(true);
        setError(null);
      } catch (error) {
        console.error('Database initialization error:', error);
        setError(error instanceof Error ? error.message : 'Database initialization failed');
        setIsReady(false);
      }
    };

    initDatabase();
  }, []);

  return (
    <DatabaseContext.Provider value={{ db, isReady, error }}>
      {children}
    </DatabaseContext.Provider>
  );
};

const insertComprehensiveExercises = async (db: SQLite.SQLiteDatabase) => {
  const exercises = [
    // CHEST EXERCISES
    { name: 'Barbell Bench Press', category: 'Chest', primary_muscle: 'Chest', secondary_muscles: 'Triceps,Shoulders', equipment: 'Barbell', difficulty_level: 3, instructions: 'Lie on bench, grip bar shoulder-width apart, lower to chest, press up explosively' },
    { name: 'Incline Barbell Press', category: 'Chest', primary_muscle: 'Upper Chest', secondary_muscles: 'Triceps,Shoulders', equipment: 'Barbell', difficulty_level: 3, instructions: 'Incline bench 30-45 degrees, press barbell from chest to arms extended' },
    { name: 'Decline Barbell Press', category: 'Chest', primary_muscle: 'Lower Chest', secondary_muscles: 'Triceps,Shoulders', equipment: 'Barbell', difficulty_level: 3, instructions: 'Decline bench, press barbell from chest focusing on lower pecs' },
    { name: 'Dumbbell Bench Press', category: 'Chest', primary_muscle: 'Chest', secondary_muscles: 'Triceps,Shoulders', equipment: 'Dumbbells', difficulty_level: 3, instructions: 'Lie on bench with dumbbells, press up and together' },
    { name: 'Incline Dumbbell Press', category: 'Chest', primary_muscle: 'Upper Chest', secondary_muscles: 'Triceps,Shoulders', equipment: 'Dumbbells', difficulty_level: 3, instructions: 'Incline bench, press dumbbells up and together' },
    { name: 'Dumbbell Flyes', category: 'Chest', primary_muscle: 'Chest', secondary_muscles: 'Shoulders', equipment: 'Dumbbells', difficulty_level: 3, instructions: 'Lie on bench, arms wide, bring dumbbells together over chest in arc motion' },
    { name: 'Incline Dumbbell Flyes', category: 'Chest', primary_muscle: 'Upper Chest', secondary_muscles: 'Shoulders', equipment: 'Dumbbells', difficulty_level: 3, instructions: 'Incline bench, perform flye motion targeting upper chest' },
    { name: 'Push-ups', category: 'Chest', primary_muscle: 'Chest', secondary_muscles: 'Triceps,Shoulders,Core', equipment: 'Bodyweight', difficulty_level: 2, instructions: 'Start in plank position, lower body to ground, push back up' },
    { name: 'Diamond Push-ups', category: 'Chest', primary_muscle: 'Triceps', secondary_muscles: 'Chest,Shoulders', equipment: 'Bodyweight', difficulty_level: 4, instructions: 'Push-up position with hands forming diamond shape' },
    { name: 'Wide Grip Push-ups', category: 'Chest', primary_muscle: 'Chest', secondary_muscles: 'Triceps,Shoulders', equipment: 'Bodyweight', difficulty_level: 2, instructions: 'Push-ups with hands wider than shoulders' },
    { name: 'Cable Chest Flyes', category: 'Chest', primary_muscle: 'Chest', secondary_muscles: 'Shoulders', equipment: 'Cable Machine', difficulty_level: 2, instructions: 'Standing cable flyes, bring handles together in arc motion' },
    { name: 'Chest Dips', category: 'Chest', primary_muscle: 'Lower Chest', secondary_muscles: 'Triceps,Shoulders', equipment: 'Dip Station', difficulty_level: 4, instructions: 'Lean forward on dips to target chest, lower and press up' },

    // BACK EXERCISES
    { name: 'Deadlifts', category: 'Back', primary_muscle: 'Lower Back', secondary_muscles: 'Hamstrings,Glutes,Traps', equipment: 'Barbell', difficulty_level: 4, instructions: 'Stand over bar, bend at hips and knees, lift bar by extending hips and knees' },
    { name: 'Romanian Deadlifts', category: 'Back', primary_muscle: 'Hamstrings', secondary_muscles: 'Lower Back,Glutes', equipment: 'Barbell', difficulty_level: 3, instructions: 'Keep legs straighter, hinge at hips, lower bar to mid-shin' },
    { name: 'Sumo Deadlifts', category: 'Back', primary_muscle: 'Lower Back', secondary_muscles: 'Hamstrings,Glutes,Quads', equipment: 'Barbell', difficulty_level: 4, instructions: 'Wide stance, toes out, deadlift with upright torso' },
    { name: 'Pull-ups', category: 'Back', primary_muscle: 'Lats', secondary_muscles: 'Biceps,Rhomboids,Rear Delts', equipment: 'Pull-up Bar', difficulty_level: 4, instructions: 'Hang from bar, pull body up until chin over bar, lower slowly' },
    { name: 'Chin-ups', category: 'Back', primary_muscle: 'Lats', secondary_muscles: 'Biceps,Rhomboids', equipment: 'Pull-up Bar', difficulty_level: 4, instructions: 'Underhand grip pull-ups, emphasizes biceps more' },
    { name: 'Wide Grip Pull-ups', category: 'Back', primary_muscle: 'Lats', secondary_muscles: 'Rhomboids,Rear Delts', equipment: 'Pull-up Bar', difficulty_level: 5, instructions: 'Wide overhand grip, focus on lat width' },
    { name: 'Bent-over Barbell Row', category: 'Back', primary_muscle: 'Lats', secondary_muscles: 'Rhomboids,Biceps,Rear Delts', equipment: 'Barbell', difficulty_level: 3, instructions: 'Bend over with barbell, pull to lower chest, squeeze shoulder blades' },
    { name: 'T-Bar Row', category: 'Back', primary_muscle: 'Lats', secondary_muscles: 'Rhomboids,Biceps', equipment: 'T-Bar', difficulty_level: 3, instructions: 'Straddle T-bar, pull handle to chest' },
    { name: 'Dumbbell Rows', category: 'Back', primary_muscle: 'Lats', secondary_muscles: 'Rhomboids,Biceps,Rear Delts', equipment: 'Dumbbells', difficulty_level: 2, instructions: 'One arm on bench, row dumbbell to hip' },
    { name: 'Seated Cable Row', category: 'Back', primary_muscle: 'Lats', secondary_muscles: 'Rhomboids,Biceps,Rear Delts', equipment: 'Cable Machine', difficulty_level: 2, instructions: 'Seated, pull cable handle to abdomen, squeeze shoulder blades' },
    { name: 'Lat Pulldown', category: 'Back', primary_muscle: 'Lats', secondary_muscles: 'Biceps,Rhomboids', equipment: 'Cable Machine', difficulty_level: 2, instructions: 'Seated, pull bar down to chest, control the weight up' },
    { name: 'Face Pulls', category: 'Back', primary_muscle: 'Rear Delts', secondary_muscles: 'Rhomboids,Traps', equipment: 'Cable Machine', difficulty_level: 2, instructions: 'Pull rope to face level, separate handles at face' },

    // LEGS EXERCISES
    { name: 'Back Squats', category: 'Legs', primary_muscle: 'Quadriceps', secondary_muscles: 'Glutes,Hamstrings,Core', equipment: 'Barbell', difficulty_level: 3, instructions: 'Bar on upper back, squat down keeping chest up, drive through heels' },
    { name: 'Front Squats', category: 'Legs', primary_muscle: 'Quadriceps', secondary_muscles: 'Glutes,Core', equipment: 'Barbell', difficulty_level: 4, instructions: 'Bar on front shoulders, squat keeping torso upright' },
    { name: 'Goblet Squats', category: 'Legs', primary_muscle: 'Quadriceps', secondary_muscles: 'Glutes,Core', equipment: 'Dumbbell', difficulty_level: 2, instructions: 'Hold dumbbell at chest, squat down keeping chest up' },
    { name: 'Bulgarian Split Squats', category: 'Legs', primary_muscle: 'Quadriceps', secondary_muscles: 'Glutes,Hamstrings', equipment: 'Dumbbells', difficulty_level: 3, instructions: 'Rear foot elevated, lunge down on front leg' },
    { name: 'Walking Lunges', category: 'Legs', primary_muscle: 'Quadriceps', secondary_muscles: 'Glutes,Hamstrings', equipment: 'Dumbbells', difficulty_level: 2, instructions: 'Step forward into lunge, alternate legs walking forward' },
    { name: 'Reverse Lunges', category: 'Legs', primary_muscle: 'Quadriceps', secondary_muscles: 'Glutes,Hamstrings', equipment: 'Dumbbells', difficulty_level: 2, instructions: 'Step backward into lunge, return to start' },
    { name: 'Leg Press', category: 'Legs', primary_muscle: 'Quadriceps', secondary_muscles: 'Glutes,Hamstrings', equipment: 'Machine', difficulty_level: 2, instructions: 'Seated, press weight with legs, control the descent' },
    { name: 'Leg Curls', category: 'Legs', primary_muscle: 'Hamstrings', secondary_muscles: '', equipment: 'Machine', difficulty_level: 2, instructions: 'Lying or seated, curl heels toward glutes' },
    { name: 'Leg Extensions', category: 'Legs', primary_muscle: 'Quadriceps', secondary_muscles: '', equipment: 'Machine', difficulty_level: 2, instructions: 'Seated, extend legs against resistance' },
    { name: 'Calf Raises', category: 'Legs', primary_muscle: 'Calves', secondary_muscles: '', equipment: 'Dumbbells', difficulty_level: 1, instructions: 'Rise up on toes, hold, lower slowly' },
    { name: 'Seated Calf Raises', category: 'Legs', primary_muscle: 'Calves', secondary_muscles: '', equipment: 'Machine', difficulty_level: 1, instructions: 'Seated, raise heels against resistance' },
    { name: 'Hip Thrusts', category: 'Legs', primary_muscle: 'Glutes', secondary_muscles: 'Hamstrings', equipment: 'Barbell', difficulty_level: 2, instructions: 'Shoulders on bench, thrust hips up with barbell' },

    // ARMS EXERCISES
    { name: 'Barbell Curls', category: 'Arms', primary_muscle: 'Biceps', secondary_muscles: 'Forearms', equipment: 'Barbell', difficulty_level: 2, instructions: 'Standing, curl barbell to chest, control descent' },
    { name: 'Dumbbell Curls', category: 'Arms', primary_muscle: 'Biceps', secondary_muscles: 'Forearms', equipment: 'Dumbbells', difficulty_level: 2, instructions: 'Alternate or simultaneous dumbbell curls' },
    { name: 'Hammer Curls', category: 'Arms', primary_muscle: 'Biceps', secondary_muscles: 'Forearms', equipment: 'Dumbbells', difficulty_level: 2, instructions: 'Neutral grip, curl dumbbells to shoulders' },
    { name: 'Preacher Curls', category: 'Arms', primary_muscle: 'Biceps', secondary_muscles: 'Forearms', equipment: 'Barbell', difficulty_level: 3, instructions: 'Arms on preacher bench, curl barbell up' },
    { name: 'Cable Curls', category: 'Arms', primary_muscle: 'Biceps', secondary_muscles: 'Forearms', equipment: 'Cable Machine', difficulty_level: 2, instructions: 'Standing cable curls with various attachments' },
    { name: 'Close Grip Bench Press', category: 'Arms', primary_muscle: 'Triceps', secondary_muscles: 'Chest,Shoulders', equipment: 'Barbell', difficulty_level: 3, instructions: 'Narrow grip bench press, elbows close to body' },
    { name: 'Tricep Dips', category: 'Arms', primary_muscle: 'Triceps', secondary_muscles: 'Shoulders,Chest', equipment: 'Dip Station', difficulty_level: 3, instructions: 'Upright dips focusing on triceps, lower and press up' },
    { name: 'Overhead Tricep Extension', category: 'Arms', primary_muscle: 'Triceps', secondary_muscles: '', equipment: 'Dumbbells', difficulty_level: 2, instructions: 'Overhead dumbbell extension, lower behind head' },
    { name: 'Tricep Pushdowns', category: 'Arms', primary_muscle: 'Triceps', secondary_muscles: '', equipment: 'Cable Machine', difficulty_level: 2, instructions: 'Cable pushdowns with rope or bar attachment' },
    { name: 'Overhead Press', category: 'Arms', primary_muscle: 'Shoulders', secondary_muscles: 'Triceps,Core', equipment: 'Barbell', difficulty_level: 3, instructions: 'Press barbell overhead from shoulder height' },
    { name: 'Dumbbell Shoulder Press', category: 'Arms', primary_muscle: 'Shoulders', secondary_muscles: 'Triceps', equipment: 'Dumbbells', difficulty_level: 2, instructions: 'Press dumbbells overhead from shoulder height' },
    { name: 'Lateral Raises', category: 'Arms', primary_muscle: 'Shoulders', secondary_muscles: '', equipment: 'Dumbbells', difficulty_level: 2, instructions: 'Raise dumbbells to sides until parallel to floor' },
    { name: 'Front Raises', category: 'Arms', primary_muscle: 'Shoulders', secondary_muscles: '', equipment: 'Dumbbells', difficulty_level: 2, instructions: 'Raise dumbbells to front until parallel to floor' },
    { name: 'Rear Delt Flyes', category: 'Arms', primary_muscle: 'Rear Delts', secondary_muscles: '', equipment: 'Dumbbells', difficulty_level: 2, instructions: 'Bent over, raise dumbbells to sides' },

    // CORE EXERCISES
    { name: 'Plank', category: 'Core', primary_muscle: 'Core', secondary_muscles: 'Shoulders,Glutes', equipment: 'Bodyweight', difficulty_level: 2, instructions: 'Hold plank position, keep body straight, engage core' },
    { name: 'Side Plank', category: 'Core', primary_muscle: 'Obliques', secondary_muscles: 'Core,Shoulders', equipment: 'Bodyweight', difficulty_level: 3, instructions: 'Side plank position, hold body straight' },
    { name: 'Crunches', category: 'Core', primary_muscle: 'Abs', secondary_muscles: '', equipment: 'Bodyweight', difficulty_level: 1, instructions: 'Lie on back, curl shoulders toward knees' },
    { name: 'Bicycle Crunches', category: 'Core', primary_muscle: 'Abs', secondary_muscles: 'Obliques', equipment: 'Bodyweight', difficulty_level: 2, instructions: 'Alternate elbow to opposite knee in cycling motion' },
    { name: 'Russian Twists', category: 'Core', primary_muscle: 'Obliques', secondary_muscles: 'Abs', equipment: 'Bodyweight', difficulty_level: 2, instructions: 'Sit with knees bent, twist torso side to side' },
    { name: 'Mountain Climbers', category: 'Core', primary_muscle: 'Core', secondary_muscles: 'Shoulders,Legs', equipment: 'Bodyweight', difficulty_level: 3, instructions: 'Plank position, alternate bringing knees to chest rapidly' },
    { name: 'Dead Bug', category: 'Core', primary_muscle: 'Core', secondary_muscles: '', equipment: 'Bodyweight', difficulty_level: 2, instructions: 'Lying on back, alternate opposite arm and leg extensions' },
    { name: 'Hanging Leg Raises', category: 'Core', primary_muscle: 'Lower Abs', secondary_muscles: 'Hip Flexors', equipment: 'Pull-up Bar', difficulty_level: 4, instructions: 'Hang from bar, raise legs to 90 degrees' },
    { name: 'Ab Wheel Rollouts', category: 'Core', primary_muscle: 'Core', secondary_muscles: 'Shoulders', equipment: 'Ab Wheel', difficulty_level: 4, instructions: 'Roll wheel forward, return to start position' },
    { name: 'Wood Chops', category: 'Core', primary_muscle: 'Obliques', secondary_muscles: 'Core,Shoulders', equipment: 'Cable Machine', difficulty_level: 2, instructions: 'Diagonal chopping motion across body' },

    // CARDIO EXERCISES
    { name: 'Burpees', category: 'Cardio', primary_muscle: 'Full Body', secondary_muscles: '', equipment: 'Bodyweight', difficulty_level: 4, instructions: 'Squat, jump back to plank, push-up, jump forward, jump up' },
    { name: 'Jumping Jacks', category: 'Cardio', primary_muscle: 'Full Body', secondary_muscles: '', equipment: 'Bodyweight', difficulty_level: 1, instructions: 'Jump feet apart while raising arms overhead' },
    { name: 'High Knees', category: 'Cardio', primary_muscle: 'Legs', secondary_muscles: 'Core', equipment: 'Bodyweight', difficulty_level: 2, instructions: 'Run in place bringing knees to chest level' },
    { name: 'Jump Rope', category: 'Cardio', primary_muscle: 'Calves', secondary_muscles: 'Shoulders,Core', equipment: 'Jump Rope', difficulty_level: 2, instructions: 'Jump over rope with both feet' },
    { name: 'Box Jumps', category: 'Cardio', primary_muscle: 'Legs', secondary_muscles: 'Glutes', equipment: 'Plyometric Box', difficulty_level: 3, instructions: 'Jump onto box, step down carefully' },
  ];

  try {
    for (const exercise of exercises) {
      await db.runAsync(
        'INSERT INTO exercises (name, category, primary_muscle, secondary_muscles, equipment, difficulty_level, instructions, is_custom) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [exercise.name, exercise.category, exercise.primary_muscle, exercise.secondary_muscles, exercise.equipment, exercise.difficulty_level, exercise.instructions, false]
      );
    }
    console.log('Comprehensive exercise library inserted successfully');
  } catch (error) {
    console.error('Error inserting comprehensive exercises:', error);
    throw error;
  }
};