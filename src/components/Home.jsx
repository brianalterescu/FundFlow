import React from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  CreditCard,
  BarChart3,
  Target,
  Users,
  FileDown,
  ArrowRight,
  CheckCircle2,
  Lock,
  Zap,
  Smartphone
} from "lucide-react";
import "../styles/Home2.css"
// SEO Metadata (Can be moved to index.html or Helmet)
// Keywords targeted: Personal Finance Tracker, Free Budgeting Tool, Expense Management, Secure Financial Planning
const SEO_TITLE = "FundFlow | Free Personal Finance & Expense Tracker";
const SEO_DESC = "Take control of your money with FundFlow. A secure, free personal finance tracker for budgeting, goal setting, and expense management without linking bank accounts.";

const features = [
  {
    title: "100% Manual & Secure",
    description: "No bank syncing. No Plaid. Your credentials stay yours. You dictate exactly what goes into your ledger.",
    icon: ShieldCheck,
    span: "md:col-span-2",
    bg: "bg-white dark:bg-gray-800"
  },
  {
    title: "Visual Insights",
    description: "Beautiful, interactive charts that make sense of your spending habits instantly.",
    icon: BarChart3,
    span: "md:col-span-1",
    bg: "bg-[#06D6A0]/10 border-[#06D6A0]/20"
  },
  {
    title: "Goal Forecasting",
    description: "Plan ahead with predictive income forecasting and savings targets.",
    icon: Target,
    span: "md:col-span-1",
    bg: "bg-white dark:bg-gray-800"
  },
  {
    title: "Export Anytime",
    description: "Your data is yours. Download your full transaction history to CSV whenever you want.",
    icon: FileDown,
    span: "md:col-span-2",
    bg: "bg-white dark:bg-gray-800"
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col text-gray-900 dark:text-gray-100 font-['Lexend_Deca'] bg-gray-50 dark:bg-[#0b0f19] overflow-hidden selection:bg-[#06D6A0] selection:text-white">
      
      {/* --- SEO HIDDEN TAGS --- */}
      <h1 className="sr-only">{SEO_TITLE}</h1>
      <p className="sr-only">{SEO_DESC}</p>

      {/* --- FLOATING NAVBAR --- */}
      <header className="fixed top-4 inset-x-0 z-50 px-4 sm:px-6 flex justify-center">
        <div className="w-full max-w-6xl flex items-center justify-between px-6 py-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-full shadow-lg">
          
          <Link to="/" className="flex items-center gap-2 group">
            <img src="./FundFlow-Favicon.png" alt="FundFlow Finance Tracker Logo" className="h-8 w-8 group-hover:scale-110 transition-transform" />
            <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              <span className="text-[#06D6A0]">Fund</span>Flow
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-300">
            <a href="#features" className="hover:text-[#06D6A0] transition-colors">Features</a>
            <a href="#security" className="hover:text-[#06D6A0] transition-colors">Security</a>
            <Link to="/learn" className="hover:text-[#06D6A0] transition-colors">Learn</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden sm:block px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-[#06D6A0] transition-colors">
              Log In
            </Link>
            <Link to="/signup">
              <button className="px-5 py-2 text-sm font-bold rounded-full bg-[#06D6A0] text-white shadow-md shadow-[#06D6A0]/30 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                Get Started Free
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 flex flex-col items-center text-center z-10">
        
        {/* Ambient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#06D6A0]/20 rounded-full blur-[120px] -z-10 pointer-events-none animate-pulse"></div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm mb-8 animate-fade-in-up">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-xs font-bold text-gray-600 dark:text-gray-300 tracking-wide uppercase">Free Personal Finance Tracker</span>
        </div>

        <h2 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight max-w-4xl leading-[1.1] mb-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          Take absolute control of your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#06D6A0] to-teal-400">financial future.</span>
        </h2>

        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mb-10 leading-relaxed animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          No messy spreadsheets. No giving away your bank login. FundFlow is the beautiful, secure way to budget, track expenses, and forecast your income.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <Link to="/signup">
            <button className="w-full sm:w-auto px-8 py-4 rounded-full text-lg font-bold bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-xl hover:scale-105 transition-transform flex items-center justify-center gap-2">
              Start Tracking Now <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
          <a href="#features">
            <button className="w-full sm:w-auto px-8 py-4 rounded-full text-lg font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              See How It Works
            </button>
          </a>
        </div>

        {/* Dashboard Preview Mockup */}
        <div className="mt-20 w-full max-w-5xl relative animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <div className="absolute inset-0 bg-gradient-to-t from-gray-50 dark:from-[#0b0f19] via-transparent to-transparent z-10 bottom-[-2px]"></div>
          
          <div className="rounded-t-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
            {/* Mock Browser Header */}
            <div className="bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="mx-auto bg-white dark:bg-gray-800 rounded-md px-3 py-1 text-xs text-gray-400 font-mono border border-gray-200 dark:border-gray-700">
                fundflow.ing/dashboard
              </div>
            </div>
            {/* The Image */}
            <img src="./dashboard.png" alt="FundFlow Dashboard Interface" className="w-full object-cover border-none" />
          </div>
        </div>

      </section>

      {/* --- TRUST & SECURITY BAR --- */}
      <section id="security" className="py-12 border-y border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-center items-center gap-8 md:gap-16">
          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400 font-medium">
            <Lock className="w-6 h-6 text-[#06D6A0]" />
            <span>Bank-level encryption</span>
          </div>
          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400 font-medium">
            <ShieldCheck className="w-6 h-6 text-[#06D6A0]" />
            <span>Zero Bank Logins Required</span>
          </div>
          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400 font-medium">
            <Zap className="w-6 h-6 text-[#06D6A0]" />
            <span>Lighting fast manual entry</span>
          </div>
        </div>
      </section>

      {/* --- BENTO GRID FEATURES --- */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Everything you need. <br className="hidden md:block"/>Nothing you don't.</h2>
          <p className="text-gray-500 dark:text-gray-400 text-lg">A budgeting tool designed for clarity, not clutter.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div 
              key={i} 
              className={`${f.span} ${f.bg} p-8 rounded-3xl border border-gray-200 dark:border-gray-700 hover:border-[#06D6A0] transition-colors group overflow-hidden relative`}
            >
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-900 dark:text-white mb-6 group-hover:scale-110 group-hover:text-[#06D6A0] transition-all">
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold mb-3">{f.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{f.description}</p>
              </div>
            </div>
          ))}

          {/* Social Feature (Full Width Bottom) */}
          <div className="md:col-span-3 bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8 md:p-12 rounded-3xl border border-gray-700 flex flex-col md:flex-row items-center justify-between gap-8 group">
            <div className="max-w-xl">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-all">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-3xl font-bold mb-3">Social Finance (Optional)</h3>
              <p className="text-gray-400 leading-relaxed text-lg">
                Finance doesn't have to be lonely. Follow friends, share milestones, and get motivated by a community of savers. Keep it private, or share your journey.
              </p>
            </div>
            
            {/* Abstract Social Graphic */}
            <div className="flex -space-x-4">
              <div className="w-16 h-16 rounded-full border-4 border-gray-800 bg-[#06D6A0] flex items-center justify-center font-bold text-lg">You</div>
              <div className="w-16 h-16 rounded-full border-4 border-gray-800 bg-blue-500"></div>
              <div className="w-16 h-16 rounded-full border-4 border-gray-800 bg-purple-500"></div>
              <div className="w-16 h-16 rounded-full border-4 border-gray-800 bg-gray-700 flex items-center justify-center">+5k</div>
            </div>
          </div>
        </div>
      </section>

      {/* --- CTA SECTION --- */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto bg-[#06D6A0] rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl">
          {/* Subtle Background pattern */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "24px 24px" }}></div>
          
          <div className="relative z-10">
            <h2 className="text-4xl md:text-6xl font-black text-gray-900 mb-6">
              Stop guessing. <br/> Start tracking.
            </h2>
            <p className="text-gray-900/80 text-xl font-medium mb-10 max-w-2xl mx-auto">
              Join the community of students and professionals taking control of their money today. 100% Free.
            </p>
            <Link to="/signup">
              <button className="px-10 py-4 bg-gray-900 text-white rounded-full font-bold text-xl shadow-xl hover:scale-105 hover:bg-black transition-all flex items-center gap-2 mx-auto">
                Create Free Account <ArrowRight className="w-6 h-6" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
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