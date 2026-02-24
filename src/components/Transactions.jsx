import { useState, useEffect, useMemo, useContext, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { 
  collection, query, where, getDocs, doc, getDoc, 
  addDoc, setDoc, deleteDoc, serverTimestamp, Timestamp 
} from "firebase/firestore";
import { TransactionContext } from "../context/TransactionContext";

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

// Icon imports
import { 
  Target, Coffee, Gift, Pill, Home, Truck, User, Dog, Zap, Airplay, 
  CreditCard, Repeat, Gamepad, Users, Volleyball, Briefcase, GraduationCap, 
  BarChart2, DollarSign, FileText, Film, Box, Trash2 
} from "lucide-react";

const categories = [
  { name: "Food", icon: Coffee }, { name: "Gifts", icon: Gift }, { name: "Health/Medical", icon: Pill }, 
  { name: "Home", icon: Home }, { name: "Transportation", icon: Truck }, { name: "Personal", icon: User }, 
  { name: "Pets", icon: Dog }, { name: "Utilities", icon: Zap }, { name: "Travel", icon: Airplay }, 
  { name: "Debt", icon: CreditCard }, { name: "Subscriptions", icon: Repeat }, { name: "Fun", icon: Gamepad }, 
  { name: "Social", icon: Users }, { name: "Recreational", icon: Volleyball }, { name: "Work", icon: Briefcase }, 
  { name: "Education", icon: GraduationCap }, { name: "Investments", icon: BarChart2 }, { name: "Savings", icon: DollarSign }, 
  { name: "Taxes", icon: FileText }, { name: "Entertainment", icon: Film }, { name: "Other", icon: Box },
];

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

function TransactionsPage() {
  const navigate = useNavigate();
  const [isIncome, setIsIncome] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({});
  const { transactions, setTransactions } = useContext(TransactionContext);
  const [loading, setLoading] = useState(true);
  
  // Edit State
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Filtering & Lazy Loading
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [loadedYears, setLoadedYears] = useState(new Set([currentYear])); // Track which years we have fetched

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

  /* ------------------------------------------------- 
     1. Authentication & Lazy Data Loading 
  ------------------------------------------------- */
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
      } else {
        await setDoc(userRef, {
          email: currentUser.email,
          uid: currentUser.uid,
          name: currentUser.displayName || "",
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        });
      }
      // Initial Load: Only fetch Current Year
      await loadTransactionsForYear(currentUser.uid, currentYear);
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  // FETCH FUNCTION: Loads data only for a specific year
  const loadTransactionsForYear = async (uid, year) => {
    try {
        const start = new Date(`${year}-01-01T00:00:00`);
        const end = new Date(`${year}-12-31T23:59:59`);
        
        const transactionsRef = collection(db, "transactions");
        const q = query(
            transactionsRef, 
            where("userid", "==", uid),
            where("TransactionDate", ">=", Timestamp.fromDate(start)),
            where("TransactionDate", "<=", Timestamp.fromDate(end))
        );

        const querySnapshot = await getDocs(q);
        const newTxList = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        // Merge new transactions with existing ones (avoid duplicates)
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

  // HANDLER: Switch Year (and fetch if needed)
  const handleYearChange = async (year) => {
    setSelectedYear(year);
    
    // Check if we already loaded this year to save reads
    if (!loadedYears.has(year) && user) {
        setLoading(true);
        await loadTransactionsForYear(user.uid, year);
        setLoadedYears(prev => new Set(prev).add(year));
        setLoading(false);
    }
  };

  /* ------------------------------------------------- 
     2. Keyboard Navigation Logic
  ------------------------------------------------- */
  const handleKeyDown = (e, currentField) => {
    // Navigate inputs using Arrow Keys
    if (["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(e.key)) {
        e.preventDefault();
        
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

  /* ------------------------------------------------- 
     3. CRUD Operations
  ------------------------------------------------- */
  const handleTxChange = (e) =>
    setNewTx({ ...newTx, [e.target.name]: e.target.value });

  const handleAddTransaction = async () => {
    if (!user) return alert("You must be logged in.");
    const { Category, Description, amount, TransactionDate } = newTx;

    if (!Category || !Description || !amount || !TransactionDate)
      return alert("Please fill in all fields.");

    try {
      const docRef = await addDoc(collection(db, "transactions"), {
        Category,
        Description,
        "transaction amount": parseFloat(amount) * (isIncome ? 1 : -1),
        userid: user.uid,
        TransactionDate: Timestamp.fromDate(new Date(TransactionDate + "T12:00:00")),
        createdAt: serverTimestamp(),
      });

      const newTransaction = {
        id: docRef.id,
        Category,
        Description,
        "transaction amount": parseFloat(amount) * (isIncome ? 1 : -1),
        userid: user.uid,
        TransactionDate: { seconds: Math.floor(new Date(TransactionDate + "T12:00:00").getTime() / 1000) },
      };

      // Optimistically update UI
      setTransactions(prev => [newTransaction, ...prev]);
      setNewTx({ Category: "", Description: "", amount: "", TransactionDate: "" });
      
      // Reset focus to amount for rapid entry
      amountInputRef.current.focus();
      
      alert("Transaction added!");
    } catch (error) {
      console.log("Error adding transaction:", error);
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) return;
    try {
      await deleteDoc(doc(db, "transactions", id));
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error("Error deleting transaction:", error);
      alert("Failed to delete transaction.");
    }
  };

  // Filter existing state for display
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        const txYear = new Date(t.TransactionDate.seconds * 1000).getFullYear();
        return txYear === selectedYear;
      })
      .sort((a, b) => b.TransactionDate.seconds - a.TransactionDate.seconds);
  }, [transactions, selectedYear]);

  // Editing Logic
  const startEdit = (tx) => {
    setEditId(tx.id);
    setEditForm({
      TransactionDate: tx.TransactionDate?.seconds
        ? new Date(tx.TransactionDate.seconds * 1000).toISOString().split("T")[0]
        : "",
      amount: Math.abs(tx["transaction amount"]),
      Category: tx.Category,
      Description: tx.Description,
      isIncome: tx["transaction amount"] >= 0,
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditForm({});
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const saveEdit = async (id) => {
    const txRef = doc(db, "transactions", id);
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
    
    // Update local state without re-fetching
    setTransactions(prev => prev.map(t => t.id === id ? { 
        ...t, 
        Category: editForm.Category, 
        Description: editForm.Description,
        "transaction amount": newAmount,
        TransactionDate: { seconds: Math.floor(fixedDate.getTime()/1000) }
    } : t));

    setEditId(null);
    setEditForm({});
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  /* ------------------------------------------------- 
     4. Chart Data & Totals (Based on YTD/Filtered)
  ------------------------------------------------- */
  // NOTE: This is now based on 'filteredTransactions' (YTD), NOT all 'transactions'
  const ytdTotal = filteredTransactions.reduce(
    (acc, t) => acc + t["transaction amount"],
    0
  );

  const isDark = document.documentElement.classList.contains("dark");

  const chartData = useMemo(() => {
    const aggregation = {};
    filteredTransactions.forEach((t) => {
      const category = t.Category || "Other";
      const amount = t["transaction amount"] || 0;
      if (!aggregation[category]) aggregation[category] = 0;
      aggregation[category] += amount;
    });

    const labels = Object.keys(aggregation);
    const data = Object.values(aggregation);
    const backgroundColor = data.map((a) => (a < 0 ? "#FF6B6B" : "#06D6A0"));

    return {
      labels,
      datasets: [
        {
          label: `Transactions (${selectedYear})`,
          data,
          backgroundColor,
        },
      ],
    };
  }, [filteredTransactions, selectedYear]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: { color: isDark ? "#fff" : "#000" },
      },
    },
    scales: {
      x: {
        ticks: { color: isDark ? "#fff" : "#000" },
        grid: { display: false },
      },
      y: {
        ticks: { color: isDark ? "#fff" : "#000" },
        grid: { color: isDark ? "#374151" : "#e5e7eb" },
      },
    },
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading Financial Data...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-['Lexend_Deca']">

      {/* HEADER */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img
              src="./FundFlow-Favicon.png"
              alt="FundFlow Logo"
              className="h-8 w-auto"
            />
            {/* LOGO COLOR LOGIC */}
            <span className="text-xl font-semibold text-gray-900 dark:text-white">
              <span className="text-[#06D6A0] font-bold">Fund</span>Flow
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link to="/dashboard" className="hover:text-[#06d6a0]">Dashboard</Link>
            <Link to="/transactions" className="hover:text-[#06d6a0]">Transactions</Link>
            <Link to="/social" className="hover:text-[#06d6a0]">Social</Link>
            <Link to="/profile" className="hover:text-[#06d6a0]">Profile</Link>
          </nav>
        </div>
      </header>

      {/* HEADER SPACER */}
      <div className="h-16" />

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-10">

        {/* ADD TRANSACTION CARD */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-xl font-semibold">Add Transaction</h2>
          <Link
            to="/csv"
            className="px-4 py-2 text-sm font-medium rounded-full border border-[#06d6a0] text-[#06d6a0] hover:bg-[#06d6a0]/10 transition whitespace-nowrap"
          >
            Upload via CSV
          </Link>
        </div>

        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 space-y-6 border border-gray-100 dark:border-gray-700">
          {/* INCOME / EXPENSE TOGGLE */}
          <div className="relative max-w-sm mx-auto">
            <div className="grid grid-cols-2 bg-gray-200 dark:bg-gray-700 rounded-full p-1 text-sm font-medium relative">
              <div
                className={`absolute top-1 bottom-1 w-1/2 rounded-full transition-transform duration-300
                  ${isIncome ? "translate-x-full bg-[#06d6a0]" : "translate-x-0 bg-red-500"}`}
              />
              <button
                onClick={() => setIsIncome(false)}
                className={`relative z-10 py-2 rounded-full transition ${!isIncome ? "text-white" : "text-gray-700 dark:text-gray-300"}`}
              >
                Expense
              </button>
              <button
                onClick={() => setIsIncome(true)}
                className={`relative z-10 py-2 rounded-full transition ${isIncome ? "text-white" : "text-gray-700 dark:text-gray-300"}`}
              >
                Income
              </button>
            </div>
          </div>

          {/* INPUTS - NOW WITH KEYBOARD NAVIGATION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              ref={dateInputRef}
              onKeyDown={(e) => handleKeyDown(e, dateInputRef)}
              type="date"
              name="TransactionDate"
              value={newTx.TransactionDate}
              onChange={handleTxChange}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-[#06d6a0] outline-none"
            />
            <input
              ref={amountInputRef}
              onKeyDown={(e) => handleKeyDown(e, amountInputRef)}
              type="number"
              name="amount"
              value={newTx.amount}
              onChange={handleTxChange}
              placeholder="Amount (67.00)"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-[#06d6a0] outline-none"
            />
            <input
              ref={categoryInputRef}
              onKeyDown={(e) => handleKeyDown(e, categoryInputRef)}
              name="Category"
              value={newTx.Category}
              onChange={handleTxChange}
              placeholder="Category"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-[#06d6a0] outline-none md:col-span-2"
            />
            <input
              ref={descInputRef}
              onKeyDown={(e) => handleKeyDown(e, descInputRef)}
              name="Description"
              value={newTx.Description}
              onChange={handleTxChange}
              placeholder="Description"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-[#06d6a0] outline-none md:col-span-2"
            />
          </div>

          {/* CATEGORY GRID */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => {
                    handleTxChange({ target: { name: "Category", value: cat.name } });
                    categoryInputRef.current.focus(); // Keep focus flow
                  }}
                  className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 text-xs sm:text-sm border transition ${
                    newTx.Category === cat.name
                      ? "bg-[#06d6a0] text-white border-[#06d6a0]"
                      : "bg-gray-100 dark:bg-gray-700 dark:text-white border-gray-300 dark:border-gray-600"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="truncate max-w-full">{cat.name}</span>
                </button>
              );
            })}
          </div>

          {/* ADD BUTTON */}
          <button
            onClick={handleAddTransaction}
            className="w-full md:w-fit px-6 py-3 rounded-lg bg-[#06d6a0] text-white font-semibold hover:bg-[#06be8d] transition"
          >
            Add Transaction
          </button>
        </section>

        {/* YEAR FILTER (LAZY LOADING TRIGGERS) */}
        <div className="flex gap-4 mb-4">
          {[currentYear, currentYear - 1, currentYear - 2].map((year) => (
            <button
              key={year}
              onClick={() => handleYearChange(year)}
              className={`px-4 py-2 rounded-full font-medium border transition ${
                selectedYear === year
                  ? "bg-[#06d6a0] text-white border-[#06d6a0]"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              {year}
            </button>
          ))}
        </div>

        {/* NET TOTAL (YTD) */}
        <section className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 text-center">
          <h3 className="text-sm text-gray-500 dark:text-gray-400">Net Total ({selectedYear} YTD)</h3>
          <p className={`text-2xl font-bold ${ytdTotal >= 0 ? "text-[#06d6a0]" : "text-red-500"}`}>
            {ytdTotal >= 0 ? "+" : "-"}${Math.abs(ytdTotal).toFixed(2)}
          </p>
        </section>

        {/* CHART SECTION (YTD) */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Spending & Income ({selectedYear})</h3>
          <div className="h-72">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </section>

        {/* TRANSACTIONS TABLE */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow overflow-hidden border border-gray-100 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400">
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Amount</th>
                  <th className="px-3 py-3">Description</th>
                  <th className="px-3 py-3">Category</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => (
                  <tr key={t.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                    
                    {/* DATE */}
                    <td className="px-3 py-3">
                      {editId === t.id ? (
                        <input
                          type="date"
                          name="TransactionDate"
                          value={editForm.TransactionDate}
                          onChange={handleEditChange}
                          className="w-full px-2 py-1 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      ) : (
                        t.TransactionDate?.seconds
                          ? new Date(t.TransactionDate.seconds * 1000).toLocaleDateString()
                          : "—"
                      )}
                    </td>

                    {/* AMOUNT */}
                    <td className="px-3 py-3 font-semibold">
                      {editId === t.id ? (
                        <input
                          type="number"
                          name="amount"
                          value={editForm.amount}
                          onChange={handleEditChange}
                          className="w-full px-2 py-1 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      ) : (
                        <span className={t["transaction amount"] < 0 ? "text-red-500" : "text-[#06d6a0]"}>
                          {t["transaction amount"] < 0 ? "-" : "+"}${Math.abs(t["transaction amount"]).toFixed(2)}
                        </span>
                      )}
                    </td>

                    {/* DESCRIPTION */}
                    <td className="px-3 py-3">
                      {editId === t.id ? (
                        <input
                          type="text"
                          name="Description"
                          value={editForm.Description}
                          onChange={handleEditChange}
                          className="w-full px-2 py-1 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      ) : (
                        t.Description
                      )}
                    </td>

                    {/* CATEGORY */}
                    <td className="px-3 py-3">
                      {editId === t.id ? (
                        <input
                          type="text"
                          name="Category"
                          value={editForm.Category}
                          onChange={handleEditChange}
                          className="w-full px-2 py-1 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      ) : (
                        t.Category
                      )}
                    </td>

                    {/* ACTIONS */}
                    <td className="px-3 py-3 flex gap-2">
                      {editId === t.id ? (
                        <>
                          <button
                            onClick={() => saveEdit(t.id)}
                            className="px-3 py-1 rounded bg-[#06d6a0] text-white hover:bg-[#06be8d] text-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-3 py-1 rounded bg-gray-300 dark:bg-gray-600 text-sm"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(t)}
                            className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(t.id)}
                            className="px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600 flex items-center justify-center"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div className="grid grid-cols-5 text-[11px]">
          {[
            { label: "Dashboard", icon: Home, to: "/dashboard" },
            { label: "Goals", icon: Target, to: "/goals" },
            { label: "Social", icon: Users, to: "/social" },
            { label: "Profile", icon: User, to: "/profile" },
          ].map(({ label, icon: Icon, to }) => (
            <Link
              key={label}
              to={to}
              className="flex flex-col items-center justify-center py-2 transition text-gray-500 dark:text-gray-400 hover:text-[#06d6a0] dark:hover:text-[#06d6a0]"
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

export default TransactionsPage;