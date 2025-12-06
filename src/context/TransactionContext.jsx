import React, { createContext, useState, useEffect } from "react";
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";

// Create the context
export const TransactionContext = createContext();

// Create a provider
export const TransactionProvider = ({ children }) => {
  const [transactions, setTransactions] = useState([]);
  const [user, setUser] = useState(null);

  // Listen to auth state and load transactions on user login
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // User logged in, fetch transactions
        try {
          const transactionsRef = collection(db, "transactions");
          const q = query(transactionsRef, where("userid", "==", currentUser.uid));
          const querySnapshot = await getDocs(q);
          const txList = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Sort by date (oldest first)
          txList.sort(
            (a, b) =>
              (a.TransactionDate?.seconds || 0) - (b.TransactionDate?.seconds || 0)
          );

          setTransactions(txList);
        } catch (error) {
          console.error("Error loading transactions:", error);
          setTransactions([]); // reset on error
        }
      } else {
        // User logged out, clear transactions
        setTransactions([]);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <TransactionContext.Provider value={{ transactions, setTransactions, user }}>
      {children}
    </TransactionContext.Provider>
  );
};
