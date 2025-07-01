import { useState, useCallback } from 'react';

interface PopupAction {
  text: string;
  onPress?: () => void;
  primary?: boolean;
  style?: any;
}

interface PopupConfig {
  visible: boolean;
  type: 'error' | 'success' | 'warning' | 'info';
  title: string;
  message: string;
  actions: PopupAction[];
  autoClose: boolean;
  position: 'top' | 'center' | 'bottom';
  autoCloseDelay?: number;
}

export const usePopup = () => {
  const [popupConfig, setPopupConfig] = useState<PopupConfig>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    actions: [],
    autoClose: true,
    position: 'center',
  });

  const showPopup = useCallback((config: Partial<PopupConfig>) => {
    setPopupConfig({
      visible: true,
      type: 'info',
      title: '',
      message: '',
      actions: [],
      autoClose: true,
      position: 'center',
      ...config,
    });
  }, []);

  const hidePopup = useCallback(() => {
    setPopupConfig(prev => ({ ...prev, visible: false }));
  }, []);

  // Convenience methods
  const showError = useCallback((title: string, message: string, actions: PopupAction[] = []) => {
    showPopup({
      type: 'error',
      title,
      message,
      actions,
      autoClose: false,
    });
  }, [showPopup]);

  const showSuccess = useCallback((title: string, message: string, autoClose = true) => {
    showPopup({
      type: 'success',
      title,
      message,
      autoClose,
      autoCloseDelay: 2000,
    });
  }, [showPopup]);

  const showWarning = useCallback((title: string, message: string, actions: PopupAction[] = []) => {
    showPopup({
      type: 'warning',
      title,
      message,
      actions,
      autoClose: false,
    });
  }, [showPopup]);

  const showInfo = useCallback((title: string, message: string, autoClose = true) => {
    showPopup({
      type: 'info',
      title,
      message,
      autoClose,
    });
  }, [showPopup]);

  const showConfirmation = useCallback((title: string, message: string, onConfirm: () => void, onCancel?: () => void) => {
    showPopup({
      type: 'warning',
      title,
      message,
      actions: [
        {
          text: 'Cancel',
          onPress: onCancel,
        },
        {
          text: 'Confirm',
          onPress: onConfirm,
          primary: true,
        },
      ],
      autoClose: false,
    });
  }, [showPopup]);

  return {
    popupConfig,
    showPopup,
    hidePopup,
    showError,
    showSuccess,
    showWarning,
    showInfo,
    showConfirmation,
  };
};