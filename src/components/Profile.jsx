import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged, signOut, deleteUser, updateProfile } from "firebase/auth";
import { useContext } from "react";
import { TransactionContext } from "../context/TransactionContext"; 
import { 
  Home, CreditCard, Target, Search, Users, User, 
  Menu, ChevronLeft, Calendar, Clock, Edit3, Share2, Trash2, Camera
} from "lucide-react";
import { HiX } from "react-icons/hi";

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
  const [user, setUser] = useState(null);
  
  // Profile State
  const [profile, setProfile] = useState({
    name: "",
    picURL: "https://i.imgur.com/1xAP7pJ.png",
    aboutMe: "", // New Field
    followersCount: 0, // New Field
    followingCount: 0, // New Field
    createdAt: null,
    lastLogin: null
  });

  const { transactions = [] } = useContext(TransactionContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
        // await loadSocialStats(currentUser.uid); // <--- TODO: UNCOMMENT TO LOAD FOLLOWS
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
            aboutMe: data.aboutMe || "", // Load About Me if exists
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

  /* -----------------------------------------------------------------------
     TODO: IMPLEMENTATION INSTRUCTIONS FOR FOLLOWERS / FOLLOWING
     -----------------------------------------------------------------------
     1. Ensure you have a 'follows' collection in Firebase.
     2. Documents should look like: { followerId: "uid_a", followingId: "uid_b" }
     3. Uncomment the function below and the call in useEffect above.
  */
  
  /*
  const loadSocialStats = async (uid) => {
    try {
        // Count Followers (People who follow ME)
        const followersQuery = query(collection(db, "follows"), where("followingId", "==", uid));
        const followersSnap = await getDocs(followersQuery);
        
        // Count Following (People I follow)
        const followingQuery = query(collection(db, "follows"), where("followerId", "==", uid));
        const followingSnap = await getDocs(followingQuery);

        setProfile(prev => ({
            ...prev,
            followersCount: followersSnap.size,
            followingCount: followingSnap.size
        }));
    } catch (e) {
        console.error("Error loading social stats:", e);
    }
  };
  */

  /* ------------------------------------------------- 
     2. Handlers 
  ------------------------------------------------- */
  
  const handleChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });

  const handleCopyProfileUrl = async () => {
    const uid = user?.uid;
    if (!uid) return;
    const profileUrl = `https://fundflow.ing/users/${uid}`;
    await navigator.clipboard.writeText(profileUrl);
    alert("Profile link copied!");
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);

    try {
      await setDoc(
        doc(db, "users", user.uid),
        { 
            name: profile.name, 
            aboutMe: profile.aboutMe, // <--- SAVING ABOUT ME
            updatedAt: serverTimestamp() 
        },
        { merge: true }
      );

      await updateProfile(user, { displayName: profile.name });
      alert("Profile updated!");
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
      // Add logic to delete subcollections if necessary
      await deleteDoc(doc(db, "users", user.uid));
      await deleteUser(user);
      alert("Account deleted.");
      navigate("/login");
    } catch (e) {
      console.error("Delete error:", e);
      alert("Failed to delete account.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  // Helper for Commas
  const formatNumber = (num) => num ? num.toLocaleString() : "0";

  const navLinks = [ "Dashboard", "Transactions", "Goals", "Connections", "Users", "Social", "Profile", "Wrapped" ];

  if (loading) return <p className="text-center text-white mt-10">Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-['Lexend_Deca'] transition-colors duration-200">

      {/* ───────── COLLAPSIBLE SIDEBAR ───────── */}
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
                ${link === 'Profile' 
                  ? 'bg-[#06D6A0] text-white shadow-md' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'}
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
        title={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
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
        
        {/* PROFILE CARD CONTAINER */}
        <div className="max-w-4xl mx-auto">
            
            {/* 1. Header Card */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-6 relative">
                {/* Background Banner */}
                <div className="h-32 bg-gradient-to-r from-[#06D6A0] to-teal-600"></div>
                
                <div className="px-8 pb-8">
                    <div className="flex flex-col md:flex-row items-center md:items-end -mt-12 mb-6 gap-6">
                        {/* Avatar */}
                        <div className="relative group">
                            <img
                                src={profile.picURL}
                                alt="Profile"
                                className="w-32 h-32 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-md bg-white"
                            />
                            <button 
                                onClick={() => navigate('/edit-picture')}
                                className="absolute bottom-0 right-0 p-2 bg-gray-900 text-white rounded-full hover:bg-black transition shadow-lg"
                                title="Change Picture"
                            >
                                <Camera size={16} />
                            </button>
                        </div>

                        {/* Name & Title */}
                        <div className="flex-1 text-center md:text-left">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                                {profile.name || "FundFlow User"}
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center justify-center md:justify-start gap-2">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                Online Now
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button 
                                onClick={handleCopyProfileUrl}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                            >
                                <Share2 size={18} /> <span className="hidden sm:inline">Share</span>
                            </button>
                            <button 
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition"
                            >
                                Logout
                            </button>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-700 border-t border-gray-200 dark:border-gray-700 pt-6">
                        <div className="text-center px-4">
                            <span className="block text-2xl font-bold text-gray-900 dark:text-white">
                                {formatNumber(profile.followersCount)}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Followers</span>
                        </div>
                        <div className="text-center px-4">
                            <span className="block text-2xl font-bold text-gray-900 dark:text-white">
                                {formatNumber(profile.followingCount)}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Following</span>
                        </div>
                        <div className="text-center px-4">
                            <span className="block text-2xl font-bold text-[#06D6A0]">
                                {formatNumber(transactions.length)}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Transactions</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Edit Form */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <Edit3 className="w-5 h-5 text-[#06D6A0]" /> Edit Profile
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display Name</label>
                            <input
                                name="name"
                                value={profile.name || ""}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#06D6A0] outline-none transition"
                                placeholder="Jane Doe"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">About Me</label>
                            <textarea
                                name="aboutMe"
                                value={profile.aboutMe || ""}
                                onChange={handleChange}
                                rows="4"
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#06D6A0] outline-none transition resize-none"
                                placeholder="Tell us about your financial journey..."
                            ></textarea>
                        </div>

                        <div className="flex items-center gap-4 pt-2">
                            <button
                                onClick={handleSaveProfile}
                                disabled={saving}
                                className="px-6 py-2 bg-[#06D6A0] text-white font-semibold rounded-lg hover:bg-[#05b588] transition disabled:opacity-50"
                            >
                                {saving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Info & Danger Zone */}
                <div className="space-y-6">
                    
                    {/* Info Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Account Info</h3>
                        <ul className="space-y-4">
                            <li className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                <Calendar className="w-5 h-5 text-gray-400" />
                                <div>
                                    <span className="block font-medium">Joined</span>
                                    <span className="text-xs text-gray-500">
                                        {profile.createdAt?.seconds 
                                            ? new Date(profile.createdAt.seconds * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) 
                                            : "N/A"
                                        }
                                    </span>
                                </div>
                            </li>
                            <li className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                <Clock className="w-5 h-5 text-gray-400" />
                                <div>
                                    <span className="block font-medium">Last Active</span>
                                    <span className="text-xs text-gray-500">
                                        {profile.lastLogin?.seconds 
                                            ? new Date(profile.lastLogin.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                                            : "N/A"
                                        }
                                    </span>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30 p-6">
                        <h3 className="text-sm font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2">Danger Zone</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                            Once you delete your account, there is no going back. Please be certain.
                        </p>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-medium rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition"
                        >
                            <Trash2 size={16} /> Delete Account
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* DELETE MODAL */}
        {showDeleteModal && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete Account?</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
                        This action allows you to delete your account. To verify, please type your email: 
                        <span className="font-bold block mt-1 select-all">{user.email}</span>
                    </p>

                    <input
                        type="email"
                        placeholder="Enter your email to confirm"
                        value={confirmEmail}
                        onChange={(e) => setConfirmEmail(e.target.value)}
                        className="w-full px-4 py-2 mb-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => { setShowDeleteModal(false); setConfirmEmail(""); }}
                            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDeleteAccount}
                            disabled={confirmEmail !== user.email}
                            className={`px-4 py-2 rounded-lg text-white font-medium transition ${
                                confirmEmail === user.email
                                ? "bg-red-600 hover:bg-red-700"
                                : "bg-red-300 dark:bg-red-900/50 cursor-not-allowed"
                            }`}
                        >
                            Delete Forever
                        </button>
                    </div>
                </div>
            </div>
        )}

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

export default Profile;