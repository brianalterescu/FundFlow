import React, { useState, useContext, useEffect } from "react";
; import { Link } from "react-router-dom";  // Imports Link component from react-router-dom for navigation between routes in a single page application.
import { useNavigate } from "react-router-dom";
import { deleteField } from "firebase/firestore";

import {
    collection,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    doc,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { TransactionContext } from "../context/TransactionContext";  // Imports the TransactionContext for accessing user data.
import AdvancedScriptPanel from "./AdvancedScriptPanel.jsx";
import "../styles/Admin.css";

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


    if (loading) return <div>Loading...</div>;
    if (!accessGranted) return <div>Access Denied.</div>;

    return (
        <div className="admin-container">
            {/* Navbar */}
{/* Standard navigation to access other JSX files */}
            <header className="header-bar">
                <Link to="/dashboard">
                    <img src="./FundFlowLogo2.png" alt="Fund Flow Logo" className="logo" />
                </Link>
                <nav className="nav-links">
                    <Link to="/" className="nav-links">
                        Home
                    </Link>
                    <Link to="/dashboard" className="nav-links">
                        Dashboard
                    </Link>
                    <a href="/connections">Connections</a>
                </nav>
            </header>

            <div className="admin-main">
                <h2 style={{color:' #fff'}}>Admin User Management</h2>

                {/* ------------------ */}
                {/* Search Users */}
                {/* ------------------ */}
                <form onSubmit={handleSearch}>
                    <input
                        type="text"
                        placeholder="Enter email or UID"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleSearch(e);
                        }}
                    />
                    <button type="submit" className="admin-main-btn" disabled={searchLoading}>
                        {searchLoading ? "Searching..." : "Search"}
                    </button>
                </form>
                {searchError && <p className="error">{searchError}</p>}

                <ul className="admin-search-results">
                    {searchResults.map((u) => (
                        <li key={u.uid} className="admin-user-item">
                            <div className="user-info">
                                <img
                                    src={u.picURL || DEFAULT_PIC}
                                    alt={u.name || u.email}
                                    className="avatar"
                                />
                                <div>
                                    <p>
                                        <strong className="admin-userInfo">{u.name || "Unnamed User"}</strong>
                                    </p>
                                    <p className="admin-userInfo">{u.email}</p>
                                    <p className="admin-userInfo">UID: {u.uid}</p>
                                </div>
                            </div>
                            <button
                                className="admin-main-btn"
                                onClick={() => loadTargetUser(u)}
                            >
                                Manage User
                            </button>
                            <button
                                className="admin-main-btn"
                                onClick={() => navigate(`/user/${u.uid}`)}
                            >
                                View Profile
                            </button>
                        </li>
                    ))}
                </ul>

                {/* ------------------ */}
                {/* Target User Panel */}
                {/* ------------------ */}
                {targetUser && (
                    <div className="admin-user-panel">
                        <h3>
                            User: {targetUser.name} ({targetUser.uid})
                        </h3>
                        {/* Display Join Date and Last Online */}
                        <div className="admin-user-info">
                            <p className="adminview-account-info">
                                <strong className="adminview-account-info">Join Date:</strong>{" "}
                                {targetUser.createdAt
                                    ? new Date(targetUser.createdAt.seconds * 1000).toLocaleString()
                                    : "N/A"}
                            </p>
                            <p className="adminview-account-info">
                                <strong className="adminview-account-info">Last Online:</strong>{" "}
                                {targetUser.lastOnline
                                    ? new Date(targetUser.lastOnline.seconds * 1000).toLocaleString()
                                    : "N/A"}
                            </p>
                        </div>


                        <label>Name:</label>
                        <input value={newName} onChange={(e) => setNewName(e.target.value)} />
                        <button className="admin-main-btn" onClick={handleUpdateName}>
                            Update Name
                        </button>

                        <label>Profile Image URL:</label>
                        <input value={newPic} onChange={(e) => setNewPic(e.target.value)} />
                        <button className="admin-main-btn" onClick={handleUpdatePic}>
                            Update Profile Image
                        </button>

                        <button className="admin-delete-btn" onClick={handleDeleteUserPosts}>
                            Delete User Posts
                        </button>
                        <button className="admin-delete-btn" onClick={handleDeleteUser}>
                            Delete User Account
                        </button>
                    </div>



                )}
            </div>

            <AdvancedScriptPanel />
        </div>
    );
}

export default AdminPanel;
