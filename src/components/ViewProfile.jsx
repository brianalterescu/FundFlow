import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";

// Icons
import {
  Home, CreditCard, Target, Users, User, Share2, Shield, UserPlus, UserMinus, MessageSquare, 
  LogOut, Activity, Sparkles, TrendingUp, Link as LinkIcon, ArrowLeft
} from "lucide-react";

export default function ViewProfile() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [userData, setUserData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  
  const [isBlocked, setIsBlocked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  
  const [transactionCount, setTransactionCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const DEFAULT_PIC = "https://i.imgur.com/1xAP7pJ.png";

  // AUTH LISTENER & LOGGED-IN USER PROFILE
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login");
      } else {
        setCurrentUser(user);
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) setProfile(docSnap.data());
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Fetch Follower & Following Counts
  useEffect(() => {
    if (!uid) return;

    const fetchFollowStats = async () => {
      try {
        const followsRef = collection(db, "follows");

        // Count Followers
        const followersQuery = query(followsRef, where("followedID", "==", uid));
        const followersSnap = await getDocs(followersQuery);
        setFollowersCount(followersSnap.size);

        // Count Following
        const followingQuery = query(followsRef, where("followerID", "==", uid));
        const followingSnap = await getDocs(followingQuery);
        setFollowingCount(followingSnap.size);

      } catch (error) {
        console.error("Error fetching follow stats:", error);
      }
    };

    fetchFollowStats();
  }, [uid]);

  // LOAD TARGET PROFILE & RELATIONSHIPS
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!uid) return navigate("/users");
      if (!currentUser) return;

      try {
        // 1. BLOCK CHECK
        const blocksRef = collection(db, "blocks");
        const qBlocks = query(
          blocksRef,
          where("blockerId", "in", [currentUser.uid, uid]),
          where("blockedId", "in", [currentUser.uid, uid])
        );
        const blockSnap = await getDocs(qBlocks);
        setIsBlocked(!blockSnap.empty);

        // 2. LOAD USER DATA
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData({
            ...data,
            picURL: data.picURL || DEFAULT_PIC,
            aboutMe: data.aboutMe || "This user hasn't written a bio yet.", 
          });
        } else {
          setUserData(null);
        }

        // 3. LOAD STATS (Transactions Count)
        const txQ = query(collection(db, "transactions"), where("userid", "==", uid));
        const txSnap = await getDocs(txQ);
        setTransactionCount(txSnap.size);

        // 4. FOLLOW STATUS
        if (blockSnap.empty) {
          const followsRef = collection(db, "follows");
          const qFollow = query(
            followsRef,
            where("followerID", "==", currentUser.uid),
            where("followedID", "==", uid)
          );
          const followSnap = await getDocs(qFollow);
          setIsFollowing(!followSnap.empty);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) loadUserProfile();
  }, [uid, currentUser, navigate]);

  // HANDLERS
  const handleCopyProfileUrl = () => {
    const profileUrl = `https://fundflow.ing/users/${uid}`;
    navigator.clipboard.writeText(profileUrl);
    alert("Profile link copied to clipboard!");
  };

  const handleFollow = async () => {
    if (!currentUser || isBlocked) return;
    try {
      await addDoc(collection(db, "follows"), {
        followerID: currentUser.uid,
        followedID: uid,
        followedAt: serverTimestamp(),
      });
      setIsFollowing(true);
      setFollowersCount(prev => prev + 1);
    } catch (err) { console.error(err); }
  };

  const handleUnfollow = async () => {
    try {
      const q = query(collection(db, "follows"), where("followerID", "==", currentUser.uid), where("followedID", "==", uid));
      const snap = await getDocs(q);
      snap.forEach(async (d) => deleteDoc(d.ref));
      setIsFollowing(false);
      setFollowersCount(prev => Math.max(0, prev - 1));
    } catch (err) { console.error(err); }
  };

  const handleBlock = async () => {
    if (!window.confirm("Block this user? You won't see their posts or profile.")) return;
    try {
      const followsRef = collection(db, "follows");
      const qFollows = query(followsRef, where("followerID", "in", [currentUser.uid, uid]), where("followedID", "in", [currentUser.uid, uid]));
      const followSnap = await getDocs(qFollows);
      followSnap.forEach(async (d) => deleteDoc(d.ref));
      setIsFollowing(false);

      await addDoc(collection(db, "blocks"), {
        blockerId: currentUser.uid,
        blockedId: uid,
        blockedAt: serverTimestamp(),
      });
      setIsBlocked(true);
    } catch (err) { console.error(err); }
  };

  const handleUnblock = async () => {
    try {
      const q = query(collection(db, "blocks"), where("blockerId", "==", currentUser.uid), where("blockedId", "==", uid));
      const snap = await getDocs(q);
      snap.forEach(async (d) => deleteDoc(d.ref));
      setIsBlocked(false);
    } catch (err) { console.error(err); }
  };

  const NAV_LINKS = [
    { name: "Dashboard", path: "/dashboard", icon: Home },
    { name: "Transactions", path: "/transactions", icon: CreditCard },
    { name: "Goals", path: "/goals", icon: Target },
    { name: "Connections", path: "/connections", icon: LinkIcon },
    { name: "Users", path: "/users", icon: Users },
    { name: "Social Feed", path: "/social", icon: MessageSquare },
    { name: "CSV Uploading", path: "/csv", icon: Activity },
    { name: "Profile", path: "/profile", icon: User },
    { name: "Income Forecast", path: "/incomeforecast", icon: TrendingUp },
      // { name: "Wrapped", path: "/wrapped", icon: Sparkles },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0b0f19]">
        <div className="w-8 h-8 border-4 border-[#06D6A0] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0b0f19] text-gray-500 font-bold">
        User not found.
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
            // Highlight 'Users' tab since we are viewing a user
            const isActive = link.path === '/users'; 
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
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition">
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-2xl font-black tracking-tight">View Profile</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <img src={profile?.picURL || currentUser?.photoURL || DEFAULT_PIC} alt="My Avatar" className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 object-cover shadow-sm" />
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="max-w-4xl mx-auto space-y-6 pb-24 md:pb-8">

            {/* HEADER CARD */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-[#06D6A0] to-blue-500 relative overflow-hidden">
                 <div className="absolute inset-0 bg-white/20 dark:bg-black/20 mix-blend-overlay"></div>
              </div>

              <div className="px-6 sm:px-8 pb-8">
                <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-12 mb-6 gap-4 sm:gap-6">
                  
                  <img
                    src={userData.picURL}
                    alt="Profile"
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-lg bg-gray-100 dark:bg-gray-900 z-10"
                    onError={(e) => (e.target.src = DEFAULT_PIC)}
                  />

                  <div className="flex-1 text-center sm:text-left z-10 pt-2 sm:pt-0">
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                      {userData.name || "Unknown User"}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mt-1">
                      Joined {userData.createdAt?.seconds ? new Date(userData.createdAt.seconds * 1000).getFullYear() : "Recently"}
                    </p>
                  </div>

                  {/* ACTION BUTTONS */}
                  {!isBlocked && currentUser.uid !== uid && (
                    <div className="flex gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                      <button
                        onClick={handleCopyProfileUrl}
                        className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                        title="Share Profile"
                      >
                        <Share2 size={20} />
                      </button>
                      
                      <button
                        onClick={isFollowing ? handleUnfollow : handleFollow}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition shadow-lg active:scale-[0.98] ${
                          isFollowing
                            ? "bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 shadow-gray-900/20"
                            : "bg-[#06D6A0] hover:bg-[#05b588] shadow-[#06D6A0]/20"
                        }`}
                      >
                        {isFollowing ? <UserMinus size={18} /> : <UserPlus size={18} />}
                        {isFollowing ? "Unfollow" : "Follow"}
                      </button>
                    </div>
                  )}
                </div>

                {/* STATS ROW */}
                {!isBlocked && (
                  <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-700 border-t border-gray-100 dark:border-gray-700 pt-6 mt-6">
                    <div className="text-center px-2">
                      <span className="block text-2xl font-black text-gray-900 dark:text-white">
                        {followersCount.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-1 block">Followers</span>
                    </div>
                    <div className="text-center px-2">
                      <span className="block text-2xl font-black text-gray-900 dark:text-white">
                        {followingCount.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-1 block">Following</span>
                    </div>
                    <div className="text-center px-2">
                      <span className="block text-2xl font-black text-[#06D6A0]">
                        {transactionCount.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-1 block">Transactions</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* CONTENT AREA */}
            {isBlocked ? (
              <div className="p-10 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-3xl text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mb-4">
                  <Shield size={32} />
                </div>
                <h3 className="text-xl font-black text-red-600 dark:text-red-400 mb-2">User Blocked</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-sm">You cannot see their profile details, activity, or interact with them.</p>
                <button
                  onClick={handleUnblock}
                  className="px-8 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition active:scale-[0.98]"
                >
                  Unblock User
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* About Me Section */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-[#06D6A0]" /> About
                  </h3>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
                      {userData.aboutMe}
                    </p>
                  </div>
                </div>

                {/* Actions / Danger Zone */}
                {currentUser.uid !== uid && (
                  <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Privacy Actions</h3>
                      <button
                        onClick={handleBlock}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition active:scale-[0.98]"
                      >
                        <Shield size={18} /> Block User
                      </button>
                    </div>
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
            const isActive = link.path === '/users'; // Highlight Users tab
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