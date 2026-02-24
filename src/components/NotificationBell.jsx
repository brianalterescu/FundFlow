
 // Bell icon componet with unread badge
 // Displays notification count and toggles dropdown
 
import React, { useState } from 'react';
import { useNotificationContext } from '../context/NotificationContext';
import NotificationList from './NotificationList';
// import '../styles/notifications.css';


const NotificationBell = () => {
  const { notifications, unreadCount, loading } = useNotificationContext();
  const [isOpen, setIsOpen] = useState(false);

  // Toggle dropdown
  const handleToggle = () => setIsOpen(!isOpen);

  // Close dropdown
  const handleClose = () => setIsOpen(false);

  return (
    <div className="notification-bell-container">
      {/* Bell Icon Button */}
      <button
        className="notification-bell-button"
        onClick={handleToggle}
        aria-label="Notifications"
        aria-expanded={isOpen}
        // disabled={loading} // optional: disable while loading
      >
        {/* Bell SVG Icon */}
        <svg
          className="notification-bell-icon"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="notification-badge" aria-label={`${unreadCount} unread notifications`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div className="notification-overlay" onClick={handleClose} aria-hidden="true" />

          {/* Dropdown */}
          <div className="notification-dropdown">
            {/* Pass notifications from context to NotificationList */}
            <NotificationList notifications={notifications} onClose={handleClose} />
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
