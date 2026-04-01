import React, { useContext, useState, useMemo, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { TransactionContext } from "../context/TransactionContext";
import { useNotificationContext } from "../context/NotificationContext";
import NotificationList from "./NotificationList";
import { auth, db } from "../firebaseConfig";
import { signOut } from "firebase/auth";
import { collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import LoadingScreen from "./LoadingScreen";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  Pie as PieChart, Cell
} from "recharts";

import {
  ArrowUpRight, ArrowDownRight, Wallet, CreditCard, Activity,
  Bell, Home, Target, Users, User, LogOut, Calendar, ChevronDown, PieChart as PieIcon,
  Link as LinkIcon, Sparkles, TrendingUp, MessageSquare, ArrowRight, ShoppingBag,
  Eye, EyeOff, ShieldAlert, Bot,
} from "lucide-react";

// 1. The Brain: Generates text based on the financial data
const generateInsight = (monthName, income, spent, savingsRate) => {
  if (income === 0 && spent === 0) {
    return `I don't see any activity for ${monthName} yet. Once you add some transactions, I'll analyze your spending patterns here.`;
  }

  if (spent > income) {
    const deficit = spent - income;
    return `You ran a deficit of $${deficit.toLocaleString(undefined, { minimumFractionDigits: 2 })} in ${monthName}. Your spending exceeded your income. Let's review the 'Top Expenses' chart below to see where we can trim the fat for next month.`;
  }

  if (savingsRate >= 20) {
    return `Incredible financial discipline! You saved ${savingsRate.toFixed(1)}% of your income in ${monthName}. You are well above the recommended 20% benchmark. Consider sweeping that excess cash into a high-yield savings account or investment portfolio.`;
  }

  if (savingsRate > 0 && savingsRate < 20) {
    const saved = income - spent;
    return `Solid month! You kept your expenses under your income, saving $${saved.toLocaleString(undefined, { minimumFractionDigits: 2 })} in ${monthName}. To hit the optimal 20% savings rate, see if we can optimize your largest spending category below.`;
  }

  return `Your cash flow for ${monthName} is perfectly balanced. You spent exactly what you earned.`;
};

// 2. The Illusion: Handles the fake delay and typing effect
export const AIInsightWidget = ({ data, selectedMonth, selectedYear }) => {
  const [displayText, setDisplayText] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => {
    // 1. Get the month name (e.g., "October")
    const monthName = new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' });

    // 2. Generate the appropriate text
    const fullText = generateInsight(monthName, data.monthIncome, data.monthSpent, data.savingsRate);

    // 3. Reset state
    setDisplayText("");
    setIsThinking(true);

    // 4. Artificial "AI Processing" Delay (800ms)
    const thinkingTimeout = setTimeout(() => {
      setIsThinking(false);
      let i = 0;

      // 5. Typewriter Effect (20ms per character)
      const typingInterval = setInterval(() => {
        setDisplayText(fullText.slice(0, i + 1));
        i++;
        if (i >= fullText.length) clearInterval(typingInterval);
      }, 20);

      return () => clearInterval(typingInterval);
    }, 800);

    return () => clearTimeout(thinkingTimeout);
  }, [data.monthIncome, data.monthSpent, data.savingsRate, selectedMonth, selectedYear]);

  return (
    // Container with glowing effect on hover for AI Summary
    <div className="relative group">
      {/* Animated Glowing Background Effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-[#06D6A0] to-blue-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>

      {/* Main Card */}
      <div className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 shadow-sm flex items-start gap-4">

        {/* AI Avatar Icon */}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#06D6A0]/20 to-blue-500/20 flex items-center justify-center flex-shrink-0 border border-[#06D6A0]/20">
          <Bot className="text-[#06D6A0] w-6 h-6" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              FundFlow AI Analysis
            </h3>
            {isThinking && (
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-[#06D6A0] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 bg-[#06D6A0] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 bg-[#06D6A0] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </span>
            )}
          </div>

          <p className="text-gray-600 dark:text-gray-300 leading-relaxed min-h-[48px]">
            {displayText}
            {/* Blinking Cursor */}
            {!isThinking && displayText.length > 0 && (
              <span className="inline-block w-1.5 h-4 ml-1 bg-[#06D6A0] animate-pulse"></span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { transactions, user } = useContext(TransactionContext);
  const { notifications, loading: notificationsLoading, unreadCount } = useNotificationContext();
  const location = useLocation();
  const navigate = useNavigate();
  const displayName = user?.displayName || (auth && auth.currentUser?.displayName) || "User";
  // Timeframe Selection
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // UI State
  const [showNotifications, setShowNotifications] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false); // Default off
  const [isIdleSignedOut, setIsIdleSignedOut] = useState(false);

  // --- IDLE TIMEOUT LOGIC (10 Minutes) ---
  useEffect(() => {
    let timeout;

    const handleActivity = () => {
      clearTimeout(timeout);
      // Set timer for 10 minutes (10 * 60 * 1000 ms)
      timeout = setTimeout(() => {
        setIsIdleSignedOut(true);
        // Force Firebase SignOut in the background
        signOut(auth).catch(err => console.error(err));
      }, 600000);
    };

    // Listeners for user activity
    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    events.forEach(event => window.addEventListener(event, handleActivity));

    // Initialize timer
    handleActivity();

    return () => {
      clearTimeout(timeout);
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, []);

  // --- SIGN OUT LOGIC ---
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const clearAllNotifications = async () => {
    try {
      const uid = user?.uid || (auth && auth.currentUser?.uid);
      if (!uid) return;
      const q = query(collection(db, "notifications"), where("uid", "==", uid));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
      await batch.commit();
    } catch (err) {
      console.error(err);
    }
  };

  // --- PRIVACY HELPER ---
  const formatMoney = (amount) => {
    if (privacyMode) return "$****";
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  // --- DATA PROCESSING ---
  const processedData = useMemo(() => {
    if (!transactions) return null;

    let monthIncome = 0;
    let monthSpent = 0;
    let yearIncome = 0;
    let yearSpent = 0;

    const dailyDataMap = {};
    const categoryTotals = {};

    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      dailyDataMap[i] = { day: i, balance: 0, income: 0, spent: 0 };
    }

    transactions.forEach(tx => {
      const txDate = tx.TransactionDate?.seconds
        ? new Date(tx.TransactionDate.seconds * 1000)
        : new Date(tx.TransactionDate);

      if (isNaN(txDate)) return;

      const rawAmount = Number(tx["transaction amount"]) || 0;
      const isIncome = rawAmount > 0;
      const amount = Math.abs(rawAmount);

      const txYear = txDate.getFullYear();
      const txMonth = txDate.getMonth();
      const txDay = txDate.getDate();

      if (txYear === selectedYear) {
        if (isIncome) yearIncome += amount;
        else yearSpent += amount;
      }

      if (txYear === selectedYear && txMonth === selectedMonth) {
        if (isIncome) {
          monthIncome += amount;
          dailyDataMap[txDay].income += amount;
        } else {
          monthSpent += amount;
          dailyDataMap[txDay].spent += amount;

          const cat = tx.Category || "Uncategorized";
          categoryTotals[cat] = (categoryTotals[cat] || 0) + amount;
        }
      }
    });

    // Modified: Net Balance is now ONLY for the selected month
    const netBalance = monthIncome - monthSpent;

    let runningMonthBalance = netBalance - monthIncome + monthSpent;
    const chartData = Object.values(dailyDataMap).map(day => {
      runningMonthBalance += (day.income - day.spent);
      return {
        date: `${selectedMonth + 1}/${day.day}`,
        balance: runningMonthBalance,
        spent: day.spent
      };
    });

    const pieData = Object.keys(categoryTotals).map(key => ({
      name: key,
      value: categoryTotals[key]
    })).sort((a, b) => b.value - a.value).slice(0, 5);

    // Modified: Sliced to only 4 recent transactions
    const recentTransactions = [...transactions]
      .sort((a, b) => (b.TransactionDate?.seconds || 0) - (a.TransactionDate?.seconds || 0))
      .slice(0, 4);

    const hasDataThisMonth = monthIncome > 0 || monthSpent > 0;
    const savingsRate = monthIncome > 0 ? ((monthIncome - monthSpent) / monthIncome) * 100 : 0;

    return {
      netBalance, monthIncome, monthSpent, yearIncome, yearSpent, chartData, pieData, recentTransactions, hasDataThisMonth, savingsRate
    };
  }, [transactions, selectedMonth, selectedYear]);

  // --- UI HELPERS ---
  const handleDateChange = (e) => {
    const [year, month] = e.target.value.split("-");
    setSelectedYear(parseInt(year));
    setSelectedMonth(parseInt(month) - 1);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-xl shadow-xl z-50">
          <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">{label}</p>
          <p className="text-xl font-black text-gray-900 dark:text-white">
            {formatMoney(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const COLORS = ['#06D6A0', '#118ab2', '#ffd166', '#ef476f', '#8338ec'];

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

  // --- RENDERS ---

  // 1. Idle Timeout Overlay Screen
  if (isIdleSignedOut) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-lg px-4 transition-all">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-10 rounded-3xl shadow-2xl max-w-md w-full text-center animate-fade-in-up">
          <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert size={40} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Session Expired</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
            For your security, we've automatically signed you out after 10 minutes of inactivity.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="w-full py-4 bg-[#06D6A0] text-white rounded-xl font-bold hover:bg-[#05b588] transition-colors shadow-lg shadow-[#06D6A0]/20"
          >
            Log In Again
          </button>
        </div>
      </div>
    );
  }

  // 2. Loading State
  if (!transactions) return <LoadingScreen />;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0b0f19] text-gray-900 dark:text-white font-['Lexend_Deca'] overflow-hidden">

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
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">

        {/* HEADER */}
        <header className="h-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 lg:px-10 z-10 sticky top-0 flex-shrink-0">

          <div className="flex items-center gap-3 relative group">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300">
              <Calendar size={20} />
            </div>
            <div className="relative">
              <input
                type="month"
                value={`${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`}
                onChange={handleDateChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex items-center gap-2 cursor-pointer">
                <h2 className="text-xl font-bold">
                  {new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
                <ChevronDown size={16} className="text-gray-400 group-hover:text-[#06D6A0] transition-colors" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* --- ADD THIS NEW NAME BLOCK --- */}
            <div className="hidden sm:block text-right mr-2">
              <p className="text-sm font-bold leading-none text-gray-900 dark:text-white">
                {displayName}
              </p>
              <p className="text-xs text-gray-500 mt-1">Ready to track?</p>
            </div>
            {/* ----------------------------- */}

            {/* Privacy Mode Toggle */}
            <button
              onClick={() => setPrivacyMode(!privacyMode)}
              className={`p-2 rounded-full transition-colors ${privacyMode ? "bg-[#06D6A0]/10 text-[#06D6A0]" : "text-gray-500 hover:text-[#06D6A0] hover:bg-gray-100 dark:hover:bg-gray-800"}`}
              title="Toggle Privacy Mode"
            >
              {privacyMode ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>

            {/* NOTIFICATIONS */}
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-gray-500 hover:text-[#06D6A0] transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 relative">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-gray-900 rounded-full"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute top-12 right-0 w-80 max-w-[90vw] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in-up">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
                    <h4 className="font-bold flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#FFD166]" /> Alerts
                    </h4>
                    {notifications.length > 0 && (
                      <button onClick={() => { if (window.confirm("Clear all?")) clearAllNotifications(); }} className="text-xs text-red-500 hover:underline font-medium">
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto p-2">
                    {notificationsLoading ? (
                      <p className="text-center py-4 text-sm text-gray-500">Loading...</p>
                    ) : notifications.length === 0 ? (
                      <p className="text-center py-4 text-sm text-gray-500">You're all caught up!</p>
                    ) : (
                      <NotificationList notifications={notifications} />
                    )}
                  </div>
                </div>
              )}
            </div>

            <img src={user?.photoURL || "https://i.imgur.com/1xAP7pJ.png"} alt="Avatar" className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 object-cover shadow-sm" />
          </div>
        </header>

        {/* SCROLLABLE DASHBOARD CONTENT */}

        {/* SCROLLABLE DASHBOARD CONTENT */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="max-w-6xl mx-auto space-y-6 pb-24 md:pb-8">

            {/* METRICS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* ... your 4 metric cards ... */}
            </div>

            {/* --- NEW: AI INSIGHT WIDGET --- */}
            <AIInsightWidget
              data={processedData}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />

            {/* CHARTS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* ... your charts ... */}
            </div>

            {/* RECENT TRANSACTIONS */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl...">
              {/* ... */}
            </div>



            {/* METRICS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 mb-2">
                  <div className="p-2 bg-[#06D6A0]/10 text-[#06D6A0] rounded-lg"><Wallet size={18} /></div>
                  <span className="font-bold text-xs uppercase tracking-wider">Net Balance</span>
                </div>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white">
                  {formatMoney(processedData.netBalance)}
                </h2>
                <p className="text-xs text-gray-400 mt-2">Income - Expenses (This Month)</p>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 mb-2">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-[#06D6A0] rounded-lg"><ArrowUpRight size={18} /></div>
                  <span className="font-bold text-xs uppercase tracking-wider">Income This Month</span>
                </div>
                <h2 className="text-3xl font-black text-[#06D6A0]">
                  {formatMoney(processedData.monthIncome)}
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-2">Vs. {formatMoney(processedData.yearIncome)} this year</p>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 mb-2">
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg"><ArrowDownRight size={18} /></div>
                  <span className="font-bold text-xs uppercase tracking-wider">Spent This Month</span>
                </div>
                <h2 className="text-3xl font-black text-red-500">
                  {formatMoney(processedData.monthSpent)}
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-2">Vs. {formatMoney(processedData.yearSpent)} this year</p>
              </div>

              <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-[#06D6A0]/20 dark:to-blue-900/20 p-6 rounded-3xl border border-gray-800 dark:border-gray-700 shadow-sm flex flex-col justify-between text-white">
                <div className="flex items-center gap-3 text-gray-400 mb-2">
                  <div className="p-2 bg-white/10 rounded-lg"><Target size={18} /></div>
                  <span className="font-bold text-xs uppercase tracking-wider">Savings Rate</span>
                </div>
                <h2 className="text-3xl font-black">
                  {privacyMode ? "**%" : `${Math.max(0, processedData.savingsRate).toFixed(1)}%`}
                </h2>
                <div className="w-full bg-gray-700 rounded-full h-1.5 mt-4 overflow-hidden">
                  <div className="bg-[#06D6A0] h-1.5 rounded-full transition-all duration-1000" style={{ width: privacyMode ? "0%" : `${Math.min(100, processedData.savingsRate)}%` }}></div>
                </div>
              </div>
            </div>

            {/* CHARTS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Activity className="text-[#06D6A0]" size={20} />
                    <h3 className="text-xl font-bold">Month's Cash Flow</h3>
                  </div>
                </div>

                {!processedData.hasDataThisMonth ? (
                  <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400 font-medium">
                    <TrendingUp className="w-8 h-8 opacity-20 mb-2 mr-2" /> No transactions this month.
                  </div>
                ) : (
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={processedData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06D6A0" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#06D6A0" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} minTickGap={30} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(val) => privacyMode ? "***" : `$${val}`} />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="balance" stroke="#06D6A0" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="text-blue-500" size={20} />
                  <h3 className="text-xl font-bold">Top Expenses</h3>
                </div>

                {processedData.pieData.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 font-medium">
                    <PieChart className="w-8 h-8 opacity-20 mb-2 mr-2" /> No expenses this month.
                  </div>
                ) : (
                  <>
                    <div style={{ width: '100%', height: 200, minHeight: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={processedData.pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                            {processedData.pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-4 space-y-3">
                      {processedData.pieData.map((entry, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                            <span className="text-gray-600 dark:text-gray-300 font-medium truncate max-w-[100px]">{entry.name}</span>
                          </div>
                          <span className="font-bold text-gray-900 dark:text-white">
                            {formatMoney(entry.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* RECENT TRANSACTIONS (Limited to 4) */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <ShoppingBag size={20} className="text-[#06D6A0]" />
                  Recent Transactions
                </h3>
                <Link to="/transactions" className="flex items-center gap-1 text-sm font-bold text-[#06D6A0] hover:text-[#05b588] transition-colors">
                  View All <ArrowRight size={16} />
                </Link>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {processedData.recentTransactions.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400 font-medium">
                    No transactions found. Go to the Transactions page to add one.
                  </div>
                ) : (
                  processedData.recentTransactions.map((tx, index) => {
                    const txDate = tx.TransactionDate?.seconds ? new Date(tx.TransactionDate.seconds * 1000) : new Date(tx.TransactionDate);

                    const rawAmount = Number(tx["transaction amount"]) || 0;
                    const isIncome = rawAmount > 0;
                    const amount = Math.abs(rawAmount);

                    return (
                      <div key={tx.id || index} className="p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer rounded-2xl mx-2 mb-1">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 ${isIncome ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                            {isIncome ? <ArrowUpRight size={24} /> : <CreditCard size={24} />}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white text-base truncate max-w-[150px] sm:max-w-xs">{tx.Description || tx.Category || "Transaction"}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md font-medium">{tx.Category}</span>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{!isNaN(txDate) ? txDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "—"}</p>
                            </div>
                          </div>
                        </div>
                        <div className={`font-black text-lg ${isIncome ? "text-[#06D6A0]" : "text-gray-900 dark:text-white"}`}>
                          {isIncome ? "+" : "-"}{formatMoney(amount)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
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