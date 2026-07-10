import React, { useState, useEffect, useMemo, useContext, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection, query, where, getDocs, doc, getDoc,
  addDoc, setDoc, deleteDoc, serverTimestamp, Timestamp
} from "firebase/firestore";
import { TransactionContext } from "../context/TransactionContext";

// Recharts
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer
} from "recharts";

// Icons
import {
  Target, Coffee, Gift, Pill, Home as HomeIcon, Truck, User, Dog, Zap, Airplay,
  CreditCard, Repeat , Gamepad, Users, Volleyball, Briefcase, GraduationCap,
  BarChart2, DollarSign, FileText, Film, Box, Trash2, Edit2, X, Rose,
  LogOut, Bell, Eye, EyeOff, ShieldAlert, Activity, Sparkles, TrendingUp, MessageSquare, PlusCircle, ArrowUpRight, ArrowDownRight, Link as LinkIcon, PieChart as PieIcon,
} from "lucide-react";

import LoadingScreen from "./LoadingScreen";
const categories = [
  { name: "Food", icon: Coffee }, { name: "Gifts", icon: Gift }, { name: "Health/Medical", icon: Pill },
  { name: "Home", icon: HomeIcon }, { name: "Transportation", icon: Truck }, { name: "Personal", icon: User },
  { name: "Pets", icon: Dog }, { name: "Utilities", icon: Zap }, { name: "Dating", icon: Rose },
  { name: "Debt", icon: CreditCard }, { name: "Subscriptions", icon: Repeat }, { name: "Fun", icon: Gamepad }, { name: "Travel", icon: Airplay },
  { name: "Social", icon: Users }, { name: "Recreational", icon: Volleyball }, { name: "Work", icon: Briefcase },
  { name: "Education", icon: GraduationCap }, { name: "Investments", icon: BarChart2 }, { name: "Savings", icon: DollarSign },
  { name: "Taxes", icon: FileText }, { name: "Entertainment", icon: Film }, { name: "Other", icon: Box },
];

const COLORS = ['#06D6A0', '#118ab2', '#ffd166', '#ef476f', '#8338ec', '#FF9F40', '#4BC0C0', '#9966FF'];

export default function TransactionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { transactions, setTransactions } = useContext(TransactionContext);

  // State
  const [user, setUser] = useState(null);
  const displayName = user?.displayName || (auth && auth.currentUser?.displayName) || "User";
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [isIncome, setIsIncome] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [isIdleSignedOut, setIsIdleSignedOut] = useState(false);

  // Edit State
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Filtering & Lazy Loading
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [loadedYears, setLoadedYears] = useState(new Set([currentYear]));

  // Input Refs for Keyboard Navigation
  const dateInputRef = useRef(null);
  const amountInputRef = useRef(null);
  const categoryInputRef = useRef(null);
  const descInputRef = useRef(null);

  const [newTx, setNewTx] = useState({
    Category: "",
    Description: "",
    amount: "",
    TransactionDate: new Date().toISOString().split("T")[0],
  });

  // --- IDLE TIMEOUT LOGIC ---
  useEffect(() => {
    let timeout;
    const handleActivity = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setIsIdleSignedOut(true);
        signOut(auth).catch(err => console.error(err));
      }, 600000); // 10 mins
    };
    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    events.forEach(event => window.addEventListener(event, handleActivity));
    handleActivity();
    return () => {
      clearTimeout(timeout);
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, []);

  // --- AUTH & DATA LOADING ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await loadUserData(currentUser);
      } else {
        navigate("/login");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  const loadUserData = async (currentUser) => {
    try {
      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setProfile(userSnap.data());
      }
      await loadTransactionsForYear(currentUser.uid, currentYear);
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const loadTransactionsForYear = async (uid, year) => {
    try {
      const start = new Date(`${year}-01-01T00:00:00`);
      const end = new Date(`${year}-12-31T23:59:59`);

      const q = query(
        collection(db, "transactions"),
        where("userid", "==", uid),
        where("TransactionDate", ">=", Timestamp.fromDate(start)),
        where("TransactionDate", "<=", Timestamp.fromDate(end))
      );

      const querySnapshot = await getDocs(q);
      const newTxList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setTransactions(prev => {
        const existingIds = new Set(prev.map(t => t.id));
        const uniqueNew = newTxList.filter(t => !existingIds.has(t.id));
        return [...prev, ...uniqueNew].sort(
          (a, b) => (b.TransactionDate?.seconds || 0) - (a.TransactionDate?.seconds || 0)
        );
      });
    } catch (err) {
      console.error("Error loading transactions for year", year, err);
    }
  };

  const handleYearChange = async (year) => {
    setSelectedYear(year);
    if (!loadedYears.has(year) && user) {
      setLoading(true);
      await loadTransactionsForYear(user.uid, year);
      setLoadedYears(prev => new Set(prev).add(year));
      setLoading(false);
    }
  };

  // --- KEYBOARD NAVIGATION ---
  const handleKeyDown = (e, currentField) => {
    if (["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(e.key)) {
      const inputs = [dateInputRef, amountInputRef, categoryInputRef, descInputRef];
      const currentIndex = inputs.findIndex(ref => ref === currentField);
      let nextIndex = currentIndex;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        nextIndex = Math.min(currentIndex + 1, inputs.length - 1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        nextIndex = Math.max(currentIndex - 1, 0);
      }
      inputs[nextIndex].current.focus();
    }
  };

  // --- CRUD OPERATIONS ---
  const handleTxChange = (e) => setNewTx({ ...newTx, [e.target.name]: e.target.value });

  const handleAddTransaction = async () => {
    if (!user) return alert("You must be logged in.");
    const { Category, Description, amount, TransactionDate } = newTx;

    if (!Category || !Description || !amount || !TransactionDate)
      return alert("Please fill in all fields.");

    try {
      const parsedAmount = parseFloat(amount) * (isIncome ? 1 : -1);
      const docRef = await addDoc(collection(db, "transactions"), {
        Category,
        Description,
        "transaction amount": parsedAmount,
        userid: user.uid,
        TransactionDate: Timestamp.fromDate(new Date(TransactionDate + "T12:00:00")),
        createdAt: serverTimestamp(),
      });

      const newTransaction = {
        id: docRef.id,
        Category,
        Description,
        "transaction amount": parsedAmount,
        userid: user.uid,
        TransactionDate: { seconds: Math.floor(new Date(TransactionDate + "T12:00:00").getTime() / 1000) },
      };

      setTransactions(prev => [newTransaction, ...prev]);
      setNewTx({ Category: "", Description: "", amount: "", TransactionDate: new Date().toISOString().split("T")[0] });
      amountInputRef.current.focus();
    } catch (error) {
      console.log("Error adding transaction:", error);
    }
  };

  const handleDeleteTransaction = async (id, e) => {
    // 1. Stop the click from triggering anything else on the table row
    if (e) e.stopPropagation();

    // 2. Safety check: ensure the ID actually exists
    if (!id) {
      console.error("Missing transaction ID!");
      return alert("Error: Cannot delete this transaction because its ID is missing.");
    }

    if (!window.confirm("Delete this transaction?")) return;

    try {
      // 3. Delete from Firebase
      await deleteDoc(doc(db, "transactions", id));

      // 4. Remove from the UI immediately
      setTransactions(prev => prev.filter(t => t.id !== id));

      // 5. IMPORTANT: Bust the cache so it doesn't reappear on reload!
      sessionStorage.removeItem("fundflow_transactions_cache");

    } catch (error) {
      console.error("Error deleting transaction:", error);
      alert("Failed to delete transaction. Check console for details.");
    }
  };

  // --- MODAL EDITING LOGIC ---
  const startEdit = (tx) => {
    const txDate = tx.TransactionDate?.seconds
      ? new Date(tx.TransactionDate.seconds * 1000)
      : new Date(tx.TransactionDate);

    const formattedDate = !isNaN(txDate) ? txDate.toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
    const rawAmount = Number(tx["transaction amount"]) || 0;

    setEditId(tx.id);
    setEditForm({
      TransactionDate: formattedDate,
      amount: Math.abs(rawAmount),
      Category: tx.Category || "",
      Description: tx.Description || "",
      isIncome: rawAmount >= 0,
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditForm({});
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const saveEdit = async () => {
    if (!editId) return;
    try {
      const txRef = doc(db, "transactions", editId);
      const fixedDate = new Date(editForm.TransactionDate + "T12:00:00");
      const newAmount = parseFloat(editForm.amount) * (editForm.isIncome ? 1 : -1);

      await setDoc(
        txRef,
        {
          TransactionDate: Timestamp.fromDate(fixedDate),
          Category: editForm.Category,
          Description: editForm.Description,
          "transaction amount": newAmount,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setTransactions(prev => prev.map(t => t.id === editId ? {
        ...t,
        Category: editForm.Category,
        Description: editForm.Description,
        "transaction amount": newAmount,
        TransactionDate: { seconds: Math.floor(fixedDate.getTime() / 1000) }
      } : t));

      setEditId(null);
      setEditForm({});
    } catch (error) {
      console.error("Error saving edit:", error);
      alert("Failed to save changes.");
    }
  };

  // --- DATA PROCESSING FOR UI ---
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        const d = t.TransactionDate?.seconds ? new Date(t.TransactionDate.seconds * 1000) : new Date(t.TransactionDate);
        return !isNaN(d) && d.getFullYear() === selectedYear;
      })
      .sort((a, b) => {
        const timeA = a.TransactionDate?.seconds || 0;
        const timeB = b.TransactionDate?.seconds || 0;
        return timeB - timeA;
      });
  }, [transactions, selectedYear]);

  const ytdTotal = filteredTransactions.reduce((acc, t) => acc + (Number(t["transaction amount"]) || 0), 0);

  const chartData = useMemo(() => {
    const aggregation = {};
    filteredTransactions.forEach((t) => {
      const amount = Number(t["transaction amount"]) || 0;
      if (amount < 0) {
        const category = t.Category || "Uncategorized";
        if (!aggregation[category]) aggregation[category] = 0;
        aggregation[category] += Math.abs(amount);
      }
    });

    return Object.keys(aggregation)
      .map(key => ({ name: key, value: aggregation[key] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredTransactions]);

  const formatMoney = (amount) => {
    if (privacyMode) return "$****";
    return `$${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-xl shadow-xl z-50">
          <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">{payload[0].name}</p>
          <p className="text-xl font-black text-gray-900 dark:text-white">
            {formatMoney(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const NAV_LINKS = [
    { name: "Dashboard", path: "/dashboard", icon: HomeIcon },
    { name: "Budget Plan", path: "/budget", icon: PieIcon },
    { name: "Transactions", path: "/transactions", icon: CreditCard },
    { name: "Goals", path: "/goals", icon: Target },
    { name: "Connections", path: "/connections", icon: LinkIcon },
    { name: "Users", path: "/users", icon: Users },
    { name: "Social Feed", path: "/social", icon: MessageSquare },
    { name: "CSV Uploading", path: "/csv", icon: Activity },
    { name: "Profile", path: "/profile", icon: User },
    { name: "Income Forecast", path: "/incomeforecast", icon: TrendingUp },
    //   // { name: "Wrapped", path: "/wrapped", icon: Sparkles },
  ];

  // --- RENDERS ---
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
          <button onClick={() => navigate("/login")} className="w-full py-4 bg-[#06D6A0] text-white rounded-xl font-bold hover:bg-[#05b588] transition-colors shadow-lg shadow-[#06D6A0]/20">
            Log In Again
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <LoadingScreen />;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0b0f19] text-gray-900 dark:text-white font-['Lexend_Deca'] overflow-hidden dark:[color-scheme:dark]">

      {/* --- EDIT TRANSACTION MODAL --- */}
      {editId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl animate-fade-in-up border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">

            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                {/* Replaced blue-500 with #06D6A0 */}
                <Edit2 className="text-[#06D6A0]" /> Edit Transaction
              </h2>
              <button onClick={cancelEdit} className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto no-scrollbar space-y-5 px-1 pb-4">
              <div className="flex p-1 bg-gray-100 dark:bg-gray-900 rounded-xl">
                <button onClick={() => setEditForm({ ...editForm, isIncome: false })} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!editForm.isIncome ? 'bg-white dark:bg-gray-700 text-red-500 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>Expense</button>
                <button onClick={() => setEditForm({ ...editForm, isIncome: true })} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${editForm.isIncome ? 'bg-white dark:bg-gray-700 text-[#06D6A0] shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>Income</button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Replaced focus:ring-blue-500 with focus:ring-[#06D6A0] */}
                <input type="date" name="TransactionDate" value={editForm.TransactionDate} onChange={handleEditChange} className="col-span-2 sm:col-span-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 focus:ring-2 focus:ring-[#06D6A0] outline-none transition-all" />
                <input type="number" name="amount" value={editForm.amount} onChange={handleEditChange} placeholder="Amount ($)" className="col-span-2 sm:col-span-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 focus:ring-2 focus:ring-[#06D6A0] outline-none transition-all" />
                <input type="text" name="Description" value={editForm.Description} onChange={handleEditChange} placeholder="Description" className="col-span-2 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 focus:ring-2 focus:ring-[#06D6A0] outline-none transition-all" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Category</h3>
                  {/* Replaced blue styles with #06D6A0 styles */}
                  {editForm.Category && <span className="text-xs font-bold text-[#06D6A0] bg-[#06D6A0]/10 dark:bg-[#06D6A0]/20 px-2 py-0.5 rounded-md">{editForm.Category}</span>}
                </div>
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto no-scrollbar pb-2">
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = editForm.Category === cat.name;
                    return (
                      // Replaced blue styles with #06D6A0 styles
                      <button key={cat.name} type="button" onClick={() => handleEditChange({ target: { name: "Category", value: cat.name } })} className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all ${isSelected ? "bg-[#06D6A0] text-white shadow-md scale-105" : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-transparent hover:border-[#06D6A0]"}`}>
                        <Icon size={18} />
                        <span className="text-[10px] font-bold text-center truncate w-full">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex gap-3 mt-auto">
              <button onClick={cancelEdit} className="flex-1 py-3.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">Cancel</button>
              {/* Replaced blue styles with #06D6A0 styles */}
              <button onClick={saveEdit} className="flex-1 py-3.5 bg-[#06D6A0] text-white font-bold rounded-xl shadow-lg shadow-[#06D6A0]/20 hover:shadow-[#06D6A0]/40 hover:-translate-y-0.5 transition-all active:scale-[0.98]">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-full z-20 shadow-sm flex-shrink-0">
        <div className="p-6 flex items-center gap-2">
          <img src="./FundFlow-Favicon.png" alt="Logo" className="h-8 w-8" />
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
          <button onClick={() => signOut(auth).then(() => navigate('/login'))} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">

        {/* HEADER */}
        <header className="h-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 lg:px-10 z-10 sticky top-0 flex-shrink-0">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Transactions</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right mr-2">
              <p className="text-sm font-bold leading-none text-gray-900 dark:text-white">
                {displayName}
              </p>
              <p className="text-xs text-gray-500 mt-1">Ready to track?</p>
            </div>

            <button
              onClick={() => setPrivacyMode(!privacyMode)}
              className={`p-2 rounded-full transition-colors ${privacyMode ? "bg-[#06D6A0]/10 text-[#06D6A0]" : "text-gray-500 hover:text-[#06D6A0] hover:bg-gray-100 dark:hover:bg-gray-800"}`}
            >
              {privacyMode ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            <img src={profile?.picURL || user?.photoURL || "https://i.imgur.com/1xAP7pJ.png"} alt="Avatar" className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 object-cover shadow-sm" />
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="max-w-6xl mx-auto space-y-8 pb-24 md:pb-8">

            {/* ADD TRANSACTION SECTION */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 lg:p-8 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <PlusCircle className="text-[#06D6A0]" /> New Transaction
                </h2>
                <Link to="/csv" className="text-sm font-bold text-[#06D6A0] bg-[#06D6A0]/10 px-4 py-2 rounded-full hover:bg-[#06D6A0]/20 transition-colors">
                  Bulk CSV Upload
                </Link>
              </div>

              <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
                {/* Form Side */}
                <div className="flex-1 space-y-6">
                  <div className="flex p-1.5 bg-gray-100 dark:bg-gray-900/80 rounded-2xl">
                    <button onClick={() => setIsIncome(false)} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${!isIncome ? 'bg-white dark:bg-gray-700 text-red-500 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>Expense</button>
                    <button onClick={() => setIsIncome(true)} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${isIncome ? 'bg-white dark:bg-gray-700 text-[#06D6A0] shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>Income</button>
                  </div>

                  {/* Increased gap from 4 to 5 for better breathing room */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <input ref={dateInputRef} onKeyDown={(e) => handleKeyDown(e, dateInputRef)} type="date" name="TransactionDate" value={newTx.TransactionDate} onChange={handleTxChange} className="w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 focus:ring-2 focus:ring-[#06D6A0] outline-none transition-all" />
                    <input ref={amountInputRef} onKeyDown={(e) => handleKeyDown(e, amountInputRef)} type="number" name="amount" value={newTx.amount} onChange={handleTxChange} placeholder="Amount ($)" className="w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 focus:ring-2 focus:ring-[#06D6A0] outline-none transition-all" />
                    <input ref={descInputRef} onKeyDown={(e) => handleKeyDown(e, descInputRef)} type="text" name="Description" value={newTx.Description} onChange={handleTxChange} placeholder="Description (e.g., Target Run)" className="sm:col-span-2 w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 focus:ring-2 focus:ring-[#06D6A0] outline-none transition-all" />
                  </div>

                  <div className="flex items-center gap-3 px-1">
                    <span className="text-sm font-medium text-gray-500">Selected Category:</span>
                    {newTx.Category ? (
                      <span className="px-3 py-1.5 bg-[#06D6A0]/10 text-[#06D6A0] rounded-lg text-sm font-bold">{newTx.Category}</span>
                    ) : (
                      <span className="text-sm text-gray-400 italic">None selected</span>
                    )}
                  </div>

                  <button onClick={handleAddTransaction} className="w-full py-4 bg-[#06D6A0] text-white font-bold rounded-xl shadow-lg shadow-[#06D6A0]/20 hover:shadow-[#06D6A0]/40 hover:-translate-y-0.5 transition-all active:scale-[0.98]">
                    Save {isIncome ? "Income" : "Expense"}
                  </button>
                </div>

                {/* Category Grid Side */}
                {/* Loosened paddings, removed hard heights, and added no-scrollbar */}
                <div className="lg:w-[45%] bg-gray-50 dark:bg-gray-900/40 p-5 rounded-3xl border border-gray-100 dark:border-gray-800">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-1">Select Category</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-3 max-h-[320px] overflow-y-auto no-scrollbar pb-2 px-1" ref={categoryInputRef} tabIndex="0" onKeyDown={(e) => handleKeyDown(e, categoryInputRef)}>
                    {categories.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = newTx.Category === cat.name;
                      return (
                        <button key={cat.name} type="button" onClick={() => handleTxChange({ target: { name: "Category", value: cat.name } })} className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${isSelected ? "bg-[#06D6A0] text-white shadow-md scale-105" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-[#06D6A0]"}`}>
                          <Icon size={20} />
                          <span className="text-[10px] font-bold text-center truncate w-full">{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* YEAR NAV & STATS */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
              <div className="flex gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                {[currentYear, currentYear - 1, currentYear - 2].map((year) => (
                  <button key={year} onClick={() => handleYearChange(year)} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${selectedYear === year ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"}`}>
                    {year}
                  </button>
                ))}
              </div>

              <div className="bg-white dark:bg-gray-800 px-6 py-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 text-right">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Net Balance ({selectedYear} YTD)</p>
                <p className={`text-2xl font-black ${ytdTotal >= 0 ? "text-[#06D6A0]" : "text-red-500"}`}>
                  {ytdTotal >= 0 ? "+" : "-"}{formatMoney(ytdTotal)}
                </p>
              </div>
            </div>

            {/* CHART & LIST GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* RECHARTS PIE CHART */}
              <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Activity className="text-[#06D6A0]" size={20} /> Expenses
                </h3>

                {chartData.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 font-medium">No expenses for {selectedYear}</div>
                ) : (
                  <>
                    <div style={{ width: '100%', height: 250 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={chartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Compact Legend */}
                    <div className="mt-4 space-y-2.5">
                      {chartData.map((entry, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
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

              {/* TRANSACTION LIST */}
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    {/* Replaced blue-500 with #06D6A0 */}
                    <CreditCard className="text-[#06D6A0]" /> Transaction History
                  </h3>
                </div>

                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        <th className="px-6 py-4 font-medium">Details</th>
                        <th className="px-6 py-4 font-medium">Date</th>
                        <th className="px-6 py-4 font-medium text-right">Amount</th>
                        <th className="px-6 py-4 font-medium text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="px-6 py-12 text-center text-gray-500 font-medium">No transactions recorded for {selectedYear}.</td>
                        </tr>
                      ) : (
                        filteredTransactions.map(t => {
                          const amount = Number(t["transaction amount"]) || 0;
                          const isIncome = amount >= 0;
                          const txDate = t.TransactionDate?.seconds ? new Date(t.TransactionDate.seconds * 1000) : new Date(t.TransactionDate);

                          return (
                            <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-4">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 ${isIncome ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                                    {isIncome ? <ArrowUpRight size={20} /> : <CreditCard size={20} />}
                                  </div>
                                  <div>
                                    <p className="font-bold text-gray-900 dark:text-white text-sm">{t.Description || "No Description"}</p>
                                    <span className="text-[10px] px-2 py-0.5 mt-1 inline-block bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md font-bold uppercase tracking-wider">{t.Category}</span>
                                  </div>
                                </div>
                              </td>

                              <td className="px-6 py-4 align-top pt-5">
                                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                  {!isNaN(txDate) ? txDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "—"}
                                </span>
                              </td>

                              <td className="px-6 py-4 align-top pt-5 text-right">
                                <span className={`text-base font-black ${isIncome ? "text-[#06D6A0]" : "text-gray-900 dark:text-white"}`}>
                                  {isIncome ? "+" : "-"}{formatMoney(amount)}
                                </span>
                              </td>

                              <td className="px-6 py-4 align-top pt-5 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation(); // Double protection for the edit button
                                      startEdit(t);
                                    }}
                                    className="p-2 text-gray-400 bg-gray-50 dark:bg-gray-800/50 hover:text-[#06D6A0] hover:bg-[#06D6A0]/10 dark:hover:bg-[#06D6A0]/20 rounded-lg transition"
                                  >
                                    <Edit2 size={16} />
                                  </button>

                                  {/* UPDATED: Passing the event 'e' into our new function */}
                                  <button
                                    onClick={(e) => handleDeleteTransaction(t.id, e)}
                                    className="p-2 text-gray-400 bg-gray-50 dark:bg-gray-800/50 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
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