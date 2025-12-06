
import React, { createContext, useContext } from 'react';
// Import the custom hook that handles notifications
import { useNotifications } from '../hooks/useNotifications';

/*
  NotificationContext

  React context to share notification state and actions across the app.
  This allows any component wrapped in NotificationProvider to access notifications
  without prop drilling.
*/
const NotificationContext = createContext(undefined);


/*
  NotificationProvider

  React context provider component that wraps parts of the app where notifications
  are needed.  

  Props:
    - children: React components that will have access to the context
    - userId: ID of the current logged-in user (used to fetch notifications)
    - appData: Any additional app-specific data for in-app notifications

  Behavior:
    - Calls `useNotifications` to get notification state and actions
    - Passes this state into the context provider
*/
export const NotificationProvider = ({ children, userId, appData }) => {
  // Initialize the notifications hook
  const notificationState = useNotifications(userId, appData);

  // Provide the notification state to all children components
  return (
    <NotificationContext.Provider value={notificationState}>
      {children}
    </NotificationContext.Provider>
  );
};


/*
  useNotificationContext

  Custom hook for consuming the NotificationContext.

  Used in:
    const { notifications, unreadCount, markAllAsRead } = useNotificationContext();

  Throws an error if used outside a NotificationProvider.
*/
export const useNotificationContext = () => {
  const context = useContext(NotificationContext); // Access context

  if (context === undefined) {
    throw new Error(
      'useNotificationContext must be used within a NotificationProvider'
    );
  }

  return context; // Return notification state & actions
};


/*
  withNotifications
 
  Higher Order Component for injecting notification props into a component.
  Alternative to using the `useNotificationContext` hook directly.

  Usage:
    export default withNotifications(MyComponent);

  Props:
    - Component: React component to wrap
  Returns:
    - A new component with a `notifications` prop containing all notification state/actions
*/
export const withNotifications = (Component) => {
  return (props) => {
    const notifications = useNotificationContext(); // Get notification state
    return <Component {...props} notifications={notifications} />; // Inject as prop
  };
};
