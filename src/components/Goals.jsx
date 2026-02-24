import React, { useState, useEffect, useContext, useMemo } from "react";
// import "../styles/Goals.css"; 
import { TransactionContext } from "../context/TransactionContext";
import { Link } from "react-router-dom";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

// Icons - Added Trash2 here
import {
  Target, Search, ChevronLeft, ChevronRight, X, Calendar, Trash2
} from "lucide-react";

// ChartJS Imports
import { Line, Bar, Pie, Doughnut, Bubble, PolarArea, Scatter, Radar } from "react-chartjs-2";

// Category Icons
import {
  Coffee, Gift, Pill, Home, Truck, User, Dog, Zap, Airplay, CreditCard,
  Repeat, Gamepad, Users, Volleyball, Briefcase, GraduationCap, BarChart2,
  DollarSign, FileText, Film, Box
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* HELPER CONSTANTS                             */
/* -------------------------------------------------------------------------- */

const categories = [
  { name: "Food", icon: Coffee }, { name: "Gifts", icon: Gift }, { name: "Health/Medical", icon: Pill },
  { name: "Home", icon: Home }, { name: "Transportation", icon: Truck }, { name: "Personal", icon: User },
  { name: "Pets", icon: Dog }, { name: "Utilities", icon: Zap }, { name: "Travel", icon: Airplay },
  { name: "Debt", icon: CreditCard }, { name: "Subscriptions", icon: Repeat }, { name: "Fun", icon: Gamepad },
  { name: "Social", icon: Users }, { name: "Recreational", icon: Volleyball }, { name: "Work", icon: Briefcase },
  { name: "Education", icon: GraduationCap }, { name: "Investments", icon: BarChart2 }, { name: "Savings", icon: DollarSign },
  { name: "Taxes", icon: FileText }, { name: "Entertainment", icon: Film }, { name: "Other", icon: Box },
];

// Helper to parse dates from various Firestore/String formats
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

// Circle Progress Component
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
        <circle cx="60" cy="60" r={radius} stroke="#e5e7eb" strokeWidth="10" fill="none" />
        <circle
          cx="60" cy="60" r={radius} stroke="url(#progressGradient)" strokeWidth="10"
          fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        {/* UPDATED: Added fill-black and dark:fill-white to ensure correct text color */}
        <text 
          x="50%" 
          y="50%" 
          dominantBaseline="middle" 
          textAnchor="middle" 
          className="text-[18px] font-semibold fill-black dark:fill-white"
        >
          {progress}%
        </text>
      </svg>
    </div>
  );
};

// Year/Month Selector Modal (Zepp Style)
const DatePickerModal = ({ isOpen, onClose, currentDate, onSelect }) => {
  const [year, setYear] = useState(currentDate.getFullYear());
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold dark:text-white">Select Period</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        {/* Year Selector */}
        <div className="flex justify-between items-center mb-6 px-4">
          <button onClick={() => setYear(y => y - 1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full dark:text-white"><ChevronLeft /></button>
          <span className="text-2xl font-bold text-[#06D6A0]">{year}</span>
          <button onClick={() => setYear(y => y + 1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full dark:text-white"><ChevronRight /></button>
        </div>

        {/* Month Grid */}
        <div className="grid grid-cols-3 gap-3">
          {months.map((m, idx) => (
            <button
              key={m}
              onClick={() => {
                const newDate = new Date(year, idx, 1);
                onSelect(newDate);
                onClose();
              }}
              className={`py-3 text-sm rounded-lg font-medium transition-colors
                ${(currentDate.getMonth() === idx && currentDate.getFullYear() === year)
                  ? "bg-[#06D6A0] text-white"
                  : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 dark:text-gray-300"
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
  const { user, transactions } = useContext(TransactionContext) || {};

  // -- State: View Control --
  const [displayDate, setDisplayDate] = useState(new Date()); // Defaults to today/current month
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

  // Effect: Sync Form Dates when Display Date changes (UX improvement)
  useEffect(() => {
    const first = new Date(displayDate.getFullYear(), displayDate.getMonth(), 1);
    const last = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0);

    // Format YYYY-MM-DD for input fields
    const formatDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    setStartDate(formatDate(first));
    setEndDate(formatDate(last));
  }, [displayDate]);

  // Effect: Fetch Goals from Firestore
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

  // Effect: Recalculate progress when transactions change
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

  // Memo: Filter Goals based on Display Date (Overlap Logic)
  const filteredGoals = useMemo(() => {
    const monthStart = new Date(displayDate.getFullYear(), displayDate.getMonth(), 1);
    const monthEnd = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0);

    return goals.filter((g) => {
      const gStart = new Date(g.startDate);
      const gEnd = new Date(g.endDate);
      // Check if goal overlaps with selected month
      return gStart <= monthEnd && gEnd >= monthStart;
    });
  }, [goals, displayDate]);

  // -- Handlers --

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

      // Clear specific fields but keep date context
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

  return (
    <div className="min-h-screen flex bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-['Lexend_Deca']">

      {/* Date Picker Modal */}
      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        currentDate={displayDate}
        onSelect={setDisplayDate}
      />

      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-6">
        
        {/* BRAND HEADER */}
        <div className="flex items-center gap-3 mb-8">
          <img 
            src="/FundFlow-Favicon.png"
            alt="FundFlow Logo" 
            className="h-10 w-auto object-contain" 
          />
          <span className="text-2xl font-bold tracking-tight text-gray-800 dark:text-white">
            <span className="text-[#06D6A0]">Fund</span>Flow
          </span>
        </div>

        <nav className="flex flex-col gap-3">
          {[
            ["Dashboard", "/dashboard"], 
            ["Transactions", "/transactions"], 
            ["Goals", "/goals"],
            ["Connections", "/connections"], 
            ["Users", "/users"], 
            ["Social", "/social"],
            ["CSV Uploading", "/csv"], 
            ["Profile", "/profile"], 
            ["Income Forecast", "/forecast"],
            ["Wrapped", "/wrapped"],
          ].map(([label, href]) => (
            <a 
              key={href} 
              href={href} 
              className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 sm:p-10 pb-24">

        {/* --- VIEW NAVIGATOR (Year/Month Switcher) --- */}
        <div className="flex items-center justify-between mb-8 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition">
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={() => setIsDatePickerOpen(true)}
            className="flex items-center gap-3 px-6 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition group"
          >
            <Calendar className="w-5 h-5 text-[#06D6A0]" />
            <div className="text-center">
              <span className="block text-xs text-gray-500 font-medium uppercase tracking-wider">Viewing</span>
              <span className="text-xl font-bold group-hover:text-[#06D6A0] transition-colors">
                {displayDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </button>

          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Goals List Section */}
        <section className="mb-10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-[#06d6a0]">
              Active Goals
            </h2>
            <button
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm flex items-center gap-2"
              onClick={refreshProgress}
            >
              <Repeat className="w-4 h-4" /> Refresh
            </button>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredGoals.length === 0 ? (
              <div className="col-span-full py-12 text-center text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center">
                <Target className="w-12 h-12 mb-3 text-gray-300" />
                <p>No goals set for {displayDate.toLocaleString('default', { month: 'long' })}.</p>
                <p className="text-sm mt-1">Use the form below to create one!</p>
              </div>
            ) : (
              filteredGoals.map((goal) => (
                <div key={goal.id} className="p-5 bg-white dark:bg-gray-800 rounded-xl shadow-md relative group hover:shadow-lg transition-shadow">
                  {/* UPDATED: Delete button using Lucide icon */}
                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="absolute top-3 right-3 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete Goal"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${goal.type === 'Income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {goal.type}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold mb-1 truncate pr-6">{goal.title}</h3>
                  <div className="text-sm space-y-2 text-gray-600 dark:text-gray-400 mt-3">
                    <div className="flex justify-between border-b pb-2 dark:border-gray-700">
                      <span>Category</span>
                      <span className="font-medium">{goal.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Target</span>
                      <span>${goal.expectedAmount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Current</span>
                      <span className={goal.currentAmount > goal.expectedAmount && goal.type === 'Expense' ? "text-red-500 font-bold" : "text-[#06d6a0] font-bold"}>
                        ${goal.currentAmount ?? 0}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-center text-black dark:text-white">
                    <CircleProgress progress={goal.percentageAchieved ?? 0} />
                  </div>

                  <div className="mt-4 text-center text-xs text-gray-400">
                    {goal.startDate} — {goal.endDate}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Create New Goal Form */}
        <section>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-semibold text-[#06d6a0] mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Add Goal for {displayDate.toLocaleString('default', { month: 'long' })}
            </h3>

            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleAddGoal}>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="p-3 rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-700"
              >
                <option value="Expense">Planned Expense</option>
                <option value="Income">Planned Income</option>
              </select>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Goal Category (Select from below)"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-700"
                  required
                />
              </div>

              <input
                type="number"
                placeholder="Planned Amount ($)"
                value={expectedAmount}
                onChange={(e) => setExpectedAmount(e.target.value)}
                className="p-3 rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-700"
                required
              />

              <input
                type="text"
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="p-3 rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-700"
              />

              {/* Category Selection Grid */}
              <div className="col-span-1 md:col-span-2 mt-2">
                <label className="block text-sm text-gray-500 mb-2">Quick Select Category</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {categories.map((cat) => {
                    // In JSX, we assign the icon component to a variable starting with Uppercase to render it
                    const IconComponent = cat.icon;
                    return (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => {
                          setCategory(cat.name);
                          if (!title.trim()) setTitle(cat.name);
                        }}
                        className={`
                          p-2 rounded-lg flex flex-col items-center justify-center gap-1
                          text-[11px] sm:text-sm text-center border transition-all duration-200
                          ${category === cat.name
                            ? "bg-[#06d6a0] text-white border-[#06d6a0] scale-105 shadow-sm"
                            : "bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                          }
                        `}
                      >
                        <IconComponent className="w-5 h-5" />
                        <span className="truncate w-full">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t dark:border-gray-700 col-span-1 md:col-span-2 my-2"></div>

              <div>
                <label className="block mb-1 text-sm text-gray-500">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-3 rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-700"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm text-gray-500">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-3 rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-700"
                />
              </div>

              <button
                type="submit"
                className="col-span-1 md:col-span-2 bg-[#06d6a0] hover:bg-[#05c18f] text-white font-semibold p-3 rounded-lg transition shadow-md mt-2"
              >
                Create Goal
              </button>
            </form>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center mt-10 text-sm text-gray-500 dark:text-gray-400">
          <p>FundFlow © 2025</p>
          <p>Senior Capstone Project — Farmingdale State College</p>
        </footer>

        {/* MOBILE BOTTOM NAV */}
        <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <div className="grid grid-cols-5 text-[11px]">
            {[
              { label: "Dashboard", icon: Home, to: "/dashboard" },
              { label: "Transactions", icon: CreditCard, to: "/transactions" },
              { label: "Social", icon: Users, to: "/social" },
              { label: "Users", icon: Search, to: "/users" },
              { label: "Profile", icon: User, to: "/profile" },
            ].map(({ label, icon: Icon, to }) => (
              <Link
                key={label}
                to={to}
                className="flex flex-col items-center justify-center py-3 transition hover:text-[#06d6a0] active:scale-95"
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </main>
    </div>
  );
}