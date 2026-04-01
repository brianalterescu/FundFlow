import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles,
  ChevronLeft
} from "lucide-react";
import { auth, provider, db } from "../firebaseConfig.js";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
// SEO Metadata (Can be moved to Helmet)
const SEO_TITLE = "Sign Up | FundFlow";
const SEO_DESC = "Create your free FundFlow account today. The secure, manual personal finance tracker designed to help you take control of your money.";

export default function SignUp() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
const handleSignUp = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.passwordRepeat) return alert("Passwords do not match!");
    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const newUser = userCredential.user;

      await setDoc(doc(db, "users", newUser.uid), {
        uid: newUser.uid,
        email: newUser.email,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        firstName: formData.firstName,
        lastName: formData.lastName,
        picURL: "https://i.imgur.com/1xAP7pJ.png", 
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });
      navigate("/onboarding"); 
    } catch (error) {
      console.error("Signup Error:", error);
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-['Lexend_Deca'] bg-white dark:bg-[#0b0f19] text-gray-900 dark:text-gray-100 selection:bg-[#06D6A0] selection:text-white">
      
      {/* --- SEO HIDDEN TAGS --- */}
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

          <h2 className="text-3xl sm:text-4xl font-black mb-2 tracking-tight">Create your account</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Start tracking your finances for free today.</p>

          {/* Social Auth Buttons */}
          <div className="space-y-3 mb-8">
            {/* Active Google Button */}
            <button className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 hover:shadow-sm transition-all">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            <div className="grid grid-cols-2 gap-3">
              {/* Apple (Coming Soon) */}
              <button disabled className="relative flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed group overflow-hidden">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.15 2.95.97 3.81 2.26-3.1 1.83-2.58 6.02.6 7.22-.64 1.57-1.54 3.25-3.06 3.53zM12.03 6.94c-.16-2.57 2.18-4.77 4.54-4.94.34 2.76-2.4 4.96-4.54 4.94z"/>
                </svg>
                Apple
                <div className="absolute inset-0 bg-white/60 dark:bg-black/40 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-bold text-gray-900 dark:text-white uppercase tracking-wider bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-sm">Coming Soon</span>
                </div>
              </button>

              {/* Microsoft (Coming Soon) */}
              <button disabled className="relative flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed group overflow-hidden">
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
            <span className="text-sm text-gray-400 font-medium uppercase tracking-wider">Or register with email</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800"></div>
          </div>

          {/* Email/Password Form */}
         <form onSubmit={handleSignUp} className="space-y-5">
  {/* First & Last Name Grid */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* First Name */}
    <div>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">First Name</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <User className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          name="firstName"
          value={formData.firstName}
          onChange={handleChange}
          required
          placeholder="John"
          className="block w-full pl-11 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#06D6A0] focus:border-transparent outline-none transition-all"
        />
      </div>
    </div>

    {/* Last Name */}
    <div>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Last Name</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <User className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          name="lastName"
          value={formData.lastName}
          onChange={handleChange}
          required
          placeholder="Pork"
          className="block w-full pl-11 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#06D6A0] focus:border-transparent outline-none transition-all"
        />
      </div>
    </div>
  </div>

  {/* Email Address */}
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

  {/* Password */}
  <div>
    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Password</label>
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
    {/* Password strength visual indicator */}
    <div className="flex gap-1 mt-2">
      <div className={`h-1 flex-1 rounded-full ${formData.password.length > 0 ? 'bg-red-400' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
      <div className={`h-1 flex-1 rounded-full ${formData.password.length > 5 ? 'bg-amber-400' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
      <div className={`h-1 flex-1 rounded-full ${formData.password.length > 8 ? 'bg-[#06D6A0]' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
    </div>
  </div>

  {/* Confirm Password */}
  <div>
    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Confirm Password</label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <ShieldCheck className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type="password"
        name="passwordRepeat"
        value={formData.passwordRepeat}
        onChange={handleChange}
        required
        placeholder="••••••••"
        className={`block w-full pl-11 pr-4 py-3 border rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:border-transparent outline-none transition-all ${
          formData.passwordRepeat && formData.password !== formData.passwordRepeat 
          ? 'border-red-400 focus:ring-red-400' 
          : 'border-gray-200 dark:border-gray-700 focus:ring-[#06D6A0]'
        }`}
      />
    </div>
    {formData.passwordRepeat && formData.password !== formData.passwordRepeat && (
      <p className="text-xs text-red-500 mt-1 ml-1 font-medium">Passwords do not match</p>
    )}
  </div>

  {/* Remember Me */}
  <div className="flex items-center justify-between">
    <div className="flex items-center">
      <input
        id="remember-me"
        name="remember"
        type="checkbox"
        checked={formData.remember}
        onChange={handleChange}
        className="h-4 w-4 text-[#06D6A0] focus:ring-[#06D6A0] border-gray-300 dark:border-gray-700 rounded cursor-pointer"
      />
      <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
        Remember me
      </label>
    </div>
  </div>

  <button
    type="submit"
    disabled={isLoading || (formData.password !== formData.passwordRepeat)}
    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-[#06D6A0] hover:bg-[#05b588] text-white font-bold rounded-xl shadow-lg shadow-[#06D6A0]/20 hover:shadow-[#06D6A0]/40 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
  >
    {isLoading ? (
      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
    ) : (
      <>Create Account <ArrowRight size={18} /></>
    )}
  </button>
</form>

          <p className="mt-8 text-center text-gray-600 dark:text-gray-400 text-sm font-medium">
            Already have an account?{" "}
            <Link to="/login" className="text-[#06D6A0] hover:underline font-bold">
              Log In
            </Link>
          </p>
        </div>
      </div>

      {/* --- RIGHT PANEL: BRANDING / SOCIAL PROOF --- */}
      <div className="hidden lg:flex w-1/2 bg-gray-50 dark:bg-gray-900 relative items-center justify-center p-12 overflow-hidden border-l border-gray-200 dark:border-gray-800">
        
        {/* Background Decorative Gradients */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#06D6A0]/10 rounded-full blur-[100px] translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px] -translate-x-1/3 translate-y-1/3 pointer-events-none"></div>

        <div className="relative z-10 max-w-lg w-full">
          {/* Glass Card */}
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 rounded-3xl p-10 shadow-2xl">
            <div className="w-14 h-14 bg-[#06D6A0] rounded-2xl flex items-center justify-center text-white mb-8 shadow-lg shadow-[#06D6A0]/30">
              <Sparkles className="w-7 h-7" />
            </div>
            
            <h3 className="text-3xl font-black text-gray-900 dark:text-white leading-tight mb-4">
              Stop wondering where your money went.
            </h3>
            
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              Join thousands of people who have ditched messy spreadsheets and automated budget apps that constantly break.
            </p>

            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-gray-700 dark:text-gray-200 font-medium">
                <div className="w-6 h-6 rounded-full bg-[#06D6A0]/20 flex items-center justify-center text-[#06D6A0]">
                  <ShieldCheck size={14} />
                </div>
                100% Manual Data Entry (No Bank Logins)
              </li>
              <li className="flex items-center gap-3 text-gray-700 dark:text-gray-200 font-medium">
                <div className="w-6 h-6 rounded-full bg-[#06D6A0]/20 flex items-center justify-center text-[#06D6A0]">
                  <ShieldCheck size={14} />
                </div>
                Your data is never sold to advertisers
              </li>
              <li className="flex items-center gap-3 text-gray-700 dark:text-gray-200 font-medium">
                <div className="w-6 h-6 rounded-full bg-[#06D6A0]/20 flex items-center justify-center text-[#06D6A0]">
                  <ShieldCheck size={14} />
                </div>
                Free to use, forever
              </li>
            </ul>

            {/* Mock Testimonial */}
            {/* <div className="mt-10 p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
              <p className="text-gray-600 dark:text-gray-400 italic text-sm mb-4">
                "FundFlow completely changed how I look at my expenses. Because I input everything manually, I'm actually conscious of what I'm spending."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500"></div>
                <div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">Alex M.</div>
                  <div className="text-xs text-gray-500">Software Engineer</div>
                </div>
              </div>
            </div> */}
            
          </div>
        </div>
      </div>

    </div>
  );
}