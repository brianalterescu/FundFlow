import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  PieChart,
  TrendingDown,
  PiggyBank,
  ShieldAlert,
  ArrowRight,
  PlayCircle,
  Clock,
  Sparkles,
  Menu
} from "lucide-react";
import { HiX } from "react-icons/hi";

// SEO Metadata
const SEO_TITLE = "Learn Personal Finance | FundFlow Academy";
const SEO_DESC = "Master your money with free guides on budgeting, paying off debt, saving, and investing. Read our expert articles and take control of your financial life.";

// Mock Data for the Learning Modules
const categories = ["All", "Budgeting", "Debt", "Saving", "Security"];

const lessons = [
  {
    id: 1,
    title: "The 50/30/20 Rule Explained",
    description: "The golden rule of budgeting. Learn how to allocate your income into Needs, Wants, and Savings without overcomplicating things.",
    category: "Budgeting",
    time: "5 min read",
    icon: PieChart,
    featured: true,
  },
  {
    id: 2,
    title: "Avalanche vs. Snowball Method",
    description: "Two proven strategies for eliminating high-interest debt. Find out which psychological approach works best for your brain.",
    category: "Debt",
    time: "7 min read",
    icon: TrendingDown,
    featured: false,
  },
  {
    id: 3,
    title: "Building an Emergency Fund",
    description: "Why you need one, how much should be in it, and where to store it so inflation doesn't eat it alive.",
    category: "Saving",
    time: "4 min read",
    icon: PiggyBank,
    featured: false,
  },
  {
    id: 4,
    title: "The Psychology of Spending",
    description: "Understand the marketing tricks designed to make you impulse buy, and how to build friction into your checkout process.",
    category: "Budgeting",
    time: "6 min read",
    icon: Sparkles,
    featured: false,
  },
  {
    id: 5,
    title: "Protecting Your Identity",
    description: "Why we don't use bank syncing, and the steps you must take to secure your digital financial footprint.",
    category: "Security",
    time: "8 min read",
    icon: ShieldAlert,
    featured: false,
  }
];

export default function Learn() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const filteredLessons = lessons.filter(
    (lesson) => activeCategory === "All" || lesson.category === activeCategory
  );

  const featuredLesson = filteredLessons.find(l => l.featured) || filteredLessons[0];
  const standardLessons = filteredLessons.filter(l => l.id !== featuredLesson?.id);

  return (
    <div className="min-h-screen flex flex-col text-gray-900 dark:text-gray-100 font-['Lexend_Deca'] bg-gray-50 dark:bg-[#0b0f19] overflow-x-hidden selection:bg-[#06D6A0] selection:text-white">
      
      {/* --- SEO HIDDEN TAGS --- */}
      <h1 className="sr-only">{SEO_TITLE}</h1>
      <p className="sr-only">{SEO_DESC}</p>

      {/* --- FLOATING NAVBAR (Consistent with Home) --- */}
      <header className="fixed top-4 inset-x-0 z-50 px-4 sm:px-6 flex justify-center">
        <div className="w-full max-w-6xl flex items-center justify-between px-6 py-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-full shadow-lg">
          
          <Link to="/" className="flex items-center gap-2 group">
            <img src="./FundFlow-Favicon.png" alt="FundFlow Logo" className="h-8 w-8 group-hover:scale-110 transition-transform" />
            <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              <span className="text-[#06D6A0]">Fund</span>Flow
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-300">
            <Link to="/features" className="hover:text-[#06D6A0] transition-colors">Features</Link>
            <Link to="/learn" className="text-[#06D6A0] font-bold">Learn</Link>
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

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="fixed top-20 inset-x-4 z-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-4 flex flex-col gap-4 md:hidden">
            <Link to="/features" className="font-medium px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">Features</Link>
            <Link to="/learn" className="font-medium px-4 py-2 text-[#06D6A0] bg-[#06D6A0]/10 rounded-lg">Learn</Link>
            <div className="h-px bg-gray-200 dark:bg-gray-800 my-2"></div>
            <Link to="/login" className="font-medium px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">Log In</Link>
            <Link to="/signup" className="font-medium px-4 py-2 bg-[#06D6A0] text-white rounded-lg text-center">Sign Up Free</Link>
        </div>
      )}

      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-12 lg:pt-40 lg:pb-16 px-6 z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-500/10 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wide mb-6">
            <BookOpen size={14} /> FundFlow Academy
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-6">
            Financial literacy, <br className="hidden sm:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#06D6A0] to-blue-500">
              simplified.
            </span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Demystify your money. Master the fundamentals of budgeting, debt management, and wealth building with our clear, actionable guides.
          </p>
        </div>
      </section>

      {/* --- CATEGORY FILTERS --- */}
      <section className="px-6 mb-12">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-2 sm:gap-4">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                activeCategory === cat 
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-md transform scale-105" 
                : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-[#06D6A0] hover:text-[#06D6A0]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* --- MAIN CONTENT GRID --- */}
      <main className="flex-1 px-6 pb-24 max-w-5xl mx-auto w-full">
        
        {/* Featured Article */}
        {featuredLesson && (
          <Link to={`/learn/${featuredLesson.id}`} className="block mb-8 group">
            <div className="relative bg-white dark:bg-gray-800 rounded-[2rem] p-8 md:p-12 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-2xl hover:border-[#06D6A0]/50 transition-all duration-500 overflow-hidden flex flex-col md:flex-row gap-8 items-center">
              
              {/* Abstract Featured Graphic */}
              <div className="w-full md:w-1/2 aspect-video bg-gradient-to-br from-[#06D6A0]/20 to-blue-500/20 rounded-2xl border border-white/50 dark:border-gray-700 flex items-center justify-center relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-500">
                <featuredLesson.icon className="w-24 h-24 text-[#06D6A0] drop-shadow-lg opacity-80 group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-white/10 dark:bg-black/10 backdrop-blur-[2px]"></div>
              </div>

              <div className="w-full md:w-1/2 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 bg-[#06D6A0]/10 text-[#06D6A0] text-xs font-bold uppercase tracking-wider rounded-md">
                    Featured • {featuredLesson.category}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                    <Clock size={12} /> {featuredLesson.time}
                  </span>
                </div>
                <h3 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4 leading-tight">
                  {featuredLesson.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-8 leading-relaxed">
                  {featuredLesson.description}
                </p>
                <div className="flex items-center gap-2 text-[#06D6A0] font-bold">
                  Start Reading <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Standard Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {standardLessons.map((lesson) => (
            <Link key={lesson.id} to={`/learn/${lesson.id}`} className="group block h-full">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col relative overflow-hidden">
                
                {/* Hover Gradient */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#06D6A0] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center text-gray-700 dark:text-gray-300 group-hover:bg-[#06D6A0]/10 group-hover:text-[#06D6A0] transition-colors">
                    <lesson.icon size={24} />
                  </div>
                  <span className="flex items-center gap-1 text-xs text-gray-500 font-medium bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded-md">
                    <Clock size={12} /> {lesson.time}
                  </span>
                </div>

                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-[#06D6A0] transition-colors">
                  {lesson.title}
                </h4>
                <p className="text-gray-600 dark:text-gray-400 mb-8 flex-1 line-clamp-3">
                  {lesson.description}
                </p>

                <div className="flex items-center justify-between mt-auto pt-6 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {lesson.category}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-[#06D6A0] group-hover:text-white transition-colors">
                    <ArrowRight size={16} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredLessons.length === 0 && (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">More lessons coming to this category soon.</p>
          </div>
        )}

      </main>

      {/* --- CTA SECTION --- */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto bg-gray-900 dark:bg-white rounded-3xl p-10 md:p-16 text-center relative overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-black text-white dark:text-gray-900 mb-4">
              Ready to apply what you've learned?
            </h2>
            <p className="text-gray-300 dark:text-gray-600 text-lg mb-8 max-w-xl mx-auto">
              Reading about budgeting is great. Actually doing it is better. Start tracking your finances today.
            </p>
            <Link to="/signup">
              <button className="px-8 py-4 bg-[#06D6A0] text-white rounded-full font-bold text-lg shadow-xl hover:scale-105 hover:bg-[#05b588] transition-all flex items-center gap-2 mx-auto">
                Open Your Dashboard <ArrowRight size={20} />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* --- FOOTER (Consistent with Home) --- */}
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