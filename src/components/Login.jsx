import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Home2.css"; // Keep your global styling
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  ChevronLeft,
  TrendingUp,
  PieChart,
  AlertCircle
} from "lucide-react";

// --- FIREBASE IMPORTS ---
import { auth, db } from "../firebaseConfig";
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";

// SEO Metadata
const SEO_TITLE = "Log In | FundFlow";
const SEO_DESC = "Log in to your FundFlow account to track your expenses, update your budget, and check your financial goals.";

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(""); // State to handle login errors

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(""); // Clear error when user starts typing again
  };

  // --- STANDARD EMAIL LOGIN ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      
      // Update last login timestamp
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, { lastLogin: serverTimestamp() });

      navigate("/dashboard"); 
    } catch (err) {
      console.error("Login Error:", err);
      setError("Invalid email or password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- GOOGLE SIGN IN ---
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");
    
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user exists in our Firestore database
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);

      if (!docSnap.exists()) {
        // First time logging in with Google! Create their profile.
        await setDoc(userRef, {
          uid: user.uid,
          name: user.displayName || "New User",
          email: user.email,
          picURL: user.photoURL || "https://i.imgur.com/1xAP7pJ.png",
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        });
      } else {
        // Returning user, just update their last login
        await updateDoc(userRef, { lastLogin: serverTimestamp() });
      }

      navigate("/dashboard");
    } catch (err) {
      console.error("Google Auth Error:", err);
      // Ignore error if user just closed the popup
      if (err.code !== 'auth/popup-closed-by-user') {
        setError("Failed to sign in with Google.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-['Lexend_Deca'] bg-white dark:bg-[#0b0f19] text-gray-900 dark:text-gray-100 selection:bg-[#06D6A0] selection:text-white">
      
      <h1 className="sr-only">{SEO_TITLE}</h1>
      <p className="sr-only">{SEO_DESC}</p>

      {/* --- LEFT PANEL: THE FORM --- */}
      <div className="w-full lg:w-1/2 flex flex-col px-6 sm:px-12 md:px-20 lg:px-24 py-10 justify-center relative">
        
        {/* Back to Home */}
        <Link to="/" className="absolute top-8 left-6 sm:left-12 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#06D6A0] transition-colors">
          <ChevronLeft size={16} /> Back to Home
        </Link>

        <div className="w-full max-w-md mx-auto mt-12 lg:mt-0 animate-fade-in-up">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <img src="./FundFlow-Favicon.png" alt="FundFlow Logo" className="h-10 w-10" />
            <span className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
              <span className="text-[#06D6A0]">Fund</span>Flow
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black mb-2 tracking-tight">Welcome back</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Please enter your details to sign in.</p>

          {/* ERROR ALERT */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 animate-fade-in-up">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Social Auth Buttons */}
          <div className="space-y-3 mb-8">
            {/* Active Google Button */}
            <button 
              type="button" 
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Log in with Google
            </button>

            <div className="grid grid-cols-2 gap-3">
              {/* Apple (Coming Soon) */}
              <button disabled type="button" className="relative flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed group overflow-hidden">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.15 2.95.97 3.81 2.26-3.1 1.83-2.58 6.02.6 7.22-.64 1.57-1.54 3.25-3.06 3.53zM12.03 6.94c-.16-2.57 2.18-4.77 4.54-4.94.34 2.76-2.4 4.96-4.54 4.94z"/>
                </svg>
                Apple
                <div className="absolute inset-0 bg-white/60 dark:bg-black/40 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-bold text-gray-900 dark:text-white uppercase tracking-wider bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-sm">Coming Soon</span>
                </div>
              </button>

              {/* Microsoft (Coming Soon) */}
              <button disabled type="button" className="relative flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed group overflow-hidden">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#F25022" d="M1 1h10v10H1z"/>
                  <path fill="#7FBA00" d="M13 1h10v10H13z"/>
                  <path fill="#00A4EF" d="M1 13h10v10H1z"/>
                  <path fill="#FFB900" d="M13 13h10v10H13z"/>
                </svg>
                Microsoft
                <div className="absolute inset-0 bg-white/60 dark:bg-black/40 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-bold text-gray-900 dark:text-white uppercase tracking-wider bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-sm">Coming Soon</span>
                </div>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800"></div>
            <span className="text-sm text-gray-400 font-medium uppercase tracking-wider">Or log in with email</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800"></div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="you@example.com"
                  className="block w-full pl-11 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#06D6A0] focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Password</label>
                <Link to="/forgot-password" className="text-sm font-medium text-[#06D6A0] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="••••••••"
                  className="block w-full pl-11 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#06D6A0] focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-[#06D6A0] hover:bg-[#05b588] text-white font-bold rounded-xl shadow-lg shadow-[#06D6A0]/20 hover:shadow-[#06D6A0]/40 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-4"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>Sign In <ArrowRight size={18} /></>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-gray-600 dark:text-gray-400 text-sm font-medium">
            Don't have an account?{" "}
            <Link to="/signup" className="text-[#06D6A0] hover:underline font-bold">
              Sign Up
            </Link>
          </p>
        </div>
      </div>

      {/* --- RIGHT PANEL: DASHBOARD TEASER --- */}
      <div className="hidden lg:flex w-1/2 bg-gray-50 dark:bg-gray-900 relative items-center justify-center p-12 overflow-hidden border-l border-gray-200 dark:border-gray-800">
        
        {/* Background Decorative Gradients */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[100px] translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#06D6A0]/10 rounded-full blur-[100px] -translate-x-1/3 translate-y-1/3 pointer-events-none"></div>

        <div className="relative z-10 w-full max-w-lg">
          <div className="text-center mb-8 animate-fade-in-up">
            <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-3">Great to see you again.</h3>
            <p className="text-gray-500 dark:text-gray-400 text-lg">Your dashboard is ready and waiting.</p>
          </div>

          {/* Glass Mockup Cards */}
          <div className="space-y-6">
            
            {/* Mock Stat Card 1 */}
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 rounded-3xl p-6 shadow-xl transform rotate-1 hover:rotate-0 transition-transform duration-500 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#06D6A0]/20 flex items-center justify-center text-[#06D6A0]">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">Net Worth</h4>
                    <p className="text-xs text-gray-500">Updated today</p>
                  </div>
                </div>
                <div className="text-right">
                  <h4 className="font-black text-xl text-gray-900 dark:text-white">$14,250</h4>
                  <p className="text-xs font-bold text-[#06D6A0]">+2.4% this month</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <div className="bg-[#06D6A0] h-1.5 w-[75%] rounded-full"></div>
              </div>
            </div>

            {/* Mock Stat Card 2 */}
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 rounded-3xl p-6 shadow-xl transform -rotate-1 hover:rotate-0 transition-transform duration-500 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-500">
                    <PieChart size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">Monthly Spend</h4>
                    <p className="text-xs text-gray-500">vs. $3,000 budget</p>
                  </div>
                </div>
                <div className="text-right">
                  <h4 className="font-black text-xl text-gray-900 dark:text-white">$1,840</h4>
                  <p className="text-xs font-bold text-gray-500">61% used</p>
                </div>
              </div>
              <div className="flex gap-1 h-2 w-full rounded-full overflow-hidden">
                <div className="bg-blue-500 w-[40%]"></div>
                <div className="bg-purple-500 w-[15%]"></div>
                <div className="bg-[#06D6A0] w-[6%]"></div>
                <div className="bg-gray-200 dark:bg-gray-700 flex-1"></div>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}