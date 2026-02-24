import React, { useState, useContext, useEffect } from "react";
; import { Link } from "react-router-dom";  // Imports Link component from react-router-dom for navigation between routes in a single page application.
import { useNavigate } from "react-router-dom";
import { deleteField } from "firebase/firestore";

import {
    collection,
    getDocs,
    updateDoc,
    deleteDoc,
    addDoc,
    serverTimestamp,
    query,
    where,
    doc,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { TransactionContext } from "../context/TransactionContext";  // Imports the TransactionContext for accessing user data.
import AdvancedScriptPanel from "./AdvancedScriptPanel.jsx";
// import "../styles/Admin.css";

const ADMIN_UIDS = ["9OXXhoS6Z6PncAzGxkNsPtfOCzn1", "tqdq1SUmVSWhces8vJpKEEvMade2", "O3Hj6a37lSeMvGGsuVCbZpGWInx2", "e1SqnahuVCVtQqrYm6aF9hnkMnh1", "cwCQbRWiOVbt4SqAqGo3KwGC7yX2"]; // Add more later
const DEFAULT_PIC =
    "https://static.wikia.nocookie.net/warpedlog/images/7/78/John_Pork.webp/revision/latest?cb=20250406194019.png";

function AdminPanel() {
    const { user } = useContext(TransactionContext);
    const [loading, setLoading] = useState(true);
    const [accessGranted, setAccessGranted] = useState(false);

    // Search / target user states
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState("");

    const [targetUser, setTargetUser] = useState(null);
    const [newName, setNewName] = useState("");
    const [newPic, setNewPic] = useState("");

    // Advanced Script Panel states
    const [scriptCollection, setScriptCollection] = useState("");
    const [scriptField, setScriptField] = useState("");
    const [scriptOperation, setScriptOperation] = useState("add");
    const [scriptValue, setScriptValue] = useState("");
    const [scriptStatus, setScriptStatus] = useState("");
    const [notificationMessage, setNotificationMessage] = useState("");
    const handleRunScript = async () => {
        if (!scriptCollection || !scriptField) return alert("Collection and Field are required");
        if (scriptOperation !== "delete" && !scriptValue) return alert("Value required for Add/Update");

        if (!window.confirm(`Are you sure you want to ${scriptOperation} field "${scriptField}" in all documents of "${scriptCollection}"?`)) return;

        try {
            const colRef = collection(db, scriptCollection);
            const snap = await getDocs(colRef);

            const ops = snap.docs.map((d) => {
                const docRef = doc(db, scriptCollection, d.id);
                if (scriptOperation === "add" || scriptOperation === "update") {
                    return updateDoc(docRef, { [scriptField]: scriptValue });
                } else if (scriptOperation === "delete") {
                    return updateDoc(docRef, { [scriptField]: deleteField() });
                }
                return null;
            }).filter(Boolean);

            await Promise.all(ops);
            setScriptStatus(`Operation "${scriptOperation}" executed on ${ops.length} documents.`);
        } catch (err) {
            console.error(err);
            setScriptStatus(`Error executing script: ${err.message}`);
        }
    };


    const navigate = useNavigate();

    // ---------------------------
    // 1. Check admin access
    // ---------------------------
    useEffect(() => {
        if (user === undefined) return; // still loading
        if (user && ADMIN_UIDS.includes(user.uid)) setAccessGranted(true);
        setLoading(false);
    }, [user]);

    // ---------------------------
    // 2. Admin search function
    // ---------------------------
    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!searchTerm.trim()) return;

        setSearchLoading(true);
        setSearchError("");
        setSearchResults([]);

        try {
            const term = searchTerm.trim();

            const usersRef = collection(db, "users");

            // Partial email match
            const qEmail = query(
                usersRef,
                where("email", ">=", term),
                where("email", "<=", term + "\uf8ff")
            );
            const snapEmail = await getDocs(qEmail);
            const emailUsers = snapEmail.docs.map((doc) => ({
                uid: doc.id,
                ...doc.data(),
            }));

            // Partial UID match
            const qUID = query(
                usersRef,
                where("uid", ">=", term),
                where("uid", "<=", term + "\uf8ff")
            );
            const snapUID = await getDocs(qUID);
            const uidUsers = snapUID.docs.map((doc) => ({
                uid: doc.id,
                ...doc.data(),
            }));

            // Merge & remove duplicates
            const map = {};
            [...emailUsers, ...uidUsers].forEach((u) => (map[u.uid] = u));
            const results = Object.values(map);

            if (results.length === 0) setSearchError("No users found.");
            setSearchResults(results);
        } catch (err) {
            console.error(err);
            setSearchError("Error searching for users.");
        } finally {
            setSearchLoading(false);
        }
    };

    // ---------------------------
    // 3. Load user into management panel
    // ---------------------------
    const loadTargetUser = (user) => {
        setTargetUser(user);
        setNewName(user.name || "");
        setNewPic(user.picURL || DEFAULT_PIC);
    };

    // ---------------------------
    // 4. Admin actions
    // ---------------------------
    const handleUpdateName = async () => {
        if (!targetUser) return;
        const userRef = doc(db, "users", targetUser.uid);
        await updateDoc(userRef, { name: newName });
        alert("Name updated!");
        setTargetUser({ ...targetUser, name: newName });
    };

    const handleUpdatePic = async () => {
        if (!targetUser) return;
        const userRef = doc(db, "users", targetUser.uid);
        await updateDoc(userRef, { picURL: newPic });
        alert("Profile image updated!");
        setTargetUser({ ...targetUser, picURL: newPic });
    };

    const handleDeleteUserPosts = async () => {
        if (!targetUser) return;
        const postsSnap = await getDocs(
            query(collection(db, "posts"), where("uid", "==", targetUser.uid))
        );
        await Promise.all(
            postsSnap.docs.map((p) => deleteDoc(doc(db, "posts", p.id)))
        );
        alert("User posts deleted!");
    };

    const createNotification = async (uid, message, link = "") => {
        if (!message) {
            alert("Please enter a message for the notification.");
            return;
        }

        try {
            await addDoc(collection(db, "Notifications"), {
                uid: uid,
                message: message,
                link: link,
                read: false,
                createdAt: serverTimestamp(),
            });

            alert(`Notification sent to user ${uid}`);
        } catch (err) {
            console.error("Error creating notification:", err);
            alert("Failed to create notification.");
        }
    };

    const handleDeleteUser = async () => {
        if (!targetUser) return;

        // Prevent deleting admin accounts
        if (ADMIN_UIDS.includes(targetUser.uid)) {
            alert("This account is protected and cannot be deleted.");
            console.warn("Attempted to delete ADMIN account:", targetUser.uid);
            return;
        }

        if (!window.confirm(`Delete user ${targetUser.name} and all data?`)) return;

        try {
            await deleteDoc(doc(db, "users", targetUser.uid));
            await handleDeleteUserPosts();

            setTargetUser(null);
            setSearchTerm("");
            setSearchResults([]);

            alert("User deleted!");
        } catch (error) {
            console.error("Error deleting user:", error);
            alert("Failed to delete user.");
        }
    };

   const handleDeleteUserTransactions = async () => {
  if (!targetUser || !targetUser.uid) {
    alert("Please select a user first.");
    return;
  }

  // Safety: prevent deleting transactions for admin accounts
//   if (ADMIN_UIDS.includes(targetUser.uid)) {
//     alert("Cannot delete transactions for an admin account.");
//     return;
//   }

  if (
    !window.confirm(
      `Are you sure you want to delete ALL transactions for ${targetUser.name || targetUser.email}? This cannot be undone.`
    )
  )
    return;

  try {
    // Query transactions where the field matches your transactions schema (your app uses "userid")
    const txRef = collection(db, "transactions");
    const q = query(txRef, where("userid", "==", targetUser.uid));
    const snap = await getDocs(q);

    if (snap.empty) {
      alert("This user has no transactions.");
      return;
    }

    // Delete all matching docs in parallel
    const deletes = snap.docs.map((d) => deleteDoc(doc(db, "transactions", d.id)));
    await Promise.all(deletes);

    alert(`Deleted ${deletes.length} transactions for ${targetUser.name || targetUser.email}.`);

    // Optional: If you keep a list of users or need to refresh UI, do that here
    // e.g. refresh the search results or selected user info
  } catch (err) {
    console.error("Error deleting user transactions:", err);
    alert("Failed to delete transactions. Check console for details.");
  }
};



    if (loading) return <div>Loading...</div>;
    if (!accessGranted) return <div>Access Denied.</div>;

    return (<div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col">
      {/* Desktop Top Navbar */}
      <header className="hidden md:flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src="./FundFlow-Favicon.png" alt="Fund Flow Logo" className="h-10 w-10" />
          <span className="font-bold text-2xl">
            <span className="text-[#07d6a1]">Fund</span>
            <span className="text-gray-900 dark:text-white">Flow</span>
          </span>
        </Link>
        <nav className="flex space-x-4">
          <Link to="/dashboard" className="px-3 py-2 rounded hover:bg-[#07d6a1]/20 transition">Dashboard</Link>
          <Link to="/connections" className="px-3 py-2 rounded hover:bg-[#07d6a1]/20 transition">Connections</Link>
          <Link to="/connections" className="px-3 py-2 rounded hover:bg-[#07d6a1]/20 transition">Social</Link>
          <Link to="/searchUsers" className="px-3 py-2 rounded hover:bg-[#07d6a1]/20 transition">Search Users</Link>
        </nav>
      </header>

      {/* Mobile Bottom Navbar */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden flex justify-around bg-white dark:bg-gray-800 p-2 shadow-t">
        <Link to="/dashboard" className="text-center text-sm">🏠<br/>Dashboard</Link>
        <Link to="/connections" className="text-center text-sm">🔗<br/>Connections</Link>
        <Link to="/connections" className="text-center text-sm">💬<br/>Social</Link>
        <Link to="/searchUsers" className="text-center text-sm">🔍<br/>Search</Link>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 pt-6 md:pt-8">
        <h2 className="text-2xl font-bold mb-4">Admin User Management</h2>

        {/* Search Users */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(e);
          }}
          className="flex flex-col sm:flex-row gap-2 mb-6"
        >
          <input
            type="text"
            placeholder="Enter email or UID"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#07d6a1]"
          />
          <button
            type="submit"
            disabled={searchLoading}
            className="px-6 py-2 rounded-lg bg-[#07d6a1] text-white hover:bg-[#06be8d] transition"
          >
            {searchLoading ? "Searching..." : "Search"}
          </button>
        </form>
        {searchError && <p className="text-red-500 mb-4">{searchError}</p>}

        {/* Search Results */}
        <ul className="space-y-4">
          {searchResults.map((u) => (
            <li key={u.uid} className="flex flex-col md:flex-row items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="flex items-center gap-4 mb-2 md:mb-0">
                <img
                  src={u.picURL || DEFAULT_PIC}
                  alt={u.name || u.email}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold">{u.name || "Unnamed User"}</p>
                  <p className="text-sm">{u.email}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">UID: {u.uid}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  className="px-4 py-2 rounded-lg bg-[#07d6a1] text-white hover:bg-[#06be8d] transition"
                  onClick={() => loadTargetUser(u)}
                >
                  Manage User
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-gray-500 dark:bg-gray-600 text-white hover:bg-gray-600 dark:hover:bg-gray-700 transition"
                  onClick={() => navigate(`/user/${u.uid}`)}
                >
                  View Profile
                </button>
              </div>
            </li>
          ))}
        </ul>

        {/* Target User Panel */}
        {targetUser && (
          <div className="mt-8 p-4 bg-white dark:bg-gray-800 rounded-lg shadow space-y-4">
            <h3 className="text-xl font-bold">
              User: {targetUser.name} ({targetUser.uid})
            </h3>
            <div className="flex flex-col md:flex-row gap-4">
              <p><strong>Join Date:</strong> {targetUser.createdAt ? new Date(targetUser.createdAt.seconds * 1000).toLocaleString() : "N/A"}</p>
              <p><strong>Last Online:</strong> {targetUser.lastOnline ? new Date(targetUser.lastOnline.seconds * 1000).toLocaleString() : "N/A"}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 flex flex-col gap-2">
                <label>Name:</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button
                  className="px-4 py-2 rounded-lg bg-[#07d6a1] text-white hover:bg-[#06be8d] transition"
                  onClick={handleUpdateName}
                >
                  Update Name
                </button>
              </div>

              <div className="flex-1 flex flex-col gap-2">
                <label>Profile Image URL:</label>
                <input
                  value={newPic}
                  onChange={(e) => setNewPic(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button
                  className="px-4 py-2 rounded-lg bg-[#07d6a1] text-white hover:bg-[#06be8d] transition"
                  onClick={handleUpdatePic}
                >
                  Update Profile Image
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
                onClick={handleDeleteUserPosts}
              >
                Delete User Posts
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
                onClick={handleDeleteUser}
              >
                Delete User Account
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
                onClick={handleDeleteUserTransactions}
              >
                Delete User Transactions
              </button>
            </div>

            {/* Notification Creator */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Enter notification message"
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                className="px-4 py-2 rounded-lg bg-[#07d6a1] text-white hover:bg-[#06be8d] transition"
                onClick={() => {
                  createNotification(targetUser.uid, notificationMessage);
                  setNotificationMessage("");
                }}
              >
                Send Notification
              </button>
            </div>
          </div>
        )}
      </main>

      {/* <AdvancedScriptPanel /> */}
    </div>
    );
}






export default AdminPanel;
