import React, { useContext, useState, useMemo, useEffect } from "react";
import { TransactionContext } from "../context/TransactionContext";
import NotificationList from "./NotificationList";
import { useNotificationContext } from "../context/NotificationContext";
import { collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import { Link } from "react-router-dom";
import LoadingScreen from "./LoadingScreen"; 

// Icons
import { 
  Home, CreditCard, Target, Users, User, ChevronLeft, ChevronRight, Menu,
  Calendar, X, ArrowUpRight, ArrowDownRight, Bell, TrendingUp, PieChart, Activity
} from "lucide-react";
import { HiX } from "react-icons/hi"; // Keep HiX for mobile menu if needed, or replace with Lucide X

// Chart.js
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Doughnut, Bar, Line, PolarArea } from "react-chartjs-2";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, 
  BarElement, ArcElement, RadialLinearScale, Title, Tooltip, Legend, Filler
);

/* -------------------------------------------------------------------------- */
/* SUB-COMPONENTS                              */
/* -------------------------------------------------------------------------- */

const CountUp = ({ end, duration = 1000, prefix = "", suffix = "", decimals = 2, color = "" }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(progress * end);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  const formatted = count.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span style={{ color: color }}>
      {prefix}{formatted}{suffix}
    </span>
  );
};

const DatePickerModal = ({ isOpen, onClose, currentDate, onSelect, mode }) => {
  const [year, setYear] = useState(currentDate.getFullYear());
  const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 border dark:border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Select {mode === 'monthly' ? 'Month' : 'Year'}
          </h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" /></button>
        </div>

        <div className="flex justify-between items-center mb-6 px-4">
          <button onClick={() => setYear(y => y - 1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-200"><ChevronLeft /></button>
          <span className="text-2xl font-bold text-[#06D6A0]">{year}</span>
          <button onClick={() => setYear(y => y + 1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-200"><ChevronRight /></button>
        </div>

        {mode === 'monthly' ? (
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
                    ? "bg-[#06D6A0] text-white shadow-lg shadow-teal-500/30"
                    : "bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
              >
                {m.slice(0, 3)}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center">
            <button 
               onClick={() => {
                  const newDate = new Date(year, 0, 1);
                  onSelect(newDate);
                  onClose();
               }}
               className="w-full py-3 bg-[#06D6A0] text-white rounded-lg font-bold hover:bg-[#05b588] transition shadow-lg shadow-teal-500/30"
            >
              View {year} Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                              */
/* -------------------------------------------------------------------------- */

function Dashboard() {
  const { transactions, user } = useContext(TransactionContext);
  const { notifications, loading: notificationsLoading, unreadCount } = useNotificationContext();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // -- Sidebar State --
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // -- View State --
  const [displayDate, setDisplayDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('monthly'); 
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [chartRenderKey, setChartRenderKey] = useState(0); 
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains("dark"));
  
  // Local Loading State for Data Refresh
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const handleThemeChange = () => {
        setIsDark(document.documentElement.classList.contains("dark"));
        setChartRenderKey(prev => prev + 1);
    };
    
    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setChartRenderKey(prev => prev + 1);
    setIsRefreshing(true);
    const timer = setTimeout(() => setIsRefreshing(false), 500); 
    return () => clearTimeout(timer);
  }, [viewMode, displayDate]);


  // -- Optimized Filtering Logic --
  const { filteredData, totals, analysis } = useMemo(() => {
    let start, end;

    if (viewMode === 'monthly') {
        start = new Date(displayDate.getFullYear(), displayDate.getMonth(), 1);
        end = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0, 23, 59, 59);
    } else {
        start = new Date(displayDate.getFullYear(), 0, 1);
        end = new Date(displayDate.getFullYear(), 11, 31, 23, 59, 59);
    }

    const filtered = transactions.filter((tx) => {
      const txDate = tx.TransactionDate?.seconds
        ? new Date(tx.TransactionDate.seconds * 1000)
        : null;
      return txDate && txDate >= start && txDate <= end;
    });

    const income = filtered.reduce((sum, tx) => (Number(tx["transaction amount"]) > 0 ? sum + Number(tx["transaction amount"]) : sum), 0);
    const expense = filtered.reduce((sum, tx) => (Number(tx["transaction amount"]) < 0 ? sum + Math.abs(Number(tx["transaction amount"])) : sum), 0);
    const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
    
    const catMap = {};
    filtered.forEach(tx => {
        const amt = Number(tx["transaction amount"]);
        if (amt < 0) {
            const c = tx.Category || "Uncategorized";
            catMap[c] = (catMap[c] || 0) + Math.abs(amt);
        }
    });

    const topCategoryEntry = Object.entries(catMap).sort((a,b) => b[1] - a[1])[0];
    const topCategory = topCategoryEntry ? { name: topCategoryEntry[0], amount: topCategoryEntry[1] } : null;

    return {
      filteredData: filtered,
      totals: { income, expense, balance: income - expense },
      analysis: { savingsRate, topCategory, catMap }
    };
  }, [transactions, displayDate, viewMode]);

  /* ---------------- CHART DATA ---------------- */

  const chartColors = [
    "#06D6A0", "#EF4444", "#FFD166", "#4BC0C0", "#36A2EB", 
    "#9966FF", "#FF9F40", "#FF6384", "#C9CBCF", "#118AB2"
  ];

  const categoryChartData = useMemo(() => {
    return {
      labels: Object.keys(analysis.catMap),
      datasets: [{
        label: 'Expenses',
        data: Object.values(analysis.catMap),
        backgroundColor: chartColors,
        borderWidth: 2,
        borderColor: isDark ? "#1f2937" : "#ffffff", 
      }],
    };
  }, [analysis.catMap, isDark]);

  const timeSeriesData = useMemo(() => {
    const isMonthly = viewMode === 'monthly';
    const points = isMonthly 
        ? new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0).getDate() 
        : 12;
    
    const labels = isMonthly 
        ? Array.from({ length: points }, (_, i) => i + 1)
        : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const dataIncome = new Array(points).fill(0);
    const dataExpense = new Array(points).fill(0);

    filteredData.forEach(tx => {
        const date = tx.TransactionDate?.seconds ? new Date(tx.TransactionDate.seconds * 1000) : null;
        if (date) {
            const index = isMonthly ? date.getDate() - 1 : date.getMonth();
            const amt = Number(tx["transaction amount"]);
            if (amt > 0) dataIncome[index] += amt;
            else dataExpense[index] += Math.abs(amt);
        }
    });

    return {
        labels,
        datasets: [
            { 
                type: 'bar',
                label: 'Income', 
                data: dataIncome, 
                backgroundColor: '#06D6A0', 
                borderRadius: 4,
                order: 2
            },
            { 
                type: 'bar',
                label: 'Expense', 
                data: dataExpense, 
                backgroundColor: '#EF4444', 
                borderRadius: 4,
                order: 2
            },
            {
                type: 'line',
                label: 'Net Trend',
                data: dataIncome.map((inc, i) => inc - dataExpense[i]),
                borderColor: '#FFD166',
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 2,
                fill: false,
                order: 1
            }
        ]
    };
  }, [filteredData, displayDate, viewMode]);

  /* ---------------- CHART OPTIONS ---------------- */

  const getCommonOptions = (title) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: { 
            color: isDark ? "#F3F4F6" : "#374151",
            font: { family: "'Lexend Deca', sans-serif" } 
        }
      },
      title: {
        display: !!title,
        text: title,
        color: isDark ? "#F3F4F6" : "#111827",
        font: { size: 16, weight: 'bold' }
      },
      tooltip: {
        backgroundColor: isDark ? "#374151" : "#ffffff",
        titleColor: isDark ? "#fff" : "#000",
        bodyColor: isDark ? "#E5E7EB" : "#4B5563",
        borderColor: isDark ? "#4B5563" : "#E5E7EB",
        borderWidth: 1,
      }
    },
    scales: {
      x: {
        grid: { color: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" },
        ticks: { color: isDark ? "#E5E7EB" : "#6B7280" }
      },
      y: {
        grid: { color: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" },
        ticks: { color: isDark ? "#E5E7EB" : "#6B7280" }
      }
    }
  });

  const getPolarOptions = (title) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: "bottom",
            labels: { 
                color: isDark ? "#F3F4F6" : "#374151",
            }
        },
        title: {
            display: !!title,
            text: title,
            color: isDark ? "#F3F4F6" : "#111827",
            font: { size: 16, weight: 'bold' }
        }
    },
    scales: {
        r: { 
            grid: { color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)" },
            ticks: { 
                display: false,
                backdropColor: "transparent"
            },
            pointLabels: {
                color: isDark ? "#F3F4F6" : "#374151",
                font: { size: 12 }
            }
        }
    }
  });

  const changeDate = (offset) => {
    if (viewMode === 'monthly') {
        setDisplayDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    } else {
        setDisplayDate(prev => new Date(prev.getFullYear() + offset, 0, 1));
    }
  };

  const clearAllNotifications = async () => {
    try {
      const uid = user?.uid || (auth && auth.currentUser?.uid);
      if (!uid) return alert("You must be logged in.");
      const q = query(collection(db, "notifications"), where("uid", "==", uid));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
      await batch.commit();
    } catch (err) {
      console.error(err);
    }
  };

  const navLinks = [ "Dashboard", "Transactions", "Goals", "Connections", "Users", "Social", "CSV Uploading", "Profile", "Income Forecast", "Wrapped" ];

  // Show Loading Screen if main data is missing or refreshing
  // WRAPPED in a theme-aware container to ensure background color is correct while loading
  if (isRefreshing || !transactions) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors duration-200">
        <LoadingScreen />
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-['Lexend_Deca'] transition-colors duration-200">
      
      <DatePickerModal 
        isOpen={isDatePickerOpen} 
        onClose={() => setIsDatePickerOpen(false)}
        currentDate={displayDate}
        onSelect={setDisplayDate}
        mode={viewMode}
      />

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
          {navLinks.map((link) => (
            <Link
              key={link}
              to={`/${link.toLowerCase().replace(/\s/g, "")}`}
              className={`
                px-3 py-2 rounded-lg transition text-sm font-medium whitespace-nowrap
                hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200
              `}
            >
              {link}
            </Link>
          ))}
        </nav>
      </aside>

      {/* TOGGLE BUTTON (Floating) */}
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

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 p-4 flex justify-between items-center z-50 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <img src="/FundFlow-Favicon.png" alt="Logo" className="h-8 w-auto" />
          <span className="text-xl font-bold text-gray-800 dark:text-white">
            <span className="text-[#06D6A0]">Fund</span>Flow
          </span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <HiX className="text-2xl dark:text-white" /> : <Menu className="text-2xl dark:text-white" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden fixed top-16 inset-x-0 bg-white dark:bg-gray-800 p-4 space-y-2 z-40 shadow-lg border-b border-gray-200 dark:border-gray-700">
          {navLinks.map((link) => (
            <Link
              key={link}
              to={`/${link.toLowerCase().replace(/\s/g, "")}`}
              className="block px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
              onClick={() => setMobileMenuOpen(false)}
            >
              {link}
            </Link>
          ))}
        </div>
      )}

      {/* Main Content */}
      <main 
        className={`
            flex-1 p-6 mt-16 md:mt-0 pb-24 max-w-7xl mx-auto w-full 
            transition-all duration-300 ease-in-out
            ${isSidebarOpen ? "md:ml-64" : "md:ml-0"}
        `}
      >
        
        {/* --- Header & Controls --- */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Financial overview for {user?.displayName || "User"}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                {/* View Mode Toggle */}
                <div className="bg-gray-200 dark:bg-gray-700 p-1 rounded-xl flex text-sm font-medium">
                    <button 
                        onClick={() => setViewMode('monthly')}
                        className={`px-4 py-1.5 rounded-lg transition-all ${viewMode === 'monthly' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                        Monthly
                    </button>
                    <button 
                        onClick={() => setViewMode('yearly')}
                        className={`px-4 py-1.5 rounded-lg transition-all ${viewMode === 'yearly' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                        Year To Date
                    </button>
                </div>

                {/* Date Navigator */}
                <div className="flex items-center bg-white dark:bg-gray-800 p-1 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <button onClick={() => changeDate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition text-gray-600 dark:text-gray-300"><ChevronLeft className="w-5 h-5" /></button>
                    <button 
                        onClick={() => setIsDatePickerOpen(true)}
                        className="flex items-center gap-2 px-4 py-1.5 mx-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition group"
                    >
                        <Calendar className="w-4 h-4 text-[#06D6A0]" />
                        <span className="font-bold text-lg min-w-[120px] text-center text-gray-800 dark:text-white">
                            {viewMode === 'monthly' 
                                ? displayDate.toLocaleString('default', { month: 'long', year: 'numeric' }) 
                                : `Year: ${displayDate.getFullYear()}`
                            }
                        </span>
                    </button>
                    <button onClick={() => changeDate(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition text-gray-600 dark:text-gray-300"><ChevronRight className="w-5 h-5" /></button>
                </div>
            </div>
        </div>

        {/* --- Summary Cards --- */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <CreditCard className="w-20 h-20 text-[#06D6A0]" />
                </div>
                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Net Balance</h3>
                <div className="text-3xl font-bold flex items-center gap-1 dark:text-gray-100">
                    <CountUp end={totals.balance} prefix={totals.balance < 0 ? "-$" : "$"} color={totals.balance < 0 ? "#EF4444" : "#06D6A0"} />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <ArrowUpRight className="w-20 h-20 text-[#06D6A0]" />
                </div>
                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Total Income</h3>
                <div className="text-3xl font-bold text-[#06D6A0]">
                    <CountUp end={totals.income} prefix="$" />
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <TrendingUp className="w-3 h-3" />
                    <span className={analysis.savingsRate > 20 ? "text-green-500" : "text-yellow-500"}>
                        {analysis.savingsRate.toFixed(1)}%
                    </span>
                    <span>savings rate</span>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <ArrowDownRight className="w-20 h-20 text-[#EF4444]" />
                </div>
                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Total Expenses</h3>
                <div className="text-3xl font-bold text-[#EF4444]">
                    <CountUp end={totals.expense} prefix="$" />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 relative overflow-hidden group hover:border-[#FFD166] transition-colors">
                <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Bell className="w-20 h-20 text-[#FFD166]" />
                </div>
                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Notifications</h3>
                <div className="text-3xl font-bold text-[#FFD166]">
                    <CountUp end={unreadCount} decimals={0} />
                </div>
                <div className="mt-2 text-xs text-gray-400">Unread messages</div>
            </div>
        </section>

        {/* --- Main Charts --- */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 lg:col-span-2 flex flex-col">
                <div className="flex-1 min-h-[300px] relative">
                     {filteredData.length > 0 ? (
                        <Bar 
                            key={`bar-${chartRenderKey}`} 
                            data={timeSeriesData} 
                            options={getCommonOptions(viewMode === 'monthly' ? 'Daily Cash Flow' : 'Monthly Cash Flow')} 
                        />
                     ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 text-sm">
                            <TrendingUp className="w-8 h-8 opacity-20 mb-2" />
                            No activity recorded
                        </div>
                     )}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 lg:col-span-1 flex flex-col">
                <div className="flex-1 min-h-[300px] relative">
                    {filteredData.length > 0 && totals.expense > 0 ? (
                        <Doughnut 
                            key={`doughnut-${chartRenderKey}`}
                            data={categoryChartData} 
                            options={getCommonOptions('Spending Breakdown')} 
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 text-sm">
                            <PieChart className="w-8 h-8 opacity-20 mb-2" />
                            No expense data
                        </div>
                    )}
                </div>
            </div>
        </section>

        {/* --- Secondary Charts --- */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex-1 min-h-[250px] relative">
                     {filteredData.length > 0 ? (
                        <Line 
                            key={`line-${chartRenderKey}`}
                            data={{
                                labels: timeSeriesData.labels,
                                datasets: [
                                    {
                                        label: 'Cumulative Trend',
                                        data: timeSeriesData.datasets[2].data,
                                        borderColor: '#36A2EB',
                                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                                        fill: true,
                                        tension: 0.4
                                    }
                                ]
                            }} 
                            options={getCommonOptions('Net Income Trend')} 
                        />
                     ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 text-sm">
                            <Activity className="w-8 h-8 opacity-20 mb-2" />
                            No trend data
                        </div>
                     )}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex-1 min-h-[250px] relative">
                    {filteredData.length > 0 && totals.expense > 0 ? (
                        <PolarArea 
                            key={`polar-${chartRenderKey}`}
                            data={categoryChartData} 
                            options={getPolarOptions('Category Intensity')} 
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 text-sm">
                            <Target className="w-8 h-8 opacity-20 mb-2" />
                            No category data
                        </div>
                    )}
                </div>
            </div>
        </section>

        {/* --- Transactions & Notifications --- */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 lg:col-span-2">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Transactions</h3>
                    <Link to="/transactions" className="text-sm font-medium text-[#06D6A0] hover:text-[#05b588]">View All</Link>
                </div>
                <div className="overflow-x-auto">
                    {filteredData.length === 0 ? (
                        <div className="text-gray-500 text-center py-10 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                            <p>No transactions found for this period.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400">
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Category</th>
                                    <th className="px-4 py-3">Description</th>
                                    <th className="px-4 py-3 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm text-gray-700 dark:text-gray-300">
                                {filteredData
                                    .sort((a, b) => (b.TransactionDate?.seconds || 0) - (a.TransactionDate?.seconds || 0))
                                    .slice(0, 5) 
                                    .map((tx) => {
                                        const amount = Number(tx["transaction amount"]) || 0;
                                        const isExpense = amount < 0;
                                        const date = tx.TransactionDate?.seconds
                                            ? new Date(tx.TransactionDate.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                                            : "—";
                                        return (
                                            <tr key={tx.id} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="px-4 py-3 font-medium">{date}</td>
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                        {tx.Category}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                                                    {tx.Description}
                                                </td>
                                                <td className={`px-4 py-3 text-right font-bold ${isExpense ? "text-[#EF4444]" : "text-[#06D6A0]"}`}>
                                                    {isExpense ? "-" : "+"}${Math.abs(amount).toFixed(2)}
                                                </td>
                                            </tr>
                                        );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-full max-h-[500px] overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Bell className="w-4 h-4 text-[#FFD166]" />
                        Recent Alerts
                    </h3>
                    {notifications.length > 0 && (
                        <button
                            onClick={() => {
                                if (window.confirm("Clear all notifications?")) clearAllNotifications();
                            }}
                            className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        >
                            Clear All
                        </button>
                    )}
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-2">
                    {notificationsLoading ? (
                        <p className="text-center py-8 text-gray-400 text-sm">Loading...</p>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-sm">
                            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                                <Bell className="w-5 h-5 opacity-40" />
                            </div>
                            <p>You're all caught up!</p>
                        </div>
                    ) : (
                        <NotificationList notifications={notifications} />
                    )}
                </div>
            </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-gray-400 dark:text-gray-500 mt-12 text-sm">
          <p>FundFlow &copy; 2025</p>
          <p>Senior Capstone Project, Farmingdale State College</p>
        </footer>

      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
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

export default Dashboard;