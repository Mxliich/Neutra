// Fitness-specific popup messages
export const fitnessPopupMessages = {
  // Workout Completion
  workoutComplete: {
    title: 'Workout Complete! 💪',
    messages: [
      'Amazing work! You\'ve crushed another workout session.',
      'Fantastic job! Your dedication is paying off.',
      'Outstanding effort! You\'re building strength every day.',
      'Incredible work! You\'ve earned this victory.',
      'Awesome session! You\'re unstoppable.',
    ],
  },

  // Personal Records
  personalRecord: {
    title: 'New Personal Record! 🏆',
    messages: [
      'You\'ve just set a new personal best! Keep pushing those limits.',
      'Incredible! You\'ve broken your previous record.',
      'Amazing achievement! You\'re stronger than ever.',
      'Outstanding! You\'ve reached a new milestone.',
      'Phenomenal! You\'ve surpassed your own expectations.',
    ],
  },

  // Motivation Boosts
  motivation: {
    title: 'Keep Going! 🔥',
    messages: [
      'Every rep counts. You\'re building greatness.',
      'Your consistency is your superpower.',
      'Today\'s effort is tomorrow\'s strength.',
      'You\'re not just working out, you\'re building character.',
      'Progress, not perfection. You\'re doing amazing.',
    ],
  },

  // Rest Day Reminders
  restDay: {
    title: 'Rest Day Reminder 😴',
    messages: [
      'Your muscles grow during rest. Take the day to recover.',
      'Rest is not a sign of weakness, it\'s a sign of wisdom.',
      'Your body needs recovery to come back stronger.',
      'Active recovery today means better performance tomorrow.',
      'Listen to your body. Rest is part of the process.',
    ],
  },

  // Streak Celebrations
  streak: {
    title: 'Streak Master! 🔥',
    messages: [
      'days in a row! Your consistency is incredible.',
      'consecutive workouts! You\'re building an unbreakable habit.',
      'days strong! Your dedication is inspiring.',
      'workout streak! You\'re on fire.',
      'days of excellence! Keep the momentum going.',
    ],
  },

  // Errors and Warnings
  errors: {
    saveError: {
      title: 'Save Error',
      message: 'Unable to save your workout data. Please try again.',
    },
    networkError: {
      title: 'Connection Issue',
      message: 'Check your internet connection and try again.',
    },
    validationError: {
      title: 'Invalid Input',
      message: 'Please check your input and try again.',
    },
  },
};

// Helper function to get random motivational message
export const getRandomMotivationalMessage = (category: keyof typeof fitnessPopupMessages) => {
  const categoryData = fitnessPopupMessages[category];
  if (!categoryData || !('messages' in categoryData)) return '';
  
  const messages = categoryData.messages;
  return messages[Math.floor(Math.random() * messages.length)];
};

// Helper function to get streak message
export const getStreakMessage = (days: number) => {
  const messages = fitnessPopupMessages.streak.messages;
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];
  return `${days} ${randomMessage}`;
};