import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
  Home, CreditCard, Target, Users, User, ChevronLeft, Menu, Share2, Shield, UserPlus, UserMinus, MessageSquare
} from "lucide-react";
import { HiX } from "react-icons/hi";

export default function ViewProfile() {
  const { uid } = useParams();
  const navigate = useNavigate();

  const [userData, setUserData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [transactionCount, setTransactionCount] = useState(0);

  // Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // AUTH LISTENER
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) navigate("/login");
      else setCurrentUser(user);
    });
    return () => unsubscribe();
  }, [navigate]);

  // LOAD PROFILE & RELATIONSHIPS
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
                picURL: data.picURL || "https://i.imgur.com/1xAP7pJ.png",
                aboutMe: data.aboutMe || "This user hasn't written a bio yet.", // Default bio
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

    if(currentUser) loadUserProfile();
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
    } catch (err) { console.error(err); }
  };

  const handleUnfollow = async () => {
    try {
      const q = query(collection(db, "follows"), where("followerID", "==", currentUser.uid), where("followedID", "==", uid));
      const snap = await getDocs(q);
      snap.forEach(async (d) => deleteDoc(d.ref));
      setIsFollowing(false);
    } catch (err) { console.error(err); }
  };

  const handleBlock = async () => {
    if(!window.confirm("Block this user? You won't see their posts or profile.")) return;
    try {
      // Remove follow relationships first
      const followsRef = collection(db, "follows");
      const qFollows = query(followsRef, where("followerID", "in", [currentUser.uid, uid]), where("followedID", "in", [currentUser.uid, uid]));
      const followSnap = await getDocs(qFollows);
      followSnap.forEach(async (d) => deleteDoc(d.ref));
      setIsFollowing(false);

      // Create Block
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

  const navLinks = [ "Dashboard", "Transactions", "Goals", "Connections", "Users", "Social", "Profile", "Wrapped" ];

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-500">Loading...</div>;
  if (!userData) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-500">User not found.</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-['Lexend_Deca'] transition-colors duration-200">

      {/* ───────── SIDEBAR ───────── */}
      <aside
        className={`
          hidden md:flex flex-col w-64 fixed inset-y-0 left-0 z-20
          bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
          p-6 space-y-6 transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
          <img src="/FundFlow-Favicon.png" className="h-10 w-auto object-contain" alt="FundFlow" />
          <span className="text-2xl font-bold tracking-tight text-gray-800 dark:text-white">
            <span className="text-[#06D6A0]">Fund</span>Flow
          </span>
        </div>
        <nav className="flex flex-col space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link}
              to={`/${link.toLowerCase().replace(/\s/g, "")}`}
              className={`
                px-3 py-2 rounded-lg transition text-sm font-medium whitespace-nowrap
                hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200
              `}
            >
              {link}
            </Link>
          ))}
        </nav>
      </aside>

      {/* TOGGLE BUTTON */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`
          hidden md:flex fixed bottom-6 z-30 p-3 rounded-full shadow-lg transition-all duration-300
          items-center justify-center
          ${isSidebarOpen 
            ? "left-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500" 
            : "left-6 bg-[#06D6A0] text-white hover:scale-110"}
        `}
      >
        {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 p-4 flex justify-between items-center z-50 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <img src="/FundFlow-Favicon.png" alt="Logo" className="h-8 w-auto" />
          <span className="text-xl font-bold text-gray-800 dark:text-white">
            <span className="text-[#06D6A0]">Fund</span>Flow
          </span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <HiX className="text-2xl dark:text-white" /> : <Menu className="text-2xl dark:text-white" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden fixed top-16 inset-x-0 bg-white dark:bg-gray-800 p-4 space-y-2 z-40 shadow-lg border-b border-gray-200 dark:border-gray-700">
          {navLinks.map((link) => (
            <Link
              key={link}
              to={`/${link.toLowerCase().replace(/\s/g, "")}`}
              className="block px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
              onClick={() => setMobileMenuOpen(false)}
            >
              {link}
            </Link>
          ))}
        </div>
      )}

      {/* ───────── MAIN CONTENT ───────── */}
      <main 
        className={`
          flex-1 p-6 mt-16 md:mt-0 pb-24 transition-all duration-300 ease-in-out
          ${isSidebarOpen ? "md:ml-64" : "md:ml-0"}
        `}
      >
        <div className="max-w-4xl mx-auto">
            
            {/* Header Card */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-6">
                <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                
                <div className="px-8 pb-8">
                    <div className="flex flex-col md:flex-row items-center md:items-end -mt-12 mb-6 gap-6">
                        <img
                            src={userData.picURL}
                            alt="Profile"
                            className="w-32 h-32 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-md bg-white"
                        />

                        <div className="flex-1 text-center md:text-left">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                                {userData.name || "Unknown User"}
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                Joined {userData.createdAt?.seconds ? new Date(userData.createdAt.seconds * 1000).getFullYear() : "Recently"}
                            </p>
                        </div>

                        {/* Action Buttons */}
                        {!isBlocked && (
                            <div className="flex gap-3">
                                <button 
                                    onClick={handleCopyProfileUrl}
                                    className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                    title="Share Profile"
                                >
                                    <Share2 size={20} />
                                </button>
                                <button 
                                    onClick={isFollowing ? handleUnfollow : handleFollow}
                                    className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-white transition shadow-md ${
                                        isFollowing 
                                        ? "bg-gray-800 dark:bg-gray-700 hover:bg-gray-900" 
                                        : "bg-[#06D6A0] hover:bg-[#05b588]"
                                    }`}
                                >
                                    {isFollowing ? <UserMinus size={18} /> : <UserPlus size={18} />}
                                    {isFollowing ? "Unfollow" : "Follow"}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Stats Row (Placeholders for Follows until implemented) */}
                    {!isBlocked && (
                        <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-700 border-t border-gray-200 dark:border-gray-700 pt-6">
                            <div className="text-center px-4">
                                <span className="block text-2xl font-bold text-gray-900 dark:text-white">-</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Followers</span>
                            </div>
                            <div className="text-center px-4">
                                <span className="block text-2xl font-bold text-gray-900 dark:text-white">-</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Following</span>
                            </div>
                            <div className="text-center px-4">
                                <span className="block text-2xl font-bold text-[#06D6A0]">
                                    {transactionCount.toLocaleString()}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Transactions</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isBlocked ? (
                <div className="p-8 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl text-center">
                    <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-red-600 dark:text-red-400">This user is blocked</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">You cannot see their profile details or activity.</p>
                    <button 
                        onClick={handleUnblock}
                        className="px-6 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                        Unblock User
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* About Me Section */}
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <User className="w-5 h-5 text-[#06D6A0]" /> About
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                            {userData.aboutMe}
                        </p>
                    </div>

                    {/* Actions / Danger Zone */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Actions</h3>
                            <button 
                                onClick={handleBlock}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-medium rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                            >
                                <Shield size={16} /> Block User
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="grid grid-cols-5 text-[11px]">
          {[
            { label: "Dashboard", icon: Home, to: "/dashboard" },
            { label: "Transactions", icon: CreditCard, to: "/transactions" },
            { label: "Goals", icon: Target, to: "/goals" },
            { label: "Social", icon: Users, to: "/social" },
            { label: "Profile", icon: User, to: "/profile" },
          ].map(({ label, icon: Icon, to }) => (
            <Link
              key={label}
              to={to}
              className="flex flex-col items-center justify-center py-3 transition hover:text-[#06d6a0] text-gray-500 dark:text-gray-400 active:scale-95"
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </nav>

    </div>
  );
}