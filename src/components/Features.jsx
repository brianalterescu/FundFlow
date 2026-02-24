import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  BarChart3,
  Users,
  FileDown,
  ArrowRight,
  Menu,
  Zap,
  Moon,
  Target,
  TrendingUp,
  Lock,
  Smartphone
} from "lucide-react";
import { HiX } from "react-icons/hi";

// SEO Metadata
const SEO_TITLE = "Features | FundFlow Personal Finance App";
const SEO_DESC = "Explore the features of FundFlow: Manual expense tracking, income forecasting, CSV exporting, social finance, and interactive budgeting dashboards. 100% Free.";

export default function Features() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col text-gray-900 dark:text-gray-100 font-['Lexend_Deca'] bg-gray-50 dark:bg-[#0b0f19] overflow-x-hidden selection:bg-[#06D6A0] selection:text-white">
      
      {/* --- SEO HIDDEN TAGS --- */}
      <h1 className="sr-only">{SEO_TITLE}</h1>
      <p className="sr-only">{SEO_DESC}</p>

      {/* --- FLOATING NAVBAR (Consistent) --- */}
      <header className="fixed top-4 inset-x-0 z-50 px-4 sm:px-6 flex justify-center">
        <div className="w-full max-w-6xl flex items-center justify-between px-6 py-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-full shadow-lg transition-all">
          
          <Link to="/" className="flex items-center gap-2 group">
            <img src="./FundFlow-Favicon.png" alt="FundFlow Logo" className="h-8 w-8 group-hover:scale-110 transition-transform" />
            <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              <span className="text-[#06D6A0]">Fund</span>Flow
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-300">
            <Link to="/features" className="text-[#06D6A0] font-bold">Features</Link>
            <Link to="/learn" className="hover:text-[#06D6A0] transition-colors">Learn</Link>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-[#06D6A0] transition-colors">
              Log In
            </Link>
            <Link to="/signup">
              <button className="px-5 py-2 text-sm font-bold rounded-full bg-[#06D6A0] text-white shadow-md shadow-[#06D6A0]/30 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                Get Started Free
              </button>
            </Link>
          </div>

          <button className="md:hidden text-gray-900 dark:text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <HiX size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed top-20 inset-x-4 z-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-4 flex flex-col gap-4 md:hidden">
            <Link to="/features" className="font-medium px-4 py-2 text-[#06D6A0] bg-[#06D6A0]/10 rounded-lg">Features</Link>
            <Link to="/learn" className="font-medium px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">Learn</Link>
            <div className="h-px bg-gray-200 dark:bg-gray-800 my-2"></div>
            <Link to="/login" className="font-medium px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">Log In</Link>
            <Link to="/signup" className="font-medium px-4 py-2 bg-[#06D6A0] text-white rounded-lg text-center">Sign Up Free</Link>
        </div>
      )}

      {/* --- HERO SECTION --- */}
      <section className="relative pt-36 pb-20 px-6 text-center z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#06D6A0]/10 rounded-full blur-[120px] -z-10 pointer-events-none"></div>

        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight mb-6 leading-tight">
            Built for clarity. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#06D6A0] to-blue-500">
              Designed for privacy.
            </span>
          </h2>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Discover the powerful tools inside FundFlow that help you manage your money, hit your goals, and understand your financial habits—without compromising your data.
          </p>
        </div>
      </section>

      {/* --- DEEP DIVE FEATURES (Alternating Layout) --- */}
      <main className="flex-1 w-full flex flex-col gap-24 lg:gap-32 pb-24">
        
        {/* Feature 1: Manual Tracking */}
        <section className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center group">
          <div className="order-2 lg:order-1 lg:pr-12">
            <div className="w-12 h-12 rounded-2xl bg-[#06D6A0]/10 flex items-center justify-center text-[#06D6A0] mb-6 border border-[#06D6A0]/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-3xl md:text-4xl font-black mb-4">100% Manual & Secure</h3>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
              We never ask for your bank login. Plaid and other syncing services frequently break and expose your raw financial data to third parties. FundFlow relies on you. Enter transactions manually or import a CSV from your bank in seconds.
            </p>
            <ul className="space-y-3 font-medium text-gray-700 dark:text-gray-300">
              <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-[#06D6A0]"></div> No broken bank connections</li>
              <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-[#06D6A0]"></div> Complete data ownership</li>
              <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-[#06D6A0]"></div> Zero advertising tracking</li>
            </ul>
          </div>
          
          {/* Abstract UI Mockup */}
          <div className="order-1 lg:order-2 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-[2rem] p-8 md:p-12 border border-gray-200 dark:border-gray-700 shadow-xl relative overflow-hidden group-hover:shadow-[#06D6A0]/10 transition-shadow duration-500">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="relative z-10 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 transform rotate-2 hover:rotate-0 transition-transform duration-500">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                <div className="font-bold text-lg">Add Transaction</div>
                <HiX className="text-gray-400" />
              </div>
              <div className="space-y-4">
                <div className="h-10 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center px-4"><span className="text-gray-400 text-sm">$ 45.00</span></div>
                <div className="h-10 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center px-4"><span className="text-gray-400 text-sm">Groceries</span></div>
                <div className="h-10 bg-[#06D6A0] rounded-lg shadow-md flex items-center justify-center text-white font-bold text-sm mt-2">Save Record</div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature 2: Analytics & Insights */}
        <section className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center group">
          {/* Abstract UI Mockup */}
          <div className="bg-gradient-to-br from-blue-50 to-teal-50 dark:from-gray-800 dark:to-gray-900 rounded-[2rem] p-8 md:p-12 border border-gray-200 dark:border-gray-700 shadow-xl relative overflow-hidden group-hover:shadow-blue-500/10 transition-shadow duration-500">
             <div className="relative z-10 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 transform -rotate-2 hover:rotate-0 transition-transform duration-500">
               <h4 className="font-bold text-sm text-gray-500 dark:text-gray-400 mb-6 uppercase tracking-wider">Monthly Spend</h4>
               <div className="flex items-end gap-3 h-32 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
                 <div className="w-1/5 bg-blue-400 rounded-t-md h-[40%]"></div>
                 <div className="w-1/5 bg-[#06D6A0] rounded-t-md h-[70%]"></div>
                 <div className="w-1/5 bg-purple-400 rounded-t-md h-[30%]"></div>
                 <div className="w-1/5 bg-[#06D6A0] rounded-t-md h-[90%] shadow-[0_0_15px_rgba(6,214,160,0.5)]"></div>
                 <div className="w-1/5 bg-amber-400 rounded-t-md h-[50%]"></div>
               </div>
               <div className="flex justify-between text-xs text-gray-400 font-medium">
                 <span>Food</span><span>Rent</span><span>Subs</span><span>Travel</span><span>Misc</span>
               </div>
             </div>
          </div>

          <div className="lg:pl-12">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-6 border border-blue-500/20">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-3xl md:text-4xl font-black mb-4">Powerful Visual Insights</h3>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
              Numbers in a spreadsheet are boring. FundFlow transforms your raw data into beautiful, interactive charts. Understand your spending trends, track your net worth over time, and generate a personal "Wrapped" report at the end of the year.
            </p>
            <ul className="space-y-3 font-medium text-gray-700 dark:text-gray-300">
              <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Category breakdown charts</li>
              <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Interactive Income Forecasting</li>
              <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Year-in-Review "Wrapped"</li>
            </ul>
          </div>
        </section>

        {/* Feature 3: Social Finance */}
        <section className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center group">
          <div className="order-2 lg:order-1 lg:pr-12">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 mb-6 border border-purple-500/20">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-3xl md:text-4xl font-black mb-4">Social Finance (Optional)</h3>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
              Who says budgeting has to be lonely? Connect with friends, follow personal finance creators, and share your milestones. Our social feed allows you to learn from others' strategies while keeping your exact dollar amounts strictly private.
            </p>
            <ul className="space-y-3 font-medium text-gray-700 dark:text-gray-300">
              <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Share updates and tips</li>
              <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Discover new budgeting methods</li>
              <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Opt-in privacy controls</li>
            </ul>
          </div>
          
          {/* Abstract UI Mockup */}
          <div className="order-1 lg:order-2 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900 rounded-[2rem] p-8 md:p-12 border border-gray-200 dark:border-gray-700 shadow-xl relative overflow-hidden group-hover:shadow-purple-500/10 transition-shadow duration-500">
             <div className="relative z-10 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 transform rotate-1 hover:rotate-0 transition-transform duration-500 flex flex-col gap-4">
                {/* Fake Social Post */}
                <div className="flex gap-3 items-start">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#06D6A0] to-blue-500 flex-shrink-0"></div>
                  <div>
                    <div className="font-bold text-sm text-gray-900 dark:text-white">Alex Johnson</div>
                    <div className="text-xs text-gray-500 mb-2">Just reached my savings goal for the month! 🎉</div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div className="bg-purple-500 h-2 w-[100%] rounded-full"></div>
                    </div>
                  </div>
                </div>
                <div className="h-px bg-gray-100 dark:bg-gray-800 w-full"></div>
                {/* Fake Social Post 2 */}
                <div className="flex gap-3 items-start">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0"></div>
                  <div>
                    <div className="font-bold text-sm text-gray-900 dark:text-white">Sarah Smith</div>
                    <div className="text-xs text-gray-500">Does anyone have tips for reducing grocery spend?</div>
                  </div>
                </div>
             </div>
          </div>
        </section>

      </main>

      {/* --- BENTO GRID (The Little Things) --- */}
      <section className="bg-white dark:bg-gray-900/50 py-24 border-y border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4">It's all in the details.</h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg">We obsessed over the little things to make tracking feel effortless.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-3xl border border-gray-200 dark:border-gray-700">
              <Zap className="w-8 h-8 text-amber-500 mb-4" />
              <h4 className="text-lg font-bold mb-2">Lightning Fast</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Built on React and Firebase, meaning zero load times between pages.</p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-3xl border border-gray-200 dark:border-gray-700">
              <FileDown className="w-8 h-8 text-blue-500 mb-4" />
              <h4 className="text-lg font-bold mb-2">Data Portability</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Upload your bank's CSV to bulk-add transactions, or export your data anytime.</p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-3xl border border-gray-200 dark:border-gray-700">
              <Moon className="w-8 h-8 text-purple-500 mb-4" />
              <h4 className="text-lg font-bold mb-2">Native Dark Mode</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Easy on the eyes. The UI automatically adjusts to your system preferences.</p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-3xl border border-gray-200 dark:border-gray-700">
              <Smartphone className="w-8 h-8 text-[#06D6A0] mb-4" />
              <h4 className="text-lg font-bold mb-2">Mobile Optimized</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">A dedicated bottom navigation bar makes tracking on your phone a breeze.</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- CTA SECTION --- */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto bg-gray-900 dark:bg-white rounded-3xl p-10 md:p-16 text-center relative overflow-hidden shadow-2xl border border-gray-800 dark:border-gray-200">
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-black text-white dark:text-gray-900 mb-4">
              Stop settling for bad software.
            </h2>
            <p className="text-gray-300 dark:text-gray-600 text-lg mb-8 max-w-xl mx-auto">
              Join FundFlow today and experience a personal finance tool built by developers who care about speed and privacy.
            </p>
            <Link to="/signup">
              <button className="px-8 py-4 bg-[#06D6A0] text-white rounded-full font-bold text-lg shadow-xl hover:scale-105 hover:bg-[#05b588] transition-all flex items-center gap-2 mx-auto">
                Create Free Account <ArrowRight size={20} />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* --- FOOTER (Consistent) --- */}
      <footer className="py-12 px-6 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0b0f19]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
            <img src="./FundFlow-Favicon.png" alt="Logo" className="h-6 w-auto grayscale" />
            <span className="font-bold text-gray-900 dark:text-white">FundFlow © 2026</span>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 text-center md:text-right">
            <p className="font-medium text-gray-900 dark:text-gray-300 mb-2">Senior Capstone Project — Farmingdale State College</p>
            <div className="space-x-1">
              <span>Engineered by</span>
              <a href="https://brianalterescu.com" target="_blank" rel="noreferrer" className="text-[#06D6A0] hover:underline font-medium">Brian Alterescu</a>,
              <a href="https://antyakoub.com" target="_blank" rel="noreferrer" className="text-[#06D6A0] hover:underline font-medium">Antonious Yakoub</a>,
              <a href="#" className="text-[#06D6A0] hover:underline font-medium">Christopher Brady</a>,
              <a href="#" className="text-[#06D6A0] hover:underline font-medium">Marlen Zavala-Maldonado</a>,
              <span>&</span>
              <a href="#" className="text-[#06D6A0] hover:underline font-medium">Katherine Acosta</a>.
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}