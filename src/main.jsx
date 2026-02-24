import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { TransactionProvider } from "./context/TransactionContext.jsx";
import { NotificationProvider } from './context/NotificationContext';
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import LoadingScreen from "./components/LoadingScreen";

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

  if (loading) {
   return <LoadingScreen />;
  }



  return (


    <BrowserRouter>
      <NotificationProvider userId={userId}>
        <TransactionProvider>
          <App />
        </TransactionProvider>
      </NotificationProvider>
    </BrowserRouter>
  );

  <div className="fixed bottom-0 left-0 w-full bg-white dark:bg-gray-900 border-t dark:border-gray-700 flex justify-around py-2 md:hidden z-50">
    <button onClick={() => navigate("/dashboard")} className="flex flex-col items-center text-sm">
      📊 <span>Dashboard</span>
    </button>

    <button onClick={() => navigate("/add")} className="flex flex-col items-center text-sm">
      ➕ <span>Add</span>
    </button>

    <button onClick={() => navigate("/profile")} className="flex flex-col items-center text-sm">
      👤 <span>Profile</span>
    </button>
  </div>

}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
