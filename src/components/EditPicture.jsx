import React, { useState, useEffect } from "react";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate, Link, useLocation } from "react-router-dom";

// Icons
import { 
  Home, CreditCard, Target, Users, User, LogOut, ArrowLeft, PieChart as PieIcon,
  Image as ImageIcon, Save, Activity, Sparkles, TrendingUp, MessageSquare, Link as LinkIcon, 
} from "lucide-react";

export default function EditPicture() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [inputURL, setInputURL] = useState("");   
  const [previewURL, setPreviewURL] = useState(""); 
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Default fallback image
  const DEFAULT_PIC = "https://i.imgur.com/1xAP7pJ.png";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const docSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (docSnap.exists()) {
          const url = docSnap.data().picURL || "";
          setInputURL(url);    
          setPreviewURL(url);  
        }
      } else {
        navigate("/login"); 
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleSave = async () => {
    if (!inputURL.match(/\.(jpeg|jpg|gif|png|webp)$/i))
      return alert("Please enter a valid image URL ending in .jpg, .png, etc.");
    
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { picURL: inputURL });
      setPreviewURL(inputURL);
      // Removed the alert here to make it feel smoother, it will just redirect instantly
      navigate("/profile");
    } catch (error) {
      console.error("Error saving picture URL:", error);
      alert("Error saving picture URL — check console for details.");
    } finally {
      setSaving(false);
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
        { name: "CSV Uploading", path: "/csv", icon: Activity },
        { name: "Profile", path: "/profile", icon: User },
        { name: "Wrapped", path: "/wrapped", icon: Sparkles },
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
            const isActive = location.pathname === link.path || (link.path === '/profile' && location.pathname === '/editpicture');
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
            <h1 className="text-2xl font-black tracking-tight">Edit Avatar</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <img src={previewURL || DEFAULT_PIC} alt="Avatar" className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 object-cover shadow-sm" />
          </div>
        </header>

        {/* CENTERED EDIT CARD */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 flex items-center justify-center">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 animate-fade-in-up">
            
            <button onClick={() => navigate("/profile")} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors mb-6">
              <ArrowLeft size={16} /> Back to Profile
            </button>

            <div className="flex flex-col items-center text-center space-y-6">
              
              {/* IMAGE PREVIEW */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#06D6A0] to-blue-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
                <img
                  src={previewURL || DEFAULT_PIC}  
                  alt="preview"
                  className="relative w-32 h-32 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-xl"
                  onError={(e) => (e.target.src = DEFAULT_PIC)}
                />
                <div className="absolute bottom-0 right-0 p-2 bg-[#06D6A0] text-white rounded-full shadow-lg border-2 border-white dark:border-gray-800">
                  <ImageIcon size={16} />
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Profile Picture</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Paste a valid image URL to update your avatar.</p>
              </div>

              {/* INPUT BOX */}
              <div className="w-full space-y-2 text-left">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Image URL</label>
                <input
                  type="text"
                  value={inputURL}                
                  onChange={(e) => setInputURL(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 focus:ring-2 focus:ring-[#06D6A0] outline-none transition-all text-sm"
                />
              </div>

              {/* ACTION BUTTONS */}
              <div className="w-full flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPreviewURL(inputURL)}  
                  className="flex-1 py-3.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all text-sm"
                >
                  Preview
                </button>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-[2] py-3.5 bg-[#06D6A0] text-white font-bold rounded-xl shadow-lg shadow-[#06D6A0]/20 hover:shadow-[#06D6A0]/40 hover:-translate-y-0.5 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm disabled:opacity-70 disabled:hover:translate-y-0"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Save size={18} /> Save Avatar
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50 pb-safe">
        <div className="flex justify-around items-center px-2">
          {NAV_LINKS.slice(0, 5).map((link) => {
            const isActive = location.pathname === link.path || (link.path === '/profile' && location.pathname === '/editpicture');
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