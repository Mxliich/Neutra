import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { Play, Pause, RotateCcw, Heart } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const circleRadius = 120;
const circleCircumference = 2 * Math.PI * circleRadius;

export default function RelaxScreen() {
  const [selectedTime, setSelectedTime] = useState(5); // minutes
  const [timeRemaining, setTimeRemaining] = useState(5 * 60); // seconds
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const presetTimes = [
    { label: '5 min', value: 5 },
    { label: '10 min', value: 10 },
    { label: '15 min', value: 15 },
    { label: '30 min', value: 30 },
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsComplete(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, timeRemaining]);

  const handleStart = () => {
    if (timeRemaining === 0) {
      setTimeRemaining(selectedTime * 60);
      setIsComplete(false);
    }
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeRemaining(selectedTime * 60);
    setIsComplete(false);
  };

  const handleTimeSelect = (minutes: number) => {
    if (!isRunning) {
      setSelectedTime(minutes);
      setTimeRemaining(minutes * 60);
      setIsComplete(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((selectedTime * 60 - timeRemaining) / (selectedTime * 60)) * circleCircumference;

  return (
    <LinearGradient
      colors={['#DDA0DD', '#E6B3E6', '#F0C4F0']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <Image 
            source={{ uri: 'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=800' }}
            style={styles.heroImage}
          />
          <View style={styles.heroOverlay}>
            <Heart size={32} color="#FFFFFF" />
            <Text style={styles.heroTitle}>Relax & Recover</Text>
            <Text style={styles.heroSubtitle}>Take a moment to breathe and reset</Text>
          </View>
        </View>

        <View style={styles.timerContainer}>
          <View style={styles.circleContainer}>
            <Svg width={circleRadius * 2 + 20} height={circleRadius * 2 + 20}>
              {/* Background circle */}
              <Circle
                cx={circleRadius + 10}
                cy={circleRadius + 10}
                r={circleRadius}
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth="8"
                fill="transparent"
              />
              {/* Progress circle */}
              <Circle
                cx={circleRadius + 10}
                cy={circleRadius + 10}
                r={circleRadius}
                stroke="#A8E6CF"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={circleCircumference}
                strokeDashoffset={circleCircumference - progress}
                strokeLinecap="round"
                transform={`rotate(-90 ${circleRadius + 10} ${circleRadius + 10})`}
              />
            </Svg>
            <View style={styles.timerText}>
              <Text style={styles.timeDisplay}>{formatTime(timeRemaining)}</Text>
              {isComplete && (
                <Text style={styles.completeText}>Complete! 🎉</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={[styles.controlButton, styles.resetButton]}
            onPress={handleReset}
          >
            <RotateCcw size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.playButton]}
            onPress={handleStart}
          >
            <LinearGradient
              colors={['#A8E6CF', '#4ECDC4']}
              style={styles.playButtonGradient}
            >
              {isRunning ? (
                <Pause size={32} color="#FFFFFF" />
              ) : (
                <Play size={32} color="#FFFFFF" />
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.spacer} />
        </View>

        <View style={styles.presetsContainer}>
          <Text style={styles.presetsTitle}>Quick Select</Text>
          <View style={styles.presetButtons}>
            {presetTimes.map((preset) => (
              <TouchableOpacity
                key={preset.value}
                style={[
                  styles.presetButton,
                  selectedTime === preset.value && styles.presetButtonSelected,
                  isRunning && styles.presetButtonDisabled,
                ]}
                onPress={() => handleTimeSelect(preset.value)}
                disabled={isRunning}
              >
                <Text
                  style={[
                    styles.presetButtonText,
                    selectedTime === preset.value && styles.presetButtonTextSelected,
                  ]}
                >
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.motivationContainer}>
          <Text style={styles.motivationText}>
            {isRunning
              ? "Focus on your breath... in and out 🌸"
              : isComplete
              ? "Well done! You've earned this rest 💪"
              : "Ready to relax and recharge? 🧘‍♀️"}
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 16,
  },
  heroContainer: {
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 16,
    marginBottom: 32,
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 20,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
  },
  timerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeDisplay: {
    fontSize: 48,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  completeText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginTop: 8,
    textAlign: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  resetButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginRight: 32,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  playButtonGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spacer: {
    width: 64,
    marginLeft: 32,
  },
  presetsContainer: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  presetsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  presetButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  presetButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginHorizontal: 8,
    marginVertical: 4,
  },
  presetButtonSelected: {
    backgroundColor: '#A8E6CF',
  },
  presetButtonDisabled: {
    opacity: 0.5,
  },
  presetButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  presetButtonTextSelected: {
    color: '#FFFFFF',
  },
  motivationContainer: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  motivationText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
  },
});