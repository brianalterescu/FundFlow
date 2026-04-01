import React, { useState, useContext, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { TransactionContext } from "../context/TransactionContext"; 
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";

// Icons
import { 
  Home, CreditCard, Target, Users, User, LogOut, Activity, Sparkles, 
  TrendingUp, MessageSquare, Link as LinkIcon, PieChart as PieIcon, 
  Search, ShieldAlert, Trash2, Edit3, Image as ImageIcon, Send, ShieldCheck, Users as UsersIcon
} from "lucide-react";











// import AdvancedScriptPanel from "./AdvancedScriptPanel.jsx";

const ADMIN_UIDS = ["9OXXhoS6Z6PncAzGxkNsPtfOCzn1", "tqdq1SUmVSWhces8vJpKEEvMade2", "O3Hj6a37lSeMvGGsuVCbZpGWInx2", "e1SqnahuVCVtQqrYm6aF9hnkMnh1", "cwCQbRWiOVbt4SqAqGo3KwGC7yX2"]; 
const DEFAULT_PIC = "https://static.wikia.nocookie.net/warpedlog/images/7/78/John_Pork.webp/revision/latest?cb=20250406194019.png";

function AdminPanel() {
  const { user } = useContext(TransactionContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState({});
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
  const [notificationMessage, setNotificationMessage] = useState("");

  // ---------------------------
  // 1. Check Auth & Admin Access
  // ---------------------------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        navigate("/login");
      } else {
        if (ADMIN_UIDS.includes(u.uid)) {
          setAccessGranted(true);
          const userDoc = await getDoc(doc(db, "users", u.uid));
          if (userDoc.exists()) setProfile(userDoc.data());
        } else {
          setAccessGranted(false);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  // ---------------------------
  // 2. Admin Search Function
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

      const qEmail = query(usersRef, where("email", ">=", term), where("email", "<=", term + "\uf8ff"));
      const snapEmail = await getDocs(qEmail);
      const emailUsers = snapEmail.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));

      const qUID = query(usersRef, where("uid", ">=", term), where("uid", "<=", term + "\uf8ff"));
      const snapUID = await getDocs(qUID);
      const uidUsers = snapUID.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));

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

  const loadTargetUser = (user) => {
    setTargetUser(user);
    setNewName(user.name || "");
    setNewPic(user.picURL || DEFAULT_PIC);
  };

  // ---------------------------
  // 3. Standard Admin Actions
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
    if (!window.confirm(`Delete ALL posts for ${targetUser.name || targetUser.email}?`)) return;
    const postsSnap = await getDocs(query(collection(db, "posts"), where("uid", "==", targetUser.uid)));
    await Promise.all(postsSnap.docs.map((p) => deleteDoc(doc(db, "posts", p.id))));
    alert("User posts deleted!");
  };

  const handleDeleteUserTransactions = async () => {
    if (!targetUser || !targetUser.uid) return;
    if (!window.confirm(`Are you sure you want to delete ALL transactions for ${targetUser.name || targetUser.email}? This cannot be undone.`)) return;

    try {
      const txRef = collection(db, "transactions");
      const q = query(txRef, where("userid", "==", targetUser.uid));
      const snap = await getDocs(q);

      if (snap.empty) {
        alert("This user has no transactions.");
        return;
      }

      const deletes = snap.docs.map((d) => deleteDoc(doc(db, "transactions", d.id)));
      await Promise.all(deletes);
      alert(`Deleted ${deletes.length} transactions for ${targetUser.name || targetUser.email}.`);
    } catch (err) {
      console.error("Error deleting user transactions:", err);
      alert("Failed to delete transactions. Check console for details.");
    }
  };

  const handleDeleteUser = async () => {
    if (!targetUser) return;
    if (ADMIN_UIDS.includes(targetUser.uid)) {
      alert("This account is protected and cannot be deleted.");
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

  const createNotification = async (uid, message, link = "") => {
    if (!message) return alert("Please enter a message for the notification.");
    try {
      await addDoc(collection(db, "Notifications"), {
        uid: uid,
        message: message,
        link: link,
        read: false,
        createdAt: serverTimestamp(),
      });
      alert(`Notification sent to user ${uid}`);
      setNotificationMessage("");
    } catch (err) {
      console.error("Error creating notification:", err);
      alert("Failed to create notification.");
    }
  };

  // ---------------------------
  // 4. NEW Admin Privilege Actions
  // ---------------------------
  
  const handleUnblockAdmin = async () => {
    if (!targetUser) return;
    if (!window.confirm(`Force unblock this user globally? This will remove all blocks placed by other users against ${targetUser.name || targetUser.email}.`)) return;

    try {
      // Find all blocks where this user is the one being blocked
      const blocksQuery = query(collection(db, "blocks"), where("blockedId", "==", targetUser.uid));
      const blockSnap = await getDocs(blocksQuery);
      
      if (blockSnap.empty) {
        alert("This user is not currently blocked by anyone.");
        return;
      }

      const deletes = blockSnap.docs.map((d) => deleteDoc(doc(db, "blocks", d.id)));
      await Promise.all(deletes);
      alert(`User has been globally unblocked. Removed ${deletes.length} blocks.`);
    } catch (err) {
      console.error("Error unblocking user:", err);
      alert("Failed to unblock user.");
    }
  };

  const handleForceFollowAll = async () => {
    if (!targetUser) return;
    if (!window.confirm(`WARNING: This will force EVERY user in the database to follow ${targetUser.name || targetUser.email}. Proceed?`)) return;

    try {
      // 1. Get ALL users
      const usersSnap = await getDocs(collection(db, "users"));
      const allUsers = usersSnap.docs.map(d => d.id);

      // 2. Get CURRENT followers to avoid duplicates
      const currentFollowersQuery = query(collection(db, "follows"), where("followedID", "==", targetUser.uid));
      const currentFollowersSnap = await getDocs(currentFollowersQuery);
      const currentFollowerIds = currentFollowersSnap.docs.map(d => d.data().followerID);

      let followCount = 0;

      // 3. Create follows for anyone not currently following
      const followPromises = allUsers.map(userId => {
        if (userId !== targetUser.uid && !currentFollowerIds.includes(userId)) {
          followCount++;
          return addDoc(collection(db, "follows"), {
            followerID: userId,
            followedID: targetUser.uid,
            followedAt: serverTimestamp(),
          });
        }
        return null;
      }).filter(Boolean);

      await Promise.all(followPromises);
      alert(`Success! Forced ${followCount} new users to follow this account.`);

    } catch (err) {
      console.error("Error forcing follows:", err);
      alert("Failed to execute force follow.");
    }
  };

  const NAV_LINKS = [
    { name: "Dashboard", path: "/dashboard", icon: Home },
    { name: "Transactions", path: "/transactions", icon: CreditCard },
    { name: "Budget Plan", path: "/budget", icon: PieIcon }, 
    { name: "Goals", path: "/goals", icon: Target },
    { name: "Connections", path: "/connections", icon: LinkIcon },
    { name: "Users", path: "/users", icon: Users },
    { name: "Social Feed", path: "/social", icon: MessageSquare },
    { name: "CSV Uploading", path: "/csvuploading", icon: Activity },
    { name: "Profile", path: "/profile", icon: User },
    { name: "Wrapped", path: "/wrapped", icon: Sparkles },
    // Admin specific link
    { name: "Admin Panel", path: "/admin", icon: ShieldAlert },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0b0f19]">
        <div className="w-8 h-8 border-4 border-[#06D6A0] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!accessGranted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0b0f19] text-center p-6">
        <ShieldAlert size={64} className="text-red-500 mb-4" />
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Access Denied</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">You do not have the required permissions to view this page.</p>
        <button onClick={() => navigate("/dashboard")} className="px-6 py-3 bg-[#06D6A0] text-white font-bold rounded-xl hover:bg-[#05b588] transition">Return to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0b0f19] text-gray-900 dark:text-white font-['Lexend_Deca'] overflow-hidden dark:[color-scheme:dark]">
      
      {/* SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-full z-20 shadow-sm flex-shrink-0">
        <div className="p-6 flex items-center gap-2">
          <img src="/FundFlow-Favicon.png" alt="Logo" className="h-8 w-8" />
          <span className="text-xl font-black tracking-tight">
            <span className="text-[#06D6A0]">Fund</span>Flow
          </span>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto no-scrollbar">
          {NAV_LINKS.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link key={link.name} to={link.path} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${isActive ? "bg-red-500/10 text-red-500" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"}`}>
                <link.icon size={18} className={isActive ? "text-red-500" : ""} />
                <span className="text-sm">{link.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <button onClick={() => signOut(auth).then(()=>navigate('/login'))} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 lg:px-10 z-10 sticky top-0 flex-shrink-0">
          <h1 className="text-2xl font-black tracking-tight text-red-500 flex items-center gap-2"><ShieldAlert /> Admin Root</h1>
          <img src={profile?.picURL || DEFAULT_PIC} alt="Avatar" className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 object-cover shadow-sm" />
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="max-w-5xl mx-auto space-y-6 pb-24 md:pb-8">

            {/* Search Card */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
              <h2 className="text-lg font-bold mb-4">Search Database</h2>
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search by Email or UID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 focus:ring-2 focus:ring-red-500 outline-none transition-all font-medium text-sm"
                  />
                </div>
                <button type="submit" disabled={searchLoading} className="px-8 py-3.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition shadow-md shadow-red-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center min-w-[120px]">
                  {searchLoading ? <Activity className="animate-spin" size={18} /> : "Search"}
                </button>
              </form>
              {searchError && <p className="text-red-500 text-sm font-bold mt-4">{searchError}</p>}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && !targetUser && (
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
                {searchResults.map((u) => (
                  <div key={u.uid} className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition">
                    <div className="flex items-center gap-4">
                      <img src={u.picURL || DEFAULT_PIC} alt="Avatar" className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{u.name || "Unnamed User"}</p>
                        <p className="text-xs font-medium text-gray-500 mb-0.5">{u.email}</p>
                        <p className="text-[10px] text-gray-400 font-mono bg-gray-100 dark:bg-gray-900 px-2 py-0.5 rounded inline-block">{u.uid}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button onClick={() => navigate(`/user/${u.uid}`)} className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition text-sm">View Profile</button>
                      <button onClick={() => loadTargetUser(u)} className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-bold hover:bg-black dark:hover:bg-white transition text-sm">Manage</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Target User Management Panel */}
            {targetUser && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                
                {/* Header & Quick Info */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        Managing: <span className="text-[#06D6A0]">{targetUser.name}</span>
                      </h2>
                      <p className="text-xs font-mono text-gray-500 mt-1">{targetUser.uid}</p>
                    </div>
                    <button onClick={() => setTargetUser(null)} className="text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition">Close Editor</button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div><span className="text-gray-500 block mb-1">Email</span><span className="font-bold">{targetUser.email}</span></div>
                    <div><span className="text-gray-500 block mb-1">Join Date</span><span className="font-bold">{targetUser.createdAt ? new Date(targetUser.createdAt.seconds * 1000).toLocaleDateString() : "N/A"}</span></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Basic Profile Editing */}
                  <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8 space-y-5">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2"><Edit3 size={16}/> Profile Editor</h3>
                    <div>
                      <label className="text-xs font-bold text-gray-500 mb-1 block pl-1">Display Name</label>
                      <div className="flex gap-2">
                        <input value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 outline-none focus:ring-2 focus:ring-[#06D6A0] text-sm" />
                        <button onClick={handleUpdateName} className="px-4 py-2.5 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-bold hover:bg-black transition text-sm">Save</button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 mb-1 block pl-1">Avatar URL</label>
                      <div className="flex gap-2">
                        <input value={newPic} onChange={(e) => setNewPic(e.target.value)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 outline-none focus:ring-2 focus:ring-[#06D6A0] text-sm" />
                        <button onClick={handleUpdatePic} className="px-4 py-2.5 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-bold hover:bg-black transition text-sm">Save</button>
                      </div>
                    </div>
                  </div>

                  {/* Comms & Special Admin Privileges */}
                  <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8 space-y-5">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2"><ShieldCheck size={16}/> God Mode Privileges</h3>
                    
                    <div>
                      <label className="text-xs font-bold text-gray-500 mb-1 block pl-1">Force System Notification</label>
                      <div className="flex gap-2">
                        <input placeholder="Message to push..." value={notificationMessage} onChange={(e) => setNotificationMessage(e.target.value)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                        <button onClick={() => createNotification(targetUser.uid, notificationMessage)} className="px-4 py-2.5 rounded-xl bg-blue-500 text-white font-bold hover:bg-blue-600 transition text-sm flex items-center justify-center"><Send size={16}/></button>
                      </div>
                    </div>

                    <div className="pt-4 space-y-3">
                      <button onClick={handleUnblockAdmin} className="w-full flex items-center justify-between px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition text-sm">
                        <span className="flex items-center gap-2"><ShieldCheck size={18}/> Globally Unblock User</span>
                      </button>
                      <button onClick={handleForceFollowAll} className="w-full flex items-center justify-between px-4 py-3 bg-fuchsia-50 dark:bg-fuchsia-900/20 text-fuchsia-600 dark:text-fuchsia-400 font-bold rounded-xl border border-fuchsia-100 dark:border-fuchsia-800 hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/40 transition text-sm">
                        <span className="flex items-center gap-2"><UsersIcon size={18}/> Force Follow All Users</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Destructive Actions */}
                <div className="bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/30 p-6 sm:p-8 space-y-4">
                  <h3 className="text-sm font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2"><Trash2 size={16}/> Destructive Actions</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button onClick={handleDeleteUserPosts} className="px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition text-sm">
                      Delete All Posts
                    </button>
                    <button onClick={handleDeleteUserTransactions} className="px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition text-sm">
                      Delete All Transactions
                    </button>
                    <button onClick={handleDeleteUser} className="px-4 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-md transition text-sm">
                      Delete Entire Account
                    </button>
                  </div>
                </div>

              </div>
            )}
            
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminPanel;