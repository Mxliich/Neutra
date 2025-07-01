import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Platform,
} from 'react-native';
import { Play, Pause, RotateCcw, X, Plus, Minus } from 'lucide-react-native';
import { useThemeColors } from '@/utils/colorSystem';
import { LinearGradient } from 'expo-linear-gradient';

interface RestTimerProps {
  visible: boolean;
  onClose: () => void;
  initialTime?: number; // in seconds
  onComplete?: () => void;
}

export default function RestTimer({ visible, onClose, initialTime = 60, onComplete }: RestTimerProps) {
  const colors = useThemeColors();
  const [timeRemaining, setTimeRemaining] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTime, setSelectedTime] = useState(initialTime);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const presetTimes = [30, 60, 90, 120, 180]; // seconds

  useEffect(() => {
    if (visible) {
      setTimeRemaining(selectedTime);
      setIsRunning(false);
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(scaleAnim, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            onComplete?.();
            // Trigger completion animation
            Animated.sequence([
              Animated.timing(pulseAnim, {
                toValue: 1.2,
                duration: 200,
                useNativeDriver: true,
              }),
              Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }),
            ]).start();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (timeRemaining === 0) {
      setTimeRemaining(selectedTime);
    }
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeRemaining(selectedTime);
  };

  const adjustTime = (delta: number) => {
    if (!isRunning) {
      const newTime = Math.max(10, selectedTime + delta);
      setSelectedTime(newTime);
      setTimeRemaining(newTime);
    }
  };

  const selectPresetTime = (time: number) => {
    if (!isRunning) {
      setSelectedTime(time);
      setTimeRemaining(time);
    }
  };

  const progress = selectedTime > 0 ? (selectedTime - timeRemaining) / selectedTime : 0;

  const styles = createStyles(colors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={[colors.surface, colors.background]}
            style={styles.gradient}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Rest Timer</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* Timer Display */}
            <Animated.View
              style={[
                styles.timerContainer,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <View style={styles.progressRing}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: colors.primary,
                      transform: [{ rotate: `${progress * 360}deg` }],
                    },
                  ]}
                />
                <View style={styles.timerInner}>
                  <Text style={[styles.timerText, { color: colors.text.primary }]}>
                    {formatTime(timeRemaining)}
                  </Text>
                  {timeRemaining === 0 && (
                    <Text style={[styles.completeText, { color: colors.success }]}>
                      Rest Complete! 🎉
                    </Text>
                  )}
                </View>
              </View>
            </Animated.View>

            {/* Time Adjustment */}
            <View style={styles.adjustmentContainer}>
              <TouchableOpacity
                style={[styles.adjustButton, { backgroundColor: colors.surface }]}
                onPress={() => adjustTime(-10)}
                disabled={isRunning}
              >
                <Minus size={20} color={colors.text.primary} />
              </TouchableOpacity>
              
              <Text style={[styles.adjustLabel, { color: colors.text.secondary }]}>
                Adjust Time
              </Text>
              
              <TouchableOpacity
                style={[styles.adjustButton, { backgroundColor: colors.surface }]}
                onPress={() => adjustTime(10)}
                disabled={isRunning}
              >
                <Plus size={20} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Preset Times */}
            <View style={styles.presetsContainer}>
              <Text style={[styles.presetsLabel, { color: colors.text.secondary }]}>
                Quick Select
              </Text>
              <View style={styles.presetButtons}>
                {presetTimes.map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.presetButton,
                      {
                        backgroundColor: selectedTime === time ? colors.primary : colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => selectPresetTime(time)}
                    disabled={isRunning}
                  >
                    <Text
                      style={[
                        styles.presetButtonText,
                        {
                          color: selectedTime === time ? colors.text.onPrimary : colors.text.primary,
                        },
                      ]}
                    >
                      {time < 60 ? `${time}s` : `${Math.floor(time / 60)}m`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Controls */}
            <View style={styles.controls}>
              <TouchableOpacity
                style={[styles.controlButton, { backgroundColor: colors.surface }]}
                onPress={handleReset}
              >
                <RotateCcw size={24} color={colors.text.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.playButton, { backgroundColor: colors.primary }]}
                onPress={handleStart}
              >
                {isRunning ? (
                  <Pause size={32} color={colors.text.onPrimary} />
                ) : (
                  <Play size={32} color={colors.text.onPrimary} />
                )}
              </TouchableOpacity>

              <View style={styles.spacer} />
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 350,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.shadow.color,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  gradient: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  progressRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    width: '50%',
    height: '100%',
    right: '50%',
    transformOrigin: 'right center',
  },
  timerInner: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timerText: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
  },
  completeText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginTop: 4,
  },
  adjustmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 16,
  },
  adjustButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  adjustLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  presetsContainer: {
    marginBottom: 32,
  },
  presetsLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginBottom: 12,
  },
  presetButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  presetButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  presetButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  spacer: {
    width: 56,
  },
});