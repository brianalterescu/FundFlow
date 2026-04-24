import React, { useState, useEffect, useContext, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { TransactionContext } from "../context/TransactionContext";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

// Icons
import {
  Target, Search, ChevronLeft, ChevronRight, X, Calendar, Trash2, Home, 
  CreditCard, Users, User, LogOut, Activity, Sparkles, TrendingUp, MessageSquare, 
  Link as LinkIcon, PieChart as PieIcon, ArrowRight, Repeat
} from "lucide-react";

// Category Icons
import {
  Coffee, Gift, Pill, Home as HomeIcon, Truck, Dog, Zap, Airplay, 
  Repeat as RepeatIcon, Gamepad, Volleyball, Briefcase, GraduationCap, BarChart2,
  DollarSign, FileText, Film, Box
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* HELPER CONSTANTS                             */
/* -------------------------------------------------------------------------- */

const categories = [
  { name: "Food", icon: Coffee }, { name: "Gifts", icon: Gift }, { name: "Health/Medical", icon: Pill },
  { name: "Home", icon: HomeIcon }, { name: "Transportation", icon: Truck }, { name: "Personal", icon: User },
  { name: "Pets", icon: Dog }, { name: "Utilities", icon: Zap }, { name: "Travel", icon: Airplay },
  { name: "Debt", icon: CreditCard }, { name: "Subscriptions", icon: RepeatIcon }, { name: "Fun", icon: Gamepad },
  { name: "Social", icon: Users }, { name: "Recreational", icon: Volleyball }, { name: "Work", icon: Briefcase },
  { name: "Education", icon: GraduationCap }, { name: "Investments", icon: BarChart2 }, { name: "Savings", icon: DollarSign },
  { name: "Taxes", icon: FileText }, { name: "Entertainment", icon: Film }, { name: "Other", icon: Box },
];

const parseTxDate = (tx) => {
  const td = tx?.TransactionDate ?? tx?.date ?? tx?.Date;
  if (!td) return null;
  if (typeof td === "object" && typeof td.seconds === "number") return new Date(td.seconds * 1000);
  if (typeof td.toDate === "function") { try { return td.toDate(); } catch { return null; } }
  if (typeof td === "string") { const d = new Date(td); return isNaN(d) ? null : d; }
  if (td instanceof Date) return td;
  return null;
};

const getTxAmount = (tx) => {
  const candidates = [tx["transaction amount"], tx["transaction_amount"], tx.transactionAmount, tx.Amount, tx.amount, tx.value];
  for (const c of candidates) {
    if (c !== undefined && c !== null && c !== "") {
      const n = Number(c);
      return isNaN(n) ? null : n;
    }
  }
  return null;
};

const getTxCategory = (tx) => (tx.Category ?? tx.category ?? tx.cat ?? "").toString().trim();

const calculateProgress = (goal, transactionsList) => {
  if (!Array.isArray(transactionsList) || transactionsList.length === 0) {
    return { currentAmount: 0, percentageAchieved: 0 };
  }

  const start = new Date(goal.startDate + "T00:00:00");
  const end = new Date(goal.endDate + "T23:59:59.999");
  let total = 0;

  for (const tx of transactionsList) {
    const txDate = parseTxDate(tx);
    if (!txDate) continue;
    if (txDate < start || txDate > end) continue;

    const amount = getTxAmount(tx);
    if (amount === null) continue;

    const txCat = getTxCategory(tx);
    if (!txCat) continue;
    if (txCat.toLowerCase() !== (goal.category ?? "").toLowerCase()) continue;

    const goalType = (goal.type ?? "expense").toString().toLowerCase();
    if (goalType === "expense" && amount < 0) total += Math.abs(amount);
    else if (goalType === "income" && amount > 0) total += amount;
  }

  const expected = Number(goal.expectedAmount) || 0;
  const percent = expected > 0 ? Math.min(Math.round((total / expected) * 100), 100) : 0;
  return { currentAmount: Math.round(total * 100) / 100, percentageAchieved: percent };
};

/* -------------------------------------------------------------------------- */
/* SUB-COMPONENTS                                   */
/* -------------------------------------------------------------------------- */

const CircleProgress = ({ progress }) => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex items-center justify-center">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06d6a0" />
            <stop offset="100%" stopColor="#118ab2" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={radius} stroke="#e5e7eb" strokeWidth="10" fill="none" className="dark:stroke-gray-700" />
        <circle
          cx="60" cy="60" r={radius} stroke="url(#progressGradient)" strokeWidth="10"
          fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text 
          x="50%" 
          y="50%" 
          dominantBaseline="middle" 
          textAnchor="middle" 
          className="text-[18px] font-bold fill-gray-900 dark:fill-white"
        >
          {progress}%
        </text>
      </svg>
    </div>
  );
};

const DatePickerModal = ({ isOpen, onClose, currentDate, onSelect }) => {
  const [year, setYear] = useState(currentDate.getFullYear());
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-sm p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold dark:text-white">Select Period</h3>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex justify-between items-center mb-6 px-2">
          <button onClick={() => setYear(y => y - 1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full dark:text-white transition-colors"><ChevronLeft /></button>
          <span className="text-2xl font-black text-[#06D6A0]">{year}</span>
          <button onClick={() => setYear(y => y + 1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full dark:text-white transition-colors"><ChevronRight /></button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {months.map((m, idx) => (
            <button
              key={m}
              onClick={() => {
                const newDate = new Date(year, idx, 1);
                onSelect(newDate);
                onClose();
              }}
              className={`py-3 text-sm rounded-xl font-bold transition-colors
                ${(currentDate.getMonth() === idx && currentDate.getFullYear() === year)
                  ? "bg-[#06D6A0] text-white shadow-md"
                  : "bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-[#06D6A0] dark:hover:border-[#06D6A0]"
                }`}
            >
              {m.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                               */
/* -------------------------------------------------------------------------- */

export default function Goals() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, transactions } = useContext(TransactionContext) || {};
  const [profile, setProfile] = useState({});

  // -- State: View Control --
  const [displayDate, setDisplayDate] = useState(new Date()); 
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // -- State: Data --
  const [goals, setGoals] = useState([]);

  // -- State: Form --
  const [type, setType] = useState("Expense");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [expectedAmount, setExpectedAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) setProfile(userDoc.data());
      } else {
        navigate("/login");
      }
    };
    fetchProfile();
  }, [user, navigate]);

  useEffect(() => {
    const first = new Date(displayDate.getFullYear(), displayDate.getMonth(), 1);
    const last = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0);

    const formatDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    setStartDate(formatDate(first));
    setEndDate(formatDate(last));
  }, [displayDate]);

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "expectations"));
        const userGoals = querySnapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((g) => g.userId === user?.uid);
        setGoals(userGoals);
      } catch (err) {
        console.error("Error fetching goals:", err);
      }
    };
    if (user) fetchGoals();
  }, [user]);

  useEffect(() => {
    if (!goals.length || !transactions?.length) return;
    refreshProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions]);

  const refreshProgress = () => {
    if (!goals.length || !transactions?.length) return;
    const updated = goals.map((g) => {
      const { currentAmount, percentageAchieved } = calculateProgress(g, transactions);
      return { ...g, currentAmount, percentageAchieved };
    });
    setGoals(updated);
  };

  const filteredGoals = useMemo(() => {
    const monthStart = new Date(displayDate.getFullYear(), displayDate.getMonth(), 1);
    const monthEnd = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0);

    return goals.filter((g) => {
      const gStart = new Date(g.startDate);
      const gEnd = new Date(g.endDate);
      return gStart <= monthEnd && gEnd >= monthStart;
    });
  }, [goals, displayDate]);

  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!title || !expectedAmount || !category) return alert("Please fill all required fields.");

    try {
      const newGoal = {
        userId: user?.uid || "guest",
        type, title, description, category,
        expectedAmount: Number(expectedAmount),
        currentAmount: 0, percentageAchieved: 0,
        startDate, endDate,
        createdAt: serverTimestamp(),
      };

      const goalRef = await addDoc(collection(db, "expectations"), newGoal);

      await addDoc(collection(db, "notifications"), {
        createdAt: serverTimestamp(),
        link: `/goals`,
        message: `You just launched a new goal: "${title}" Check it out!`,
        read: false,
        uid: user?.uid,
      });

      setGoals((prev) => [...prev, { id: goalRef.id, ...newGoal }]);
      setTitle(""); setDescription(""); setCategory(""); setExpectedAmount("");
      alert("Goal added!");
    } catch (err) {
      console.error("Error adding goal:", err);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm("Delete this goal?")) return;
    try {
      await deleteDoc(doc(db, "expectations", goalId));
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
    } catch (err) {
      console.error("Error deleting goal:", err);
    }
  };

  const changeMonth = (offset) => {
    setDisplayDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
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
    { name: "Income Forecast", path: "/incomeforecast", icon: TrendingUp },
      // { name: "Wrapped", path: "/wrapped", icon: Sparkles },
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0b0f19] text-gray-900 dark:text-white font-['Lexend_Deca'] overflow-hidden dark:[color-scheme:dark]">

      {/* Date Picker Modal */}
      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        currentDate={displayDate}
        onSelect={setDisplayDate}
      />

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
          <button onClick={() => signOut(auth).then(()=>navigate('/login'))} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* HEADER */}
        <header className="h-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 lg:px-10 z-10 sticky top-0 flex-shrink-0">
          <h1 className="text-2xl font-black tracking-tight">Goals</h1>
          <img src={profile?.picURL || "https://i.imgur.com/1xAP7pJ.png"} alt="Avatar" className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 object-cover shadow-sm" />
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="max-w-5xl mx-auto space-y-6 pb-24 md:pb-8">

            {/* BUDGET PLANNER BANNER */}
            <Link to="/budget" className="block relative group overflow-hidden bg-gradient-to-r from-[#06D6A0] to-blue-500 rounded-3xl p-6 sm:p-8 shadow-sm text-white transform transition hover:-translate-y-1">
              <div className="absolute inset-0 bg-white/10 dark:bg-black/10 mix-blend-overlay group-hover:bg-transparent transition-colors"></div>
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black mb-1 flex items-center gap-2">
                    <PieIcon size={24} /> Try the Budget Planner
                  </h2>
                  <p className="text-white/90 text-sm font-medium">Use last month's income to automatically fund these goals using a Zero-Based Budget.</p>
                </div>
                <div className="bg-white/20 px-6 py-3 rounded-xl font-bold flex items-center gap-2 backdrop-blur-sm border border-white/30 group-hover:bg-white group-hover:text-[#06D6A0] transition-colors w-full sm:w-auto justify-center">
                  Create Plan <ArrowRight size={18} />
                </div>
              </div>
            </Link>

            {/* --- VIEW NAVIGATOR (Year/Month Switcher) --- */}
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 mt-8">
              <button onClick={() => changeMonth(-1)} className="p-2.5 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors border border-gray-200 dark:border-gray-700">
                <ChevronLeft size={20} />
              </button>

              <button
                onClick={() => setIsDatePickerOpen(true)}
                className="flex items-center gap-3 px-6 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition group"
              >
                <Calendar className="w-5 h-5 text-[#06D6A0]" />
                <div className="text-center">
                  <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider">Viewing</span>
                  <span className="text-lg font-black group-hover:text-[#06D6A0] transition-colors">
                    {displayDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </button>

              <button onClick={() => changeMonth(1)} className="p-2.5 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors border border-gray-200 dark:border-gray-700">
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Goals List Section */}
            <section className="mb-10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Target className="text-[#06d6a0]" /> Active Goals
                </h2>
                <button
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition text-sm font-bold flex items-center gap-2"
                  onClick={refreshProgress}
                >
                  <Repeat size={16} /> <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredGoals.length === 0 ? (
                  <div className="col-span-full py-16 text-center text-gray-500 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center">
                    <Target className="w-12 h-12 mb-4 text-gray-300 dark:text-gray-600" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">No goals set for {displayDate.toLocaleString('default', { month: 'long' })}.</h3>
                    <p className="text-sm mt-1 font-medium">Use the form below to create one!</p>
                  </div>
                ) : (
                  filteredGoals.map((goal) => (
                    <div key={goal.id} className="p-6 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 relative group hover:border-[#06D6A0] transition-colors">
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="absolute top-4 right-4 p-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete Goal"
                      >
                        <Trash2 size={16} />
                      </button>

                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-md ${goal.type === 'Income' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                          {goal.type}
                        </span>
                      </div>

                      <h3 className="text-xl font-bold mb-1 truncate pr-8">{goal.title}</h3>
                      
                      <div className="text-sm space-y-2.5 text-gray-600 dark:text-gray-400 mt-4">
                        <div className="flex justify-between border-b pb-2.5 border-gray-100 dark:border-gray-700">
                          <span className="font-medium">Category</span>
                          <span className="font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md text-[11px] uppercase tracking-wider">{goal.category}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Target</span>
                          <span className="font-bold text-gray-900 dark:text-white">${goal.expectedAmount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Current</span>
                          <span className={`font-black ${goal.currentAmount > goal.expectedAmount && goal.type === 'Expense' ? "text-red-500" : "text-[#06d6a0]"}`}>
                            ${goal.currentAmount ?? 0}
                          </span>
                        </div>
                      </div>

                      <div className="mt-8 flex justify-center">
                        <CircleProgress progress={goal.percentageAchieved ?? 0} />
                      </div>

                      <div className="mt-6 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                        {goal.startDate} — {goal.endDate}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Create New Goal Form */}
            <section>
              <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <Target className="text-[#06d6a0]" />
                  Add Goal for {displayDate.toLocaleString('default', { month: 'long' })}
                </h3>

                <form className="grid grid-cols-1 md:grid-cols-2 gap-5" onSubmit={handleAddGoal}>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1 mb-2 block">Type</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#06D6A0] outline-none transition-all text-sm font-medium"
                    >
                      <option value="Expense">Planned Expense</option>
                      <option value="Income">Planned Income</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1 mb-2 block">Category</label>
                    <input
                      type="text"
                      placeholder="Select from below..."
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#06D6A0] outline-none transition-all text-sm font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1 mb-2 block">Target Amount ($)</label>
                    <input
                      type="number"
                      placeholder="e.g. 500"
                      value={expectedAmount}
                      onChange={(e) => setExpectedAmount(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#06D6A0] outline-none transition-all text-sm font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1 mb-2 block">Description</label>
                    <input
                      type="text"
                      placeholder="Optional"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#06D6A0] outline-none transition-all text-sm font-medium"
                    />
                  </div>

                  {/* Category Selection Grid */}
                  <div className="col-span-1 md:col-span-2 mt-2 p-4 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Quick Select</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
                      {categories.map((cat) => {
                        const IconComponent = cat.icon;
                        const isSelected = category === cat.name;
                        return (
                          <button
                            key={cat.name}
                            type="button"
                            onClick={() => {
                              setCategory(cat.name);
                              if (!title.trim()) setTitle(cat.name);
                            }}
                            className={`
                              p-3 rounded-xl flex flex-col items-center justify-center gap-2
                              transition-all duration-200 border
                              ${isSelected
                                ? "bg-[#06D6A0] text-white border-[#06D6A0] scale-105 shadow-md"
                                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-[#06D6A0]"
                              }
                            `}
                          >
                            <IconComponent size={20} />
                            <span className="text-[10px] font-bold truncate w-full text-center">{cat.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1 mb-2 block">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#06D6A0] outline-none transition-all text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1 mb-2 block">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#06D6A0] outline-none transition-all text-sm font-medium"
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2 pt-2">
                    <button
                      type="submit"
                      className="w-full py-4 bg-[#06D6A0] text-white font-black rounded-xl shadow-lg shadow-[#06D6A0]/20 hover:shadow-[#06D6A0]/40 hover:-translate-y-0.5 transition-all active:scale-[0.98]"
                    >
                      Create Goal
                    </button>
                  </div>
                </form>
              </div>
            </section>

          </div>
        </main>
      </div>

      {/* MOBILE NAV */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50 pb-safe">
        <div className="flex justify-around items-center px-2">
          {NAV_LINKS.slice(0, 5).map((link) => {
            const isActive = location.pathname === link.path;
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