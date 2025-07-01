import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SQLite from 'expo-sqlite';

interface DatabaseContextType {
  db: SQLite.SQLiteDatabase | null;
  isReady: boolean;
}

const DatabaseContext = createContext<DatabaseContextType>({
  db: null,
  isReady: false,
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

  useEffect(() => {
    const initDatabase = async () => {
      try {
        const database = await SQLite.openDatabaseAsync('gym_logger.db');
        
        // Create tables
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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS workouts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name VARCHAR(100),
            start_time DATETIME NOT NULL,
            end_time DATETIME,
            duration_seconds INTEGER,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
          );

          CREATE TABLE IF NOT EXISTS workout_sets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workout_id INTEGER NOT NULL,
            exercise_id INTEGER NOT NULL,
            set_number INTEGER NOT NULL,
            reps INTEGER,
            weight DECIMAL(6,2),
            weight_unit VARCHAR(5),
            completed BOOLEAN DEFAULT FALSE,
            rest_time_seconds INTEGER,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workout_id) REFERENCES workouts (id),
            FOREIGN KEY (exercise_id) REFERENCES exercises (id)
          );
        `);

        // Insert sample exercises
        const exerciseExists = await database.getFirstAsync('SELECT COUNT(*) as count FROM exercises');
        if ((exerciseExists as any).count === 0) {
          await insertSampleExercises(database);
        }

        setDb(database);
        setIsReady(true);
      } catch (error) {
        console.error('Database initialization error:', error);
      }
    };

    initDatabase();
  }, []);

  return (
    <DatabaseContext.Provider value={{ db, isReady }}>
      {children}
    </DatabaseContext.Provider>
  );
};

const insertSampleExercises = async (db: SQLite.SQLiteDatabase) => {
  const exercises = [
    // Chest
    { name: 'Bench Press', category: 'Chest', primary_muscle: 'Chest', secondary_muscles: 'Triceps,Shoulders', equipment: 'Barbell', difficulty_level: 3, instructions: 'Lie on bench, grip bar shoulder-width apart, lower to chest, press up' },
    { name: 'Push-ups', category: 'Chest', primary_muscle: 'Chest', secondary_muscles: 'Triceps,Shoulders', equipment: 'Bodyweight', difficulty_level: 2, instructions: 'Start in plank position, lower body to ground, push back up' },
    { name: 'Dumbbell Fly', category: 'Chest', primary_muscle: 'Chest', secondary_muscles: 'Shoulders', equipment: 'Dumbbells', difficulty_level: 3, instructions: 'Lie on bench, arms wide, bring dumbbells together over chest' },
    
    // Back
    { name: 'Pull-ups', category: 'Back', primary_muscle: 'Lats', secondary_muscles: 'Biceps,Rhomboids', equipment: 'Pull-up Bar', difficulty_level: 4, instructions: 'Hang from bar, pull body up until chin over bar, lower slowly' },
    { name: 'Bent-over Row', category: 'Back', primary_muscle: 'Lats', secondary_muscles: 'Rhomboids,Biceps', equipment: 'Barbell', difficulty_level: 3, instructions: 'Bend over with barbell, pull to lower chest, squeeze shoulder blades' },
    { name: 'Lat Pulldown', category: 'Back', primary_muscle: 'Lats', secondary_muscles: 'Biceps,Rhomboids', equipment: 'Cable Machine', difficulty_level: 2, instructions: 'Seated, pull bar down to chest, control the weight up' },
    
    // Legs
    { name: 'Squats', category: 'Legs', primary_muscle: 'Quadriceps', secondary_muscles: 'Glutes,Hamstrings', equipment: 'Barbell', difficulty_level: 3, instructions: 'Stand with feet shoulder-width, lower hips back and down, drive through heels' },
    { name: 'Deadlifts', category: 'Legs', primary_muscle: 'Hamstrings', secondary_muscles: 'Glutes,Lower Back', equipment: 'Barbell', difficulty_level: 4, instructions: 'Stand over bar, bend at hips and knees, lift bar by extending hips and knees' },
    { name: 'Lunges', category: 'Legs', primary_muscle: 'Quadriceps', secondary_muscles: 'Glutes,Hamstrings', equipment: 'Dumbbells', difficulty_level: 2, instructions: 'Step forward, lower back knee, push back to start' },
    
    // Arms
    { name: 'Bicep Curls', category: 'Arms', primary_muscle: 'Biceps', secondary_muscles: '', equipment: 'Dumbbells', difficulty_level: 2, instructions: 'Hold dumbbells at sides, curl up to shoulders, lower slowly' },
    { name: 'Tricep Dips', category: 'Arms', primary_muscle: 'Triceps', secondary_muscles: 'Shoulders', equipment: 'Bench', difficulty_level: 3, instructions: 'Hands on bench, lower body down, push back up' },
    { name: 'Overhead Press', category: 'Arms', primary_muscle: 'Shoulders', secondary_muscles: 'Triceps', equipment: 'Dumbbells', difficulty_level: 3, instructions: 'Press dumbbells overhead from shoulder height' },
    
    // Core
    { name: 'Plank', category: 'Core', primary_muscle: 'Core', secondary_muscles: 'Shoulders,Glutes', equipment: 'Bodyweight', difficulty_level: 2, instructions: 'Hold plank position, keep body straight, engage core' },
    { name: 'Crunches', category: 'Core', primary_muscle: 'Abs', secondary_muscles: '', equipment: 'Bodyweight', difficulty_level: 1, instructions: 'Lie on back, curl shoulders toward knees' },
    { name: 'Russian Twists', category: 'Core', primary_muscle: 'Obliques', secondary_muscles: 'Abs', equipment: 'Bodyweight', difficulty_level: 2, instructions: 'Sit with knees bent, twist torso side to side' }
  ];

  for (const exercise of exercises) {
    await db.runAsync(
      'INSERT INTO exercises (name, category, primary_muscle, secondary_muscles, equipment, difficulty_level, instructions) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [exercise.name, exercise.category, exercise.primary_muscle, exercise.secondary_muscles, exercise.equipment, exercise.difficulty_level, exercise.instructions]
    );
  }
};