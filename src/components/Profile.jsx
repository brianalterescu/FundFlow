import { useState, useEffect, useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged, signOut, deleteUser, updateProfile } from "firebase/auth";
import { TransactionContext } from "../context/TransactionContext"; 

import { 
  Home, CreditCard, Target, Users, User, 
  Calendar, Clock, Edit3, Share2, Trash2, Camera,
  LogOut, Activity, Sparkles, TrendingUp, MessageSquare, Link as LinkIcon
} from "lucide-react";

import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  
  // Profile State
  const [profile, setProfile] = useState({
    name: "",
    picURL: "https://i.imgur.com/1xAP7pJ.png",
    aboutMe: "", 
    createdAt: null,
    lastLogin: null
  });

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const { transactions = [] } = useContext(TransactionContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // UI State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");

  /* ------------------------------------------------- 
     1. Authentication & Data Loading 
  ------------------------------------------------- */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await loadUserData(currentUser);
        await loadSocialStats(currentUser.uid); 
      } else {
        navigate("/login");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  const loadUserData = async (currentUser) => {
    try {
      const userRef = doc(db, "users", currentUser.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();
        setProfile(prev => ({
            ...prev,
            ...data,
            picURL: data.picURL || "https://i.imgur.com/1xAP7pJ.png",
            aboutMe: data.aboutMe || "", 
        }));
      } else {
        await setDoc(userRef, {
          email: currentUser.email,
          uid: currentUser.uid,
          name: currentUser.displayName || "",
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        });
      }
    } catch (e) {
      console.error("Error loading user:", e);
    }
  };

  const loadSocialStats = async (uid) => {
    try {
      const followsRef = collection(db, "follows");

      // Count Followers (People who follow ME -> followedID is ME)
      const followersQuery = query(followsRef, where("followedID", "==", uid));
      const followersSnap = await getDocs(followersQuery);
      setFollowersCount(followersSnap.size);
      
      // Count Following (People I follow -> followerID is ME)
      const followingQuery = query(followsRef, where("followerID", "==", uid));
      const followingSnap = await getDocs(followingQuery);
      setFollowingCount(followingSnap.size);
    } catch (e) {
      console.error("Error loading social stats:", e);
    }
  };

  /* ------------------------------------------------- 
     2. Handlers 
  ------------------------------------------------- */
  
  const handleChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });

  const handleCopyProfileUrl = async () => {
    const uid = user?.uid;
    if (!uid) return;
    const profileUrl = `https://fundflow.ing/users/${uid}`;
    await navigator.clipboard.writeText(profileUrl);
    alert("Profile link copied to clipboard!");
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);

    try {
      await setDoc(
        doc(db, "users", user.uid),
        { 
            name: profile.name, 
            aboutMe: profile.aboutMe, 
            updatedAt: serverTimestamp() 
        },
        { merge: true }
      );

      await updateProfile(user, { displayName: profile.name });
      alert("Profile updated successfully!");
    } catch (e) {
      console.error("Error:", e);
      alert("Error saving profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (confirmEmail !== user.email) return alert("Email does not match.");

    try {
      await deleteDoc(doc(db, "users", user.uid));
      await deleteUser(user);
      navigate("/login");
    } catch (e) {
      console.error("Delete error:", e);
      alert("Failed to delete account. You may need to sign in again to verify your identity.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const formatNumber = (num) => num ? num.toLocaleString() : "0";

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

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0b0f19] text-gray-900 dark:text-white font-['Lexend_Deca'] overflow-hidden dark:[color-scheme:dark]">

      {/* ───────── SIDEBAR ───────── */}
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
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ───────── MAIN CONTENT ───────── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* HEADER */}
        <header className="h-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 lg:px-10 z-10 sticky top-0 flex-shrink-0">
          <div>
            <h1 className="text-2xl font-black tracking-tight">My Profile</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <img src={profile.picURL} alt="Avatar" className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 object-cover shadow-sm" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="max-w-4xl mx-auto space-y-6 pb-24 md:pb-8">
            
            {/* 1. Header Card */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden relative">
              {/* Background Banner */}
              <div className="h-32 bg-gradient-to-r from-[#06D6A0] to-blue-500 relative overflow-hidden">
                 <div className="absolute inset-0 bg-white/20 dark:bg-black/20 mix-blend-overlay"></div>
              </div>
              
              <div className="px-6 sm:px-8 pb-8">
                <div className="flex flex-col md:flex-row items-center md:items-end -mt-12 mb-6 gap-6">
                  {/* Avatar */}
                  <div className="relative group z-10">
                    <img
                      src={profile.picURL}
                      alt="Profile"
                      className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-md bg-gray-100 dark:bg-gray-900"
                      onError={(e) => (e.target.src = "https://i.imgur.com/1xAP7pJ.png")}
                    />
                    <button 
                      onClick={() => navigate('/editpicture')}
                      className="absolute bottom-1 right-1 p-2 bg-gray-900 dark:bg-gray-700 text-white rounded-full hover:bg-black dark:hover:bg-gray-600 transition shadow-lg border-2 border-white dark:border-gray-800"
                      title="Change Picture"
                    >
                      <Camera size={16} />
                    </button>
                  </div>

                  {/* Name & Title */}
                  <div className="flex-1 text-center md:text-left z-10 pt-2 md:pt-0">
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-1">
                      {profile.name || "FundFlow User"}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium flex items-center justify-center md:justify-start gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      Online Now
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
                    <button 
                      onClick={handleCopyProfileUrl}
                      className="flex-1 md:flex-none flex justify-center items-center gap-2 px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                    >
                      <Share2 size={18} /> Share
                    </button>
                    <button 
                      onClick={handleLogout}
                      className="flex-1 md:flex-none flex justify-center items-center gap-2 px-6 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition"
                    >
                      Log Out
                    </button>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-700 border-t border-gray-100 dark:border-gray-700 pt-6">
                  <div className="text-center px-2">
                    <span className="block text-2xl font-black text-gray-900 dark:text-white">
                      {formatNumber(followersCount)}
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-1 block">Followers</span>
                  </div>
                  <div className="text-center px-2">
                    <span className="block text-2xl font-black text-gray-900 dark:text-white">
                      {formatNumber(followingCount)}
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-1 block">Following</span>
                  </div>
                  <div className="text-center px-2">
                    <span className="block text-2xl font-black text-[#06D6A0]">
                      {formatNumber(transactions.length)}
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-1 block">Transactions</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Edit Form */}
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-[#06D6A0]" /> Edit Profile
                </h2>

                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1 mb-2 block">Display Name</label>
                    <input
                      name="name"
                      value={profile.name || ""}
                      onChange={handleChange}
                      className="w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#06D6A0] outline-none transition-all text-sm"
                      placeholder="Jane Doe"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1 mb-2 block">About Me</label>
                    <textarea
                      name="aboutMe"
                      value={profile.aboutMe || ""}
                      onChange={handleChange}
                      rows="4"
                      className="w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#06D6A0] outline-none transition-all resize-none text-sm leading-relaxed"
                      placeholder="Tell us about your financial journey..."
                    ></textarea>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="w-full sm:w-auto px-8 py-3.5 bg-[#06D6A0] text-white font-bold rounded-xl shadow-lg shadow-[#06D6A0]/20 hover:shadow-[#06D6A0]/40 hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center"
                    >
                      {saving ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : "Save Changes"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Info & Danger Zone */}
              <div className="space-y-6">
                
                {/* Info Card */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5">Account Info</h3>
                  <ul className="space-y-5">
                    <li className="flex items-center gap-3">
                      <div className="p-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400"><Calendar size={18} /></div>
                      <div>
                        <span className="block text-sm font-bold text-gray-900 dark:text-white">Joined</span>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {profile.createdAt?.seconds 
                            ? new Date(profile.createdAt.seconds * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) 
                            : "Recently"
                          }
                        </span>
                      </div>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="p-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400"><Clock size={18} /></div>
                      <div>
                        <span className="block text-sm font-bold text-gray-900 dark:text-white">Last Active</span>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {profile.lastLogin?.seconds 
                            ? new Date(profile.lastLogin.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                            : "Just Now"
                          }
                        </span>
                      </div>
                    </li>
                  </ul>
                </div>

                {/* Danger Zone */}
                <div className="bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/30 p-6">
                  <h3 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-widest mb-3">Danger Zone</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-5 leading-relaxed font-medium">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition active:scale-[0.98]"
                  >
                    <Trash2 size={16} /> Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900/60 z-[100] p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700 animate-fade-in-up">
            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">Delete Account?</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">
              This action cannot be undone. To verify, please type your email: 
              <span className="font-bold text-gray-900 dark:text-white block mt-2 select-all p-2 bg-gray-100 dark:bg-gray-900 rounded-lg">{user.email}</span>
            </p>

            <input
              type="email"
              placeholder="Enter your email to confirm"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className="w-full px-4 py-3.5 mb-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none transition-all text-sm"
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setConfirmEmail(""); }}
                className="flex-1 py-3.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={confirmEmail !== user.email}
                className={`flex-1 py-3.5 rounded-xl text-white font-bold transition active:scale-[0.98] ${
                  confirmEmail === user.email
                  ? "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20"
                  : "bg-red-300 dark:bg-red-900/50 cursor-not-allowed opacity-70"
                }`}
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAV */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50 pb-safe">
        <div className="flex justify-around items-center px-2">
          {NAV_LINKS.slice(0, 5).map((link) => {
            const isActive = link.path === '/profile'; // Highlight Profile tab
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

export default Profile;