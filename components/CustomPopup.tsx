import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  PanResponder,
} from 'react-native';
import { CircleAlert as AlertCircle, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Info, X } from 'lucide-react-native';
import { useThemeColors } from '@/utils/colorSystem';

const { width: screenWidth } = Dimensions.get('window');

interface PopupAction {
  text: string;
  onPress?: () => void;
  primary?: boolean;
  style?: any;
}

interface CustomPopupProps {
  visible: boolean;
  onClose: () => void;
  type?: 'error' | 'success' | 'warning' | 'info';
  title?: string;
  message?: string;
  actions?: PopupAction[];
  autoClose?: boolean;
  autoCloseDelay?: number;
  position?: 'top' | 'center' | 'bottom';
  swipeToClose?: boolean;
}

const CustomPopup: React.FC<CustomPopupProps> = ({
  visible,
  onClose,
  type = 'error',
  title,
  message,
  actions = [],
  autoClose = true,
  autoCloseDelay = 3000,
  position = 'center',
  swipeToClose = true,
}) => {
  const colors = useThemeColors();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  // Auto close timer
  useEffect(() => {
    if (visible && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [visible, autoClose, autoCloseDelay, onClose]);

  // Animation effects
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Swipe to close functionality
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return swipeToClose && Math.abs(gestureState.dy) > 10;
    },
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dy > 0) {
        slideAnim.setValue(1 - gestureState.dy / 200);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dy > 50) {
        onClose();
      } else {
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const getPopupStyles = () => {
    const baseStyles = {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      margin: 20,
      maxWidth: screenWidth - 40,
      elevation: 8,
      shadowColor: colors.shadow.color,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: colors.shadow.opacity,
      shadowRadius: 8,
    };

    switch (type) {
      case 'error':
        return {
          ...baseStyles,
          borderLeftWidth: 4,
          borderLeftColor: colors.error,
        };
      case 'success':
        return {
          ...baseStyles,
          borderLeftWidth: 4,
          borderLeftColor: colors.success,
        };
      case 'warning':
        return {
          ...baseStyles,
          borderLeftWidth: 4,
          borderLeftColor: colors.warning,
        };
      case 'info':
        return {
          ...baseStyles,
          borderLeftWidth: 4,
          borderLeftColor: colors.accent,
        };
      default:
        return baseStyles;
    }
  };

  const getIcon = () => {
    const iconProps = { size: 24, color: getIconColor() };
    
    switch (type) {
      case 'error': return <AlertCircle {...iconProps} />;
      case 'success': return <CheckCircle {...iconProps} />;
      case 'warning': return <AlertTriangle {...iconProps} />;
      case 'info': return <Info {...iconProps} />;
      default: return <AlertCircle {...iconProps} />;
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'error': return colors.error;
      case 'success': return colors.success;
      case 'warning': return colors.warning;
      case 'info': return colors.accent;
      default: return colors.text.secondary;
    }
  };

  const getPositionStyle = () => {
    switch (position) {
      case 'top':
        return { justifyContent: 'flex-start', paddingTop: 60 };
      case 'bottom':
        return { justifyContent: 'flex-end', paddingBottom: 60 };
      case 'center':
      default:
        return { justifyContent: 'center' };
    }
  };

  const getSlideTransform = () => {
    switch (position) {
      case 'top':
        return {
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-200, 0],
              }),
            },
          ],
        };
      case 'bottom':
        return {
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [200, 0],
              }),
            },
          ],
        };
      case 'center':
      default:
        return {
          transform: [
            {
              scale: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              }),
            },
          ],
        };
    }
  };

  const styles = createStyles(colors);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.overlay,
          getPositionStyle(),
          { opacity: fadeAnim },
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        
        <Animated.View
          style={[
            getPopupStyles(),
            getSlideTransform(),
          ]}
          {...(swipeToClose ? panResponder.panHandlers : {})}
        >
          {/* Header with icon and close button */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              {getIcon()}
            </View>
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <X size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {title && (
              <Text style={[styles.title, { color: colors.text.primary }]}>
                {title}
              </Text>
            )}
            
            {message && (
              <Text style={[styles.message, { color: colors.text.secondary }]}>
                {message}
              </Text>
            )}
          </View>

          {/* Actions */}
          {actions.length > 0 && (
            <View style={styles.actions}>
              {actions.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.actionButton,
                    action.primary && { backgroundColor: colors.primary },
                    action.style,
                  ]}
                  onPress={() => {
                    action.onPress && action.onPress();
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      styles.actionText,
                      action.primary
                        ? { color: colors.text.onPrimary }
                        : { color: colors.primary },
                    ]}
                  >
                    {action.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          {/* Progress bar for auto-close */}
          {autoClose && (
            <View style={styles.progressContainer}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    backgroundColor: getIconColor(),
                    width: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  progressContainer: {
    height: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 1,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 1,
  },
});

export default CustomPopup;