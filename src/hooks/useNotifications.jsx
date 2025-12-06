import { useState, useEffect, useCallback, useMemo } from "react";

// Firebase Firestore functions for querying and updating data
import {
  doc,          
  getDoc,      
  updateDoc,    
  collection,  
  query,       
  where,       
  orderBy,     
  onSnapshot,   
} from "firebase/firestore";

//  Firestore instance
import { db } from "../firebaseConfig";

// A custom utility to compute in-app notifications
import { computeAllNotifications } from "../utils/NotificationLogic";

// Custom React hook to manage notifications for a user
export const useNotifications = (userId, appData = {}) => {
  //  Local state 
  const [notifications, setNotifications] = useState([]); // All notifications
  const [unreadCount, setUnreadCount] = useState(0);      // Number of unread notifications
  const [lastCheck, setLastCheck] = useState(null);       // Timestamp of last notification check
  const [loading, setLoading] = useState(true);           // Loading state
  const [error, setError] = useState(null);               // Error messages

  //  Memoize appData to prevent unnecessary recalculations 
  // Using JSON.stringify ensures changes in nested properties are detected
  const memoizedAppData = useMemo(() => appData, [JSON.stringify(appData)]);

  //  Fetch the last notification check timestamp for the user 
  const fetchLastCheckTimestamp = useCallback(async () => {
    if (!userId) return; // If no user ID, exit early

    try {
      const userDocRef = doc(db, "users", userId); // Reference the user document
      const userDoc = await getDoc(userDocRef);    // Fetch it once

      // Determine the last check time:
      // 1. Use the stored lastNotificationCheck
      // 2. Fallback to createdAt timestamp
      // 3. Fallback to 7 days ago
      const timestamp = userDoc.exists()
        ? userDoc.data().lastNotificationCheck?.toDate() ||
          userDoc.data().createdAt?.toDate() ||
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
        : new Date(); // If user doc doesn't exist, use current time

      setLastCheck(timestamp); // Store it in state
    } catch (err) {
      console.error("Error fetching last check:", err);
      setError(err.message);
      setLastCheck(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)); // fallback
    } finally {
      setLoading(false); // Done fetching
    }
  }, [userId]);

  //  Compute in-app notifications (not from Firestore) 
  const computeInAppNotifications = useCallback(() => {
    if (!lastCheck) return [];
    // computeAllNotifications compares appData vs lastCheck
    return computeAllNotifications(memoizedAppData, lastCheck);
  }, [lastCheck, memoizedAppData]);

  //  Merge Firebase notifications with in-app notifications 
  const mergeNotifications = useCallback(
    (firebaseNotifs) => {
      const inAppNotifs = computeInAppNotifications(); // Get local notifications
      const allNotifs = [...firebaseNotifs, ...inAppNotifs]; // Combine

      // Remove duplicates by ID
      const unique = Array.from(
        new Map(allNotifs.map((n) => [n.id, n])).values()
      );

      // Sort notifications descending by createdAt
      unique.sort(
        (a, b) => b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.() || 0
      );

      // Update state
      setNotifications(unique);
      setUnreadCount(unique.filter((n) => !n.read).length); // Count unread
    },
    [computeInAppNotifications]
  );

  //  Real-time Firebase notifications listener 
  useEffect(() => {
    if (!userId) return; // Exit if no user

    // Query the notifications collection for this user
    const q = query(
      collection(db, "notifications"),
      where("uid", "==", userId),
      orderBy("createdAt", "desc") // newest first
    );

    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // Map Firestore docs to local JS objects
        const firebaseNotifs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          read: doc.data().read || false, // Default read=false
        }));

        mergeNotifications(firebaseNotifs); // Merge with in-app notifs
      },
      (err) => {
        console.error("Firebase snapshot error:", err);
        setError(err.message);
      }
    );

    // Cleanup listener when component unmounts or userId changes
    return () => unsubscribe();
  }, [userId, mergeNotifications]);

  //  Initialize lastCheck when hook mounts 
  useEffect(() => {
    fetchLastCheckTimestamp();
  }, [fetchLastCheckTimestamp]);

  //  Mark all notifications as read 
  const markAllAsRead = useCallback(async () => {
    if (!userId || notifications.length === 0) return;

    try {
      const now = new Date();
      const userDocRef = doc(db, "users", userId);

      // Update the lastNotificationCheck timestamp in Firestore
      await updateDoc(userDocRef, { lastNotificationCheck: now });

      // Update all unread notifications in Firestore to read=true
      const updates = notifications
        .filter((n) => !n.read)
        .map((n) => updateDoc(doc(db, "notifications", n.id), { read: true }));

      await Promise.all(updates); // Wait for all updates

      // Update local state
      setLastCheck(now);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);

      return { success: true };
    } catch (err) {
      console.error("Error marking notifications as read:", err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [userId, notifications]);

  //  Manual refresh of notifications 
  const refresh = useCallback(() => {
    // Only refresh Firebase notifications (not in-app computed ones)
    const firebaseNotifs = notifications.filter((n) => n.id.startsWith("firebase_"));
    mergeNotifications(firebaseNotifs);
  }, [mergeNotifications, notifications]);

  //  Return state and actions from the hook 
  return {
    notifications,  
    unreadCount,     
    loading,          
    error,          
    markAllAsRead,   
    refresh,         
    lastCheck,       
  };
};
