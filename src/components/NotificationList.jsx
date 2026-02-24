import React from 'react';
import { Link } from 'react-router-dom';
// import '../styles/notifications.css';

const NotificationList = ({ notifications, onClose }) => {
  if (!notifications || notifications.length === 0) {
    return <div className="notification-list-empty">No notifications</div>;
  }

  return (
    <ul className="notification-list">
      {notifications.map((notif) => (
        <li
          key={notif.id}
          className="notification-item"
          onClick={onClose} // closes dropdown on click
        >
          <Link
            to={notif.link || '/'}   // fallback if link is missing
            onClick={onClose}        // close dropdown on click
            style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
          >
            {notif.message}
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default NotificationList;
