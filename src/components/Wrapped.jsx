import React, { useEffect, useMemo, useState, useRef } from "react";
import { db } from "../firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { Link } from "react-router-dom";
import LoadingScreen from "./LoadingScreen"; 

// Icons
import { 
  X, Play, ChevronLeft, Menu, Wallet, TrendingUp, Award, Calendar, Home, CreditCard, Target, Users, User, Star, Zap
} from "lucide-react";

// Chart.js
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend);

/* -------------------------------------------------------------------------- */
/* SUB-COMPONENTS                              */
/* -------------------------------------------------------------------------- */

// 1. Story Progress Bar
const ProgressBar = ({ active, completed }) => {
  return (
    <div className="h-1.5 flex-1 bg-white/30 rounded-full overflow-hidden mx-1">
      <div 
        className={`h-full bg-white transition-all duration-[5000ms] ease-linear ${
          active ? "w-full" : completed ? "w-full duration-0" : "w-0 duration-0"
        }`} 
      />
    </div>
  );
};

// 2. Personality Badge (Dynamic based on data)
const PersonalityBadge = ({ type }) => {
  const badges = {
    "Saver": { icon: "🐿️", color: "bg-emerald-500", text: "The Stasher", desc: "You saved more than 20% of your income! Your future self thanks you." },
    "Spender": { icon: "🛍️", color: "bg-rose-500", text: "The High Roller", desc: "You enjoyed your money this year. Treat yourself (but maybe budget next year)." },
    "Balanced": { icon: "⚖️", color: "bg-blue-500", text: "The Zen Master", desc: "Perfectly balanced income and expenses. You are one with the Force." },
    "Foodie": { icon: "🍔", color: "bg-orange-500", text: "The Foodie", desc: "Your top spending category was Food. Delicious choices!" },
    "Traveler": { icon: "✈️", color: "bg-sky-500", text: "The Jetsetter", desc: "Travel was your priority. Memories > Things." },
  };
  
  const b = badges[type] || badges["Balanced"];

  return (
    <div className="flex flex-col items-center animate-in zoom-in duration-700">
      <div className={`w-40 h-40 ${b.color} rounded-full flex items-center justify-center text-7xl shadow-2xl mb-8 animate-bounce`}>
        {b.icon}
      </div>
      <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-4 text-center">{b.text}</h2>
      <p className="text-white/90 text-xl max-w-xs text-center font-medium leading-relaxed">{b.desc}</p>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                              */
/* -------------------------------------------------------------------------- */

export default function Wrapped() {
  const [transactions, setTransactions] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Story Mode State
  const [showStory, setShowStory] = useState(false);
  const [storyIndex, setStoryIndex] = useState(0);
  const timerRef = useRef(null);

  // Sidebar State (Fix: This was missing in your code)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  /* ───────── AUTH & DATA LOADING ───────── */
  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, (user) => setUserId(user ? user.uid : null));
  }, []);

  useEffect(() => {
    if (!userId) return;
    
    const load = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "transactions"), where("userid", "==", userId));
        const snap = await getDocs(q);

        const data = snap.docs.map((doc) => {
          const t = doc.data();
          const date = t.TransactionDate?.toDate?.() || 
                       (t.TransactionDate?.seconds ? new Date(t.TransactionDate.seconds * 1000) : new Date());
          return { ...t, date };
        });
        setTransactions(data);
      } catch (e) {
        console.error("Error loading wrapped:", e);
      }
      setLoading(false);
    };
    
    load();
  }, [userId]);

  /* ───────── ANALYTICS ENGINE ───────── */
  const analytics = useMemo(() => {
    let income = 0;
    let expenses = 0;
    const categoryMap = {};
    const monthlySpending = Array(12).fill(0);
    let highestSpendTx = { amount: 0, description: "" };

    transactions.forEach((t) => {
      const rawAmt = Number(t["transaction amount"] || t.amount || 0);
      const m = t.date.getMonth(); 
      
      if (rawAmt > 0) {
        income += rawAmt;
      } else {
        const absAmt = Math.abs(rawAmt);
        expenses += absAmt;
        const cat = t.Category || "Other";
        categoryMap[cat] = (categoryMap[cat] || 0) + absAmt;
        monthlySpending[m] += absAmt;

        if (absAmt > highestSpendTx.amount) {
            highestSpendTx = { amount: absAmt, description: t.Description || "Unknown Purchase" };
        }
      }
    });

    const categories = Object.entries(categoryMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    const topCategory = categories[0] || { label: "None", value: 0 };

    // Personality Logic
    let personality = "Balanced";
    const savingsRate = income > 0 ? ((income - expenses) / income) : 0;
    
    if (topCategory.label.toLowerCase().includes("food") || topCategory.label.toLowerCase().includes("restaurant")) personality = "Foodie";
    else if (topCategory.label.toLowerCase().includes("travel") || topCategory.label.toLowerCase().includes("flight")) personality = "Traveler";
    else if (savingsRate > 0.20) personality = "Saver";
    else if (savingsRate < 0) personality = "Spender";

    return {
      income,
      expenses,
      net: income - expenses,
      categories,
      monthlySpending,
      count: transactions.length,
      topCategory,
      highestSpendTx,
      personality
    };
  }, [transactions]);

  /* ───────── STORY CONFIGURATION ───────── */
  const storySlides = [
    {
      bg: "bg-black",
      content: (
        <div className="flex flex-col items-center justify-center h-full animate-in fade-in duration-1000">
           <img src="/FundFlow-Favicon.png" className="w-24 h-24 mb-6 animate-pulse" alt="Logo" />
           <h1 className="text-5xl font-black text-[#06D6A0] tracking-tighter mb-4 text-center">FUNDFLOW WRAPPED</h1>
           <p className="text-gray-400 text-xl font-medium">Ready to see your year?</p>
        </div>
      )
    },
    {
      bg: "bg-[#06D6A0]",
      content: (
        <div className="flex flex-col items-center justify-center h-full text-white">
           <p className="text-3xl font-bold mb-6">You were busy!</p>
           <div className="relative">
             <h2 className="text-9xl font-black mb-2 z-10 relative">{analytics.count}</h2>
             <div className="absolute -inset-4 bg-white/20 blur-2xl rounded-full z-0"></div>
           </div>
           <p className="text-2xl opacity-90 mt-4 font-medium uppercase tracking-widest">Transactions Tracked</p>
        </div>
      )
    },
    {
        bg: "bg-[#111827]",
        content: (
          <div className="flex flex-col items-center justify-center h-full text-white px-6">
             <p className="text-2xl font-bold text-red-400 mb-8">Total Money Out</p>
             <h2 className="text-6xl font-black mb-4 tracking-tight text-center break-all">
                ${analytics.expenses.toLocaleString()}
             </h2>
             <p className="text-gray-400 text-center mt-4">That's a lot of coffees... or rent.</p>
             <div className="w-full max-w-xs h-2 bg-gray-800 rounded-full overflow-hidden mt-12">
                <div className="h-full bg-red-500 animate-[width_2s_ease-out]" style={{ width: '100%' }}></div>
             </div>
          </div>
        )
    },
    {
        bg: "bg-gradient-to-br from-indigo-600 to-purple-700",
        content: (
          <div className="flex flex-col items-center justify-center h-full text-white px-6">
             <p className="text-xl font-bold opacity-80 mb-10 uppercase tracking-widest">Your Spending Vibe</p>
             <div className="w-56 h-56 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm mb-8 shadow-2xl border border-white/20">
                 <span className="text-8xl">🏆</span>
             </div>
             <h2 className="text-5xl font-black mb-2 text-center">{analytics.topCategory.label}</h2>
             <div className="bg-white/20 px-6 py-2 rounded-full mt-4 backdrop-blur-md">
                <p className="text-2xl font-bold">
                    ${analytics.topCategory.value.toLocaleString()}
                </p>
             </div>
          </div>
        )
    },
    {
        bg: "bg-black",
        content: (
            <div className="flex flex-col items-center justify-center h-full px-6">
                <p className="text-white/50 mb-12 text-xl font-medium tracking-widest uppercase">The Verdict</p>
                <PersonalityBadge type={analytics.personality} />
            </div>
        )
    }
  ];

  /* ───────── STORY CONTROLS ───────── */
  useEffect(() => {
    if (showStory) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (storyIndex < storySlides.length - 1) {
          setStoryIndex((prev) => prev + 1);
        } else {
          setShowStory(false); // End of story
          setStoryIndex(0);
        }
      }, 5000); 
    }
    return () => clearTimeout(timerRef.current);
  }, [showStory, storyIndex]);

  const handleNext = (e) => {
    e.stopPropagation();
    if (storyIndex < storySlides.length - 1) setStoryIndex(prev => prev + 1);
    else setShowStory(false);
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    if (storyIndex > 0) setStoryIndex(prev => prev - 1);
  };

  /* ───────── DASHBOARD CHARTS OPTIONS ───────── */
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { display: false }, y: { display: false } }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-['Lexend_Deca'] transition-colors duration-200">
        
      {/* ───────── STORY OVERLAY ───────── */}
      {showStory && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-0 md:p-8">
            <div className={`relative w-full h-full md:w-[450px] md:h-[85vh] md:rounded-3xl overflow-hidden shadow-2xl ${storySlides[storyIndex].bg} transition-colors duration-700 border-0 md:border border-white/10`}>
                
                <div className="absolute top-4 left-0 right-0 px-4 flex gap-1 z-30">
                    {storySlides.map((_, idx) => (
                        <ProgressBar key={idx} active={idx === storyIndex} completed={idx < storyIndex} />
                    ))}
                </div>

                <button 
                    onClick={() => setShowStory(false)} 
                    className="absolute top-8 right-4 z-30 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2 backdrop-blur-sm transition"
                >
                    <X size={20} />
                </button>

                <div className="absolute inset-0 z-20 flex">
                    <div className="w-1/3 h-full" onClick={handlePrev}></div>
                    <div className="w-2/3 h-full" onClick={handleNext}></div>
                </div>

                <div className="relative z-10 w-full h-full p-0">
                    {storySlides[storyIndex].content}
                </div>
            </div>
        </div>
      )}

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
          {["Dashboard", "Transactions", "Goals", "Social", "Profile", "Wrapped"].map((link) => (
            <Link
              key={link}
              to={`/${link.toLowerCase().replace(/\s/g, "")}`}
              className={`
                px-3 py-2 rounded-lg transition text-sm font-medium whitespace-nowrap
                ${link === 'Wrapped' 
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

      {/* ───────── MAIN CONTENT ───────── */}
      <main 
        className={`
          p-6 pb-24 transition-all duration-300 ease-in-out
          ${isSidebarOpen ? "md:ml-64" : "md:ml-0"}
        `}
      >
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
            <div>
                <span className="text-[#06D6A0] font-bold tracking-widest uppercase text-xs">Annual Review</span>
                <h1 className="text-4xl font-black mt-1">Your Wrapped</h1>
            </div>
            
            <button 
                onClick={() => { setStoryIndex(0); setShowStory(true); }}
                className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full font-bold hover:scale-105 transition shadow-xl"
            >
                <Play fill="currentColor" size={18} />
                Play Story
            </button>
        </div>

        {/* Hero Card */}
        <div 
            onClick={() => { setStoryIndex(0); setShowStory(true); }}
            className="bg-gradient-to-r from-[#06D6A0] to-teal-600 rounded-3xl p-8 mb-8 text-white shadow-lg relative overflow-hidden group cursor-pointer"
        >
             <div className="relative z-10">
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold mb-4 border border-white/20">
                    <Star size={12} fill="currentColor" /> 202X EDITION
                </div>
                <h2 className="text-3xl md:text-4xl font-black mb-2">Ready to relive your year?</h2>
                <p className="opacity-90 max-w-lg text-lg leading-relaxed">
                    We've crunched the numbers. From your biggest splurges to your smartest savings, see your financial year in review.
                </p>
                <div className="mt-8 inline-flex items-center gap-2 bg-white text-[#06D6A0] px-6 py-3 rounded-xl font-bold hover:bg-gray-50 transition shadow-lg">
                    <Play size={18} fill="currentColor" /> Watch Now
                </div>
             </div>
             
             {/* Decorative Elements */}
             <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition duration-700"></div>
             <div className="absolute right-10 top-10 w-20 h-20 bg-emerald-400/30 rounded-full blur-xl animate-pulse"></div>
        </div>

        {/* Grid Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard icon={<Wallet className="text-blue-500" />} label="Total Spent" value={`$${analytics.expenses.toLocaleString()}`} />
            <StatCard icon={<TrendingUp className="text-green-500" />} label="Total Income" value={`$${analytics.income.toLocaleString()}`} />
            <StatCard icon={<Award className="text-yellow-500" />} label="Top Category" value={analytics.topCategory.label} sub={`$${analytics.topCategory.value.toLocaleString()}`} />
            <StatCard icon={<Calendar className="text-purple-500" />} label="Transactions" value={analytics.count} />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Top Categories Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Target className="w-5 h-5 text-[#06D6A0]" /> Spending by Category
                    </h3>
                </div>
                <div className="h-64">
                    {analytics.categories.length > 0 ? (
                        <Bar 
                            data={{
                                labels: analytics.categories.slice(0, 7).map(c => c.label),
                                datasets: [{
                                    label: 'Spent',
                                    data: analytics.categories.slice(0, 7).map(c => c.value),
                                    backgroundColor: '#06D6A0',
                                    borderRadius: 6,
                                    barThickness: 30
                                }]
                            }}
                            options={{ ...commonOptions, responsive: true, maintainAspectRatio: false, scales: { x: { display: true, grid: { display: false }, ticks: { color: '#9ca3af' } } } }}
                        />
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400">No data available</div>
                    )}
                </div>
            </div>

            {/* Top Expenses List */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" /> Top Categories
                </h3>
                <div className="space-y-3">
                    {analytics.categories.length > 0 ? analytics.categories.slice(0, 5).map((cat, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                            <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-600'}`}>
                                    {i+1}
                                </div>
                                <span className="font-medium">{cat.label}</span>
                            </div>
                            <span className="font-bold text-gray-900 dark:text-white">${cat.value.toLocaleString()}</span>
                        </div>
                    )) : (
                        <p className="text-gray-400 text-center py-4">No categories found</p>
                    )}
                </div>
            </div>
        </div>

      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
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

const StatCard = ({ icon, label, value, sub }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-start gap-4 hover:-translate-y-1 transition duration-300">
        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">{icon}</div>
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</p>
            <h3 className="text-2xl font-black mt-1 text-gray-900 dark:text-white">{value}</h3>
            {sub && <p className="text-xs text-[#06D6A0] font-bold mt-1">{sub}</p>}
        </div>
    </div>
);