import React, { createContext, useState, useEffect, useCallback } from "react";
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";

export const TransactionContext = createContext();

export const TransactionProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isGlobalLoading, setIsGlobalLoading] = useState(true);

  // We wrap this in useCallback so we can use it inside useEffect safely
  const fetchTransactions = useCallback(async (uid) => {
    if (!uid) return;
    setIsGlobalLoading(true);
    try {
      const q = query(collection(db, "transactions"), where("userid", "==", uid));
      const snap = await getDocs(q);
      const rawData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort newest to oldest globally
      rawData.sort((a, b) => {
        const dateA = a.TransactionDate?.seconds ? a.TransactionDate.seconds * 1000 : new Date(a.TransactionDate).getTime();
        const dateB = b.TransactionDate?.seconds ? b.TransactionDate.seconds * 1000 : new Date(b.TransactionDate).getTime();
        return dateB - dateA; 
      });

      setTransactions(rawData);
    } catch (error) {
      console.error("Global fetch error:", error);
    } finally {
      setIsGlobalLoading(false);
    }
  }, []);

  // This is the function we will pass down to the Dashboard for your refresh button!
  const refreshTransactions = async () => {
    if (user) {
      await fetchTransactions(user.uid);

      const snap = await getDocs(q);
      const rawData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // --- 🚨 FIREBASE READ TRACKER ---
      console.log(`🔥 FIREBASE NETWORK CALL: Fetched ${rawData.length} transactions.`);
      console.log(`💸 BILLABLE READS CONSUMED: ${rawData.length === 0 ? 1 : rawData.length}`);
      // --------------------------------
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchTransactions(currentUser.uid); // Fetch on login
      } else {
        setTransactions([]); // Clear on logout
        setIsGlobalLoading(false);
      }
    });
    return () => unsub();
  }, [fetchTransactions]);

  return (
    // Notice we added refreshTransactions to the value object
    <TransactionContext.Provider value={{ user, transactions, setTransactions, isGlobalLoading, refreshTransactions }}>
      {children}
    </TransactionContext.Provider>
  );
};