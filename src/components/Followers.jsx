import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  deleteDoc
} from "firebase/firestore";

// Icons
import { 
  Home, CreditCard, Target, Users, User, LogOut, Activity, Sparkles, TrendingUp, MessageSquare, Link as LinkIcon, UserMinus,
  PieChart
} from "lucide-react";

const DEFAULT_PIC = "https://i.imgur.com/1xAP7pJ.png";

export default function Connections() {
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState({});
  const [mode, setMode] = useState("followers"); 
  const [people, setPeople] = useState([]); 
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState(""); 
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        navigate("/login");
      } else {
        setCurrentUser(u);
        const userDoc = await getDoc(doc(db, "users", u.uid));
        if (userDoc.exists()) setProfile(userDoc.data());
      }
    });
    return () => unsub();
  }, [navigate]);

  useEffect(() => {
    if (!currentUser) return;

 const loadPeople = async () => {
      setLoading(true);
      setError("");

      try {
        let q;
        // 1. Branch the query based on the active tab
        if (mode === "blocked") {
          q = query(collection(db, "blocks"), where("blockerId", "==", currentUser.uid));
        } else {
          const followsRef = collection(db, "follows");
          q = mode === "followers" 
              ? query(followsRef, where("followedID", "==", currentUser.uid))
              : query(followsRef, where("followerID", "==", currentUser.uid));
        }

        const snap = await getDocs(q);
        
        // 2. Determine which ID field to check based on the mode
        const otherIdField = mode === "blocked" 
            ? "blockedId" 
            : (mode === "followers" ? "followerID" : "followedID"); 
            
        // 3. Keep track of the collection name so cleanup deletes from the right place!
        const collectionName = mode === "blocked" ? "blocks" : "follows";

        const validConnections = [];
        const staleConnections = [];

        for (const docSnap of snap.docs) {
          const data = docSnap.data();
          const otherUserId = data[otherIdField];
          
          const userDoc = await getDoc(doc(db, "users", otherUserId));
          
          if (userDoc.exists()) {
            validConnections.push({
              id: docSnap.id,
              otherUserId,
              user: userDoc.data(),
            });
          } else {
            // Scrub deleted users from both Follows AND Blocks
            staleConnections.push(deleteDoc(doc(db, collectionName, docSnap.id)));
          }
        }

        if (staleConnections.length > 0) {
          Promise.all(staleConnections).catch(err => console.error("Cleanup error:", err));
        }

        setPeople(validConnections);
      } catch (e) {
        setError("Failed to load connections.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    loadPeople();
  }, [currentUser, mode]);

  // Remove a connection (Unfollow or Remove Follower)
  const handleRemoveConnection = async (docId) => {
    const action = mode === "followers" ? "remove this follower" : "unfollow this user";
    if (!window.confirm(`Are you sure you want to ${action}?`)) return;

    try {
      await deleteDoc(doc(db, "follows", docId));
      setPeople(prev => prev.filter(p => p.id !== docId));
    } catch (err) {
      console.error("Error removing connection:", err);
    }
  };

  // Unblock a user
  const handleUnblock = async (docId) => {
    if (!window.confirm("Are you sure you want to unblock this user?")) return;
    try {
      await deleteDoc(doc(db, "blocks", docId));
      setPeople(prev => prev.filter(p => p.id !== docId));
    } catch (err) {
      console.error("Error unblocking user:", err);
    }
  };

  const displayName = (u) => u?.name || u?.displayName || "Unknown User";

  const NAV_LINKS = [
    { name: "Dashboard", path: "/dashboard", icon: Home },
    { name: "Transactions", path: "/transactions", icon: CreditCard },
    { name: "Goals", path: "/goals", icon: Target },
    { name: "Budget", path: "/budget", icon: PieChart },
    { name: "Connections", path: "/connections", icon: LinkIcon },
    { name: "Users", path: "/users", icon: Users },
    { name: "Social Feed", path: "/social", icon: MessageSquare },
    { name: "CSV Uploading", path: "/csvuploading", icon: Activity },
    { name: "Profile", path: "/profile", icon: User },
    { name: "Income Forecast", path: "/forecast", icon: TrendingUp },
    { name: "Wrapped", path: "/wrapped", icon: Sparkles },
  ];

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
              <Link key={link.name} to={link.path} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${isActive ? "bg-[#06D6A0]/10 text-[#06D6A0]" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"}`}>
                <link.icon size={18} className={isActive ? "text-[#06D6A0]" : ""} />
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
        
        {/* HEADER */}
        <header className="h-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 lg:px-10 z-10 sticky top-0 flex-shrink-0">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Connections</h1>
          </div>
          <div className="flex items-center gap-4">
            <img src={profile?.picURL || currentUser?.photoURL || DEFAULT_PIC} alt="Avatar" className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 object-cover shadow-sm" />
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
         <div className="max-w-4xl mx-auto space-y-8 pb-24 md:pb-8">

            {/* TOGGLE TABS */}
            <div className="flex p-1.5 bg-gray-100 dark:bg-gray-900/80 rounded-2xl max-w-md mx-auto sm:mx-0">
              {/* Added "blocked" to the mapping array */}
              {["followers", "following", "blocked"].map((key) => (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all capitalize ${
                    mode === key
                      ? "bg-white dark:bg-gray-700 text-[#06D6A0] shadow-sm"
                      : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>

            {/* STATES */}
            {loading && (
              <div className="py-12 flex justify-center">
                <div className="w-8 h-8 border-4 border-[#06D6A0] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl text-center text-sm font-bold">
                {error}
              </div>
            )}

            {/* USERS LIST */}
            {!loading && !error && (
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                {people.length === 0 ? (
                  <div className="p-10 text-center text-gray-500 dark:text-gray-400 font-medium flex flex-col items-center gap-3">
                    <Users size={32} className="text-gray-300 dark:text-gray-600" />
                    {/* Dynamic Empty State */}
                    {mode === "followers" ? "No one is following you yet." : 
                     mode === "following" ? "You're not following anyone yet." : 
                     "You haven't blocked anyone."}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {people.map((item) => (
                      <div key={item.id} className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        
                        {/* USER INFO */}
                        <div className="flex items-center gap-4">
                          <img 
                            src={item.user?.picURL || DEFAULT_PIC} 
                            alt="Avatar" 
                            className="w-12 h-12 rounded-full border border-gray-200 dark:border-gray-700 object-cover"
                            onError={(e) => (e.target.src = DEFAULT_PIC)}
                          />
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white text-base">
                              {displayName(item.user)}
                            </p>
                            <p className="text-xs font-medium text-gray-500 mt-0.5">
                              {/* Dynamic Subtitle */}
                              {mode === "followers" ? "Follows you" : 
                               mode === "following" ? "You follow them" : 
                               "Blocked User"}
                            </p>
                          </div>
                        </div>

                        {/* ACTIONS */}
                        <div className="flex items-center gap-2">
                          {mode !== "blocked" ? (
                            <>
                              <Link
                                to={`/user/${item.otherUserId}`}
                                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition text-sm flex items-center gap-2"
                              >
                                <User size={16} /> Profile
                              </Link>

                              <button
                                onClick={() => handleRemoveConnection(item.id)}
                                className="px-4 py-2 rounded-xl text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition text-sm font-bold flex items-center gap-2"
                                title={mode === "followers" ? "Remove Follower" : "Unfollow"}
                              >
                                <UserMinus size={16} />
                                <span className="hidden sm:inline">{mode === "followers" ? "Remove" : "Unfollow"}</span>
                              </button>
                            </>
                          ) : (
                            // Unique Action for Blocked Tab
                            <button
                              onClick={() => handleUnblock(item.id)}
                              className="px-5 py-2 rounded-xl text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition text-sm font-bold"
                            >
                              Unblock
                            </button>
                          )}
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50 pb-safe">
        <div className="flex justify-around items-center px-2">
          {NAV_LINKS.slice(0, 5).map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link key={link.name} to={link.path} className={`flex flex-col items-center justify-center py-3 px-2 transition active:scale-95 ${isActive ? "text-[#06D6A0]" : "text-gray-500 hover:text-[#06D6A0]"}`}>
                <link.icon className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-bold truncate max-w-[60px] text-center">{link.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

    </div>
  );
}