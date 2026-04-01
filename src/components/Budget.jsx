import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
    collection, query, where, getDocs, doc, getDoc,
    writeBatch, serverTimestamp
} from "firebase/firestore";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

// Icons
import {
    Home, CreditCard, Target, Users, User, LogOut, Activity, Sparkles,
    TrendingUp, MessageSquare, Link as LinkIcon, PieChart as PieIcon, CheckCircle2, AlertTriangle
} from "lucide-react";

export default function Budget() {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentUser, setCurrentUser] = useState(null);
    const [profile, setProfile] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Income State
    const [income, setIncome] = useState(0);
    const [recentIncomes, setRecentIncomes] = useState([]);

    // Planned Expenses State
    const [expenses, setExpenses] = useState({
        Home: 0, // Rent/Mortgage
        Subscriptions: 0,
        Food: 0,
        Transportation: 0,
        Social: 0
    });

    // Goals Sync State
    const [goals, setGoals] = useState([]);
    const [allocations, setAllocations] = useState({});

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            if (!u) {
                navigate("/login");
            } else {
                setCurrentUser(u);
                const userDoc = await getDoc(doc(db, "users", u.uid));
                if (userDoc.exists()) setProfile(userDoc.data());
                await loadInitialData(u.uid);
            }
        });
        return () => unsub();
    }, [navigate]);

    const loadInitialData = async (uid) => {
        try {
            // 1. Fetch Transactions
            const txQuery = query(collection(db, "transactions"), where("userid", "==", uid));
            const txSnap = await getDocs(txQuery);
            const allTx = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Sort by date descending
            allTx.sort((a, b) => (b.TransactionDate?.seconds || 0) - (a.TransactionDate?.seconds || 0));

            // Grab the 3 most recent INCOMES
            const incomesList = allTx.filter(t => (Number(t["transaction amount"]) || 0) > 0).slice(0, 3);
            setRecentIncomes(incomesList);

            if (incomesList.length > 0) {
                setIncome(Number(incomesList[0]["transaction amount"]));
            } else {
                setIncome(3000); // Fallback
            }

            // 2. Auto-Calculate Last Month's Fixed Expenses (Home & Subscriptions)
            const now = new Date();
            const lastMonth = now.getMonth() - 1;
            const lastMonthYear = lastMonth < 0 ? now.getFullYear() - 1 : now.getFullYear();
            const actualLastMonth = lastMonth < 0 ? 11 : lastMonth;

            let lastHome = 0;
            let lastSub = 0;

            allTx.forEach(t => {
                const txDate = t.TransactionDate?.seconds ? new Date(t.TransactionDate.seconds * 1000) : new Date(t.TransactionDate);
                if (!isNaN(txDate) && txDate.getMonth() === actualLastMonth && txDate.getFullYear() === lastMonthYear) {
                    const amt = Number(t["transaction amount"]) || 0;
                    if (amt < 0) { // It's an expense
                        if (t.Category === "Home") lastHome += Math.abs(amt);
                        if (t.Category === "Subscriptions") lastSub += Math.abs(amt);
                    }
                }
            });

            setExpenses(prev => ({
                ...prev,
                Home: lastHome,
                Subscriptions: lastSub
            }));

            // 3. Fetch Active Goals
            const goalsQuery = query(collection(db, "goals"), where("userid", "==", uid));
            const goalsSnap = await getDocs(goalsQuery);
            const fetchedGoals = goalsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setGoals(fetchedGoals);

            const initAlloc = {};
            fetchedGoals.forEach(g => initAlloc[g.id] = 0);
            setAllocations(initAlloc);

        } catch (error) {
            console.error("Error loading budget data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Calculations
    const totalPlannedExpenses = Object.values(expenses).reduce((acc, curr) => acc + (Number(curr) || 0), 0);
    const remainingForGoals = income - totalPlannedExpenses;
    const totalAllocatedToGoals = Object.values(allocations).reduce((acc, curr) => acc + (Number(curr) || 0), 0);
    const unallocated = remainingForGoals - totalAllocatedToGoals;

    const handleExpenseChange = (category, val) => {
        setExpenses(prev => ({ ...prev, [category]: Number(val) }));
    };

    const handleAllocationChange = (goalId, val) => {
        setAllocations(prev => ({ ...prev, [goalId]: Number(val) }));
    };

    // Magic Auto-Fill Logic
    // Magic Auto-Fill Logic (Floating-Point Safe)
    const handleAutoFill = () => {
        const emptyExpenses = Object.keys(expenses).filter(k => !expenses[k] || Number(expenses[k]) === 0);
        const emptyAllocations = Object.keys(allocations).filter(k => !allocations[k] || Number(allocations[k]) === 0);

        const totalEmpty = emptyExpenses.length + emptyAllocations.length;

        if (totalEmpty === 0) return alert("All fields already have values!");
        if (unallocated <= 0) return alert("You don't have any unallocated funds left to distribute!");

        // 1. Convert to pennies to avoid JavaScript floating-point errors (e.g., 33.33333336)
        const unallocatedCents = Math.round(unallocated * 100);
        const splitCents = Math.floor(unallocatedCents / totalEmpty);
        let remainderCents = unallocatedCents - (splitCents * totalEmpty);

        // 2. Apply the exact penny-math and convert back to standard dollars
        const newExpenses = { ...expenses };
        emptyExpenses.forEach(key => {
            newExpenses[key] = Number(((splitCents + remainderCents) / 100).toFixed(2));
            remainderCents = 0; // Give the extra pennies to the first item only
        });

        const newAllocations = { ...allocations };
        emptyAllocations.forEach(key => {
            newAllocations[key] = Number(((splitCents + remainderCents) / 100).toFixed(2));
            remainderCents = 0;
        });

        setExpenses(newExpenses);
        setAllocations(newAllocations);
    };

    const handleSaveBudget = async () => {
        if (unallocated < 0) return alert("You have allocated more money than you have available!");

        setSaving(true);
        try {
            const batch = writeBatch(db);

            // 1. Save Budget Doc
            const monthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
            const budgetRef = doc(collection(db, "budgets"));
            batch.set(budgetRef, {
                userid: currentUser.uid,
                month: monthName,
                baseIncome: income,
                expenses: expenses,
                allocations: allocations,
                createdAt: serverTimestamp()
            });

            // 2. Sync with Goals
            Object.keys(allocations).forEach(goalId => {
                const addAmount = allocations[goalId];
                if (addAmount > 0) {
                    const goalRef = doc(db, "goals", goalId);
                    const goalData = goals.find(g => g.id === goalId);
                    const newTotal = (Number(goalData.currentAmount) || 0) + addAmount;
                    batch.update(goalRef, { currentAmount: newTotal, updatedAt: serverTimestamp() });
                }
            });

            await batch.commit();
            alert("Budget saved and Goals successfully funded!");
            navigate("/goals");

        } catch (err) {
            console.error("Error saving budget:", err);
            alert("Failed to save budget.");
        } finally {
            setSaving(false);
        }
    };

    const formatMoney = (val) => `$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const chartData = [
        { name: "Home", value: expenses.Home, color: "#ef476f" },
        { name: "Subscriptions", value: expenses.Subscriptions, color: "#118ab2" },
        { name: "Food", value: expenses.Food, color: "#ffd166" },
        { name: "Transport", value: expenses.Transportation, color: "#FF9F40" },
        { name: "Social", value: expenses.Social, color: "#9966FF" },
        { name: "Goals & Savings", value: Math.max(0, remainingForGoals), color: "#06D6A0" }
    ];

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-xl shadow-xl z-50">
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase">{payload[0].name}</p>
                    <p className="text-xl font-black text-gray-900 dark:text-white">{formatMoney(payload[0].value)}</p>
                </div>
            );
        }
        return null;
    };

    const NAV_LINKS = [
        { name: "Dashboard", path: "/dashboard", icon: Home },
        { name: "Transactions", path: "/transactions", icon: CreditCard },
        { name: "Budget Plan", path: "/budget", icon: PieIcon },
        { name: "Goals", path: "/goals", icon: Target },
        { name: "Connections", path: "/connections", icon: LinkIcon },
        { name: "Users", path: "/users", icon: Users },
        { name: "Social Feed", path: "/social", icon: MessageSquare },
        { name: "CSV Uploading", path: "/csvuploading", icon: Activity },
        { name: "Profile", path: "/profile", icon: User },
        { name: "Wrapped", path: "/wrapped", icon: Sparkles },
    ];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0b0f19]">
                <div className="w-8 h-8 border-4 border-[#06D6A0] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-[#0b0f19] text-gray-900 dark:text-white font-['Lexend_Deca'] overflow-hidden dark:[color-scheme:dark]">

            <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-full z-20 shadow-sm flex-shrink-0">
                <div className="p-6 flex items-center gap-2">
                    <img src="/FundFlow-Favicon.png" alt="Logo" className="h-8 w-8" />
                    <span className="text-xl font-black tracking-tight"><span className="text-[#06D6A0]">Fund</span>Flow</span>
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
            </aside>

            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                <header className="h-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 lg:px-10 z-10 sticky top-0 flex-shrink-0">
                    <h1 className="text-2xl font-black tracking-tight">Income Planner</h1>
                    <img src={profile?.picURL || "https://i.imgur.com/1xAP7pJ.png"} alt="Avatar" className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 object-cover shadow-sm" />
                </header>

                <main className="flex-1 overflow-y-auto p-6 lg:p-10">
                    <div className="max-w-6xl mx-auto space-y-6 pb-24 md:pb-8">

                        {/* HEADER METRIC & QUICK SELECT */}
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                            <div className="flex-1 w-full">
                                <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                                    <TrendingUp size={16} /> Select Base Income
                                </h2>
                                <div className="relative mt-3">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-gray-400">$</span>
                                    <input
                                        type="number"
                                        value={income || ""}
                                        onChange={(e) => setIncome(Number(e.target.value))}

                                        className="w-full sm:w-64 pl-9 pr-4 py-3.5 rounded-2xl border-2 border-[#06D6A0]/20 bg-gray-50 dark:bg-gray-900 focus:border-[#06D6A0] focus:ring-4 focus:ring-[#06D6A0]/10 text-2xl font-black text-[#06D6A0] outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Recent Incomes Quick Select */}
                            <div className="w-full lg:w-auto">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Recent Paychecks</h3>
                                <div className="flex flex-wrap gap-2">
                                    {recentIncomes.length === 0 ? (
                                        <span className="text-sm text-gray-500 font-medium">No recent income found.</span>
                                    ) : (
                                        recentIncomes.map((tx) => (
                                            <button
                                                key={tx.id}
                                                onClick={() => setIncome(Number(tx["transaction amount"]))}
                                                className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-[#06D6A0] dark:hover:border-[#06D6A0] rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 transition-all flex flex-col items-start"
                                            >
                                                <span className="text-[#06D6A0]">{formatMoney(tx["transaction amount"])}</span>
                                                <span className="text-[10px] text-gray-400 font-medium truncate max-w-[100px]">{tx.Description || tx.Category}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                            {/* PLANNED EXPENSES */}
                            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8 flex flex-col">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        <PieIcon className="text-blue-500" /> Planned Expenses
                                    </h3>
                                    <span className="text-sm font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg">
                                        Total: {formatMoney(totalPlannedExpenses)}
                                    </span>
                                </div>

                                <div className="h-48 w-full mb-6">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={chartData} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                                                {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                            </Pie>
                                            <RechartsTooltip content={<CustomTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="space-y-4">
                                    {Object.keys(expenses).map((category) => (
                                        <div key={category} className="flex items-center justify-between gap-4">
                                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 w-1/3">
                                                {category}
                                                {(category === "Home" || category === "Subscriptions") && (
                                                    <span className="block text-[10px] text-gray-400 font-normal">Last month's prepopulated</span>
                                                )}
                                            </label>
                                            <div className="relative flex-1">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={expenses[category] || ""}
                                                    onChange={(e) => handleExpenseChange(category, e.target.value)}
                                                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-right"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* GOAL FUNDING SECTION */}
                            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
                                <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                                    <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                                        <Target className="text-purple-500" /> Allocate to Goals
                                    </h3>
                                    {/* Clean, single instance of the Left to Allocate card */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white dark:bg-gray-800 p-4 sm:px-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm gap-4">
                    <div>
                      <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Left to Allocate</span>
                      <span className={`text-xl font-black tracking-tight ${unallocated < 0 ? 'text-red-500' : 'text-[#06D6A0]'}`}>
                        {formatMoney(unallocated)}
                      </span>
                    </div>
                    
                    {unallocated > 0 && (
                      <button 
                        onClick={handleAutoFill}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 font-bold rounded-xl border border-purple-200 dark:border-purple-800/30 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all active:scale-95 shadow-sm text-sm w-full sm:w-auto"
                      >
                        <Sparkles size={16} /> Auto-Fill Empties
                      </button>
                    )}
                  </div>
                </div>

                                {unallocated < 0 && (
                                    <div className="px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center gap-2 text-sm font-bold border-t border-red-100 dark:border-red-900/30">
                                        <AlertTriangle size={18} /> Over budget! Reduce expenses or allocations.
                                    </div>
                                )}

                                <div className="p-6 border-t border-gray-100 dark:border-gray-700">
                                    <button
                                        onClick={handleSaveBudget}
                                        disabled={saving || unallocated < 0 || income <= 0}
                                        className="w-full py-4 bg-[#06D6A0] text-white font-black rounded-xl shadow-lg shadow-[#06D6A0]/20 hover:shadow-[#06D6A0]/40 hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:opacity-50 disabled:hover:translate-y-0 flex justify-center items-center gap-2"
                                    >
                                        {saving ? "Saving & Syncing..." : <><CheckCircle2 size={20} /> Save Plan & Fund Goals</>}
                                    </button>
                                </div>
                            </div>

                        </div>
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