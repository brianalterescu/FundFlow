import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { TransactionProvider } from "./context/TransactionContext.jsx"; 
import { NotificationProvider } from './context/NotificationContext';
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

function Root() {
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);


  
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setUserId(user.uid);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return <p style={{ color: "white" }}>Loading...</p>;

  return (
    <BrowserRouter>
      <NotificationProvider userId={userId}>
        <TransactionProvider>   
          <App />
        </TransactionProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
