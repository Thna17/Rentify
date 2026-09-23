import { useState } from "react";

export const useNotification = () => {
  const [showNotification, setShowNotification] = useState(false);
  
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('success');

  const showSuccess = (message) => {
    setNotificationMessage(message);
    setNotificationType('success');
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const showError = (message) => {
    setNotificationMessage(message);
    setNotificationType('error');
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  return {
    showNotification,
    notificationMessage,
    notificationType,
    showSuccess,
    showError,
  };
};

export default useNotification;