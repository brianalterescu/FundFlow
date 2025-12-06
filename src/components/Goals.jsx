import React, { useState, useEffect, useContext } from "react"; // React Library for building user interfaces and functionality
import "../styles/Goals.css"; // Specific CSS file for styling this component
import { TransactionContext } from "../context/TransactionContext";  // Imports the TransactionContext for accessing user data. 
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebaseConfig"; // Imports the Firestore database module from the project's configuration.

// Constant to get first and last day of current month
const getMonthRange = () => {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { first, last };
};

// Constant handling a Transaction Date parsing from various formats.
const parseTxDate = (tx) => {
  const td = tx?.TransactionDate ?? tx?.date ?? tx?.Date;
  if (!td) return null;

  if (td && typeof td === "object" && typeof td.seconds === "number") {
    return new Date(td.seconds * 1000);
  }

  if (td && typeof td.toDate === "function") {
    try {
      return td.toDate();
    } catch {
      return null;
    }
  }

  if (typeof td === "string") {
    const d = new Date(td);
    return isNaN(d) ? null : d;
  }

  if (td instanceof Date) return td;

  return null;
};

// Constant handling a Transaction Amount parsing from various formats.
const getTxAmount = (tx) => {
  const candidates = [
    tx["transaction amount"],
    tx["transaction_amount"],
    tx.transactionAmount,
    tx.Amount,
    tx.amount,
    tx.value,
    tx["amount ($)"],
  ];
  for (const c of candidates) {
    if (c !== undefined && c !== null && c !== "") {
      const n = Number(c);
      return isNaN(n) ? null : n;
    }
  }
  return null;
};
// Constant handling a Transaction Category parsing from various formats.
const getTxCategory = (tx) =>
  (tx.Category ?? tx.category ?? tx.cat ?? "").toString().trim();

// Constant to calculate progress (%) of a goal based on transactions.
const calculateProgress = (goal, transactionsList) => {
  if (!Array.isArray(transactionsList) || transactionsList.length === 0) {
    return { currentAmount: 0, percentageAchieved: 0 };
  }

  // Start Date at 00:00:00 and End Date at 23:59:59.999 for inclusivity
  const start = new Date(goal.startDate + "T00:00:00");
  // End Date at 23:59:59.999 for inclusivity
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

    // Two types of goals: "expense" (negative amounts) and "income" (positive amounts)
    const goalType = (goal.type ?? "expense").toString().toLowerCase();
    if (goalType === "expense" && amount < 0) {
      total += Math.abs(amount);
    } else if (goalType === "income" && amount > 0) {
      total += amount;
    }
  }

  // The expected amount from the goal
  const expected = Number(goal.expectedAmount) || 0;
  // The calculated percentage towards the goal
  const percent = expected > 0 ? Math.min(Math.round((total / expected) * 100), 100) : 0;
  return { currentAmount: Math.round(total * 100) / 100, percentageAchieved: percent };
};

/* ----------------------------
    1. Goals Function
      - Handles goal creation, display, progress calculation, and deletion.
---------------------------- */
function Goals() {
  const { user, transactions } = useContext(TransactionContext) || {};
  const [goals, setGoals] = useState([]);
  const [type, setType] = useState("Expense");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [expectedAmount, setExpectedAmount] = useState("");
  const { first, last } = getMonthRange();
  const [startDate, setStartDate] = useState(first.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(last.toISOString().split("T")[0]);

  // Fetches the users current goals.
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

  // Constant to handle adding a new goal & creates a notification.
  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!title || !expectedAmount || !category)
      return alert("Please fill all required fields.");

    try {
      const newGoal = {
        userId: user?.uid || "guest",
        type,
        title,
        description,
        category,
        expectedAmount: Number(expectedAmount),
        currentAmount: 0,
        percentageAchieved: 0,
        startDate,
        endDate,
        createdAt: serverTimestamp(),
      };

      // Constant to create a Goal Document in Firebase.
      const goalRef = await addDoc(collection(db, "expectations"), newGoal);

      // Standard data format for notifications.
      const notification = {
        createdAt: serverTimestamp(),
        link: `/goals`,
        message: `You just launched a new goal: "${title}" Check it out!`,
        read: false,
        uid: user?.uid,
      };
      // Constant to create a Notification Document in Firebase.
      await addDoc(collection(db, "notifications"), notification);

      // Update local state
      setGoals((prev) => [...prev, { id: goalRef.id, ...newGoal }]);

      // Reset form
      setTitle("");
      setDescription("");
      setCategory("");
      setExpectedAmount("");
      setType("Expense");
      setStartDate(first.toISOString().split("T")[0]);
      setEndDate(last.toISOString().split("T")[0]);
      // Informs the user when a goal is added.
      alert("Goal added! Notification created.");
    } catch (err) {
      // Debugging error message in console.
      console.error("Error adding goal:", err);
    }
  };

  // Constant to handle deleting a goal.
  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm("Delete this goal?")) return;
    try {
      await deleteDoc(doc(db, "expectations", goalId));
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
    } catch (err) {
      console.error("Error deleting goal:", err);
    }
  };

  // Constant for Local-only recalculation of Actual/Progress
  // This sections was eating up our writes go through every transaction on every update.
  const refreshProgress = () => {
    if (!goals.length || !transactions?.length) return;
    const updated = goals.map((g) => {
      const { currentAmount, percentageAchieved } = calculateProgress(g, transactions);
      return { ...g, currentAmount, percentageAchieved };
    });
    setGoals(updated);
  };

  // Recalculate progress when transactions change
  useEffect(() => {
    if (!goals.length || !transactions?.length) return;
    refreshProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions]);

  // Function for processing the Circle Progress Component
  function CircleProgress({ progress }) {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
      <div className="circle-progress">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06d6a0" />
              <stop offset="100%" stopColor="#118ab2" />
            </linearGradient>
          </defs>

          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            stroke="#e5e7eb"
            strokeWidth="10"
            fill="none"
          />

          {/* Gradient progress circle */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            stroke="url(#progressGradient)"
            strokeWidth="10"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />

          {/* Percentage text */}
          <text
            x="50%"
            y="50%"
            dominantBaseline="middle"
            textAnchor="middle"
            fill="#fff"
            fontSize="18px"
            fontFamily="Lexend Deca, sans-serif"
          >
            {progress}%
          </text>
        </svg>
      </div>
    );
  }

  return (
    <div className="goals-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <h1 className="logo">FundFlow</h1>
        <nav className="sidebar-nav">
          <a href="/dashboard">Dashboard</a>
          <a href="/transactions">Transactions</a>
          <a href="/goals">Goals</a>
          <a href="/connections">Connections</a>
          <a href="/searchUser">Users</a>
          <a href="/social">Social</a>
          <a href="/csv">CSV Uploading</a>
          <a href="/profile">Profile</a>
          <a href="/forecast">Income Forecast</a>
          <a href="/wrapped">Wrapped</a>
          {/* <a href="/settings">Settings</a>
          <a href="/support">Support</a> */}
        </nav>
      </aside>

      {/* Main */}
      <main className="goals-content">
        <section className="summary-cards">
          <div className="card-goals-card">
            <h3 className="section-header">Create New Goal</h3>
            <form className="goal-form" onSubmit={handleAddGoal}>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="goals-input"
              >
                <option value="Expense">Planned Expense</option>
                <option value="Income">Planned Income</option>
              </select>

              <input
                type="text"
                placeholder="Goal Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <input
                type="number"
                placeholder="Planned Amount ($)"
                value={expectedAmount}
                onChange={(e) => setExpectedAmount(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <div className="goals-category-grid">
                {[
                  { name: "Food", icon: "🍔" },
                  { name: "Gifts", icon: "🎁" },
                  { name: "Health/Medical", icon: "💊" },
                  { name: "Home", icon: "🏠" },
                  { name: "Transportation", icon: "🚗" },
                  { name: "Personal", icon: "🧍" },
                  { name: "Pets", icon: "🐾" },
                  { name: "Utilities", icon: "💡" },
                  { name: "Travel", icon: "✈️" },
                  { name: "Debt", icon: "💳" },
                  { name: "Subscriptions", icon: "🔄" },
                  { name: "Fun", icon: "🎮" },
                  { name: "Social", icon: "🍻" },
                  { name: "Recreational", icon: "⚽" },
                  { name: "Other", icon: "📦" },
                ].map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    className={`goals-category-btn ${category === cat.name ? "selected" : ""
                      }`}
                    onClick={() => {
                      setCategory(cat.name);
                      if (!title.trim()) setTitle(cat.name);
                    }}
                  >
                    <span className="icon">{cat.icon}</span> {cat.name}
                  </button>
                ))}
              </div>

              <label className="goals-label">Start Date</label>
              <input
                className="goals-label"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />

              <label className="goals-label">End Date</label>
              <input
                className="goals-label"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />

              <button type="submit" className="add-goal-btn">
                Add Goal
              </button>
            </form>
          </div>
        </section>

        <section className="main-section">
          <div className="section-header-row">
            <h2 className="section-header">Your Goals</h2>
            <button className="goals-refresh-btn" onClick={refreshProgress}>
              🔄 Refresh Progress
            </button>
          </div>

          <div className="goals-list">
            {goals.length === 0 ? (
              <p className="no-goals">No goals created yet.</p>
            ) : (
              goals.map((goal) => (
                <div key={goal.id} className="goal-item">
                  <h3>{goal.title}</h3>
                  <p>Type: {goal.type}</p>
                  <p>Category: {goal.category}</p>
                  <p>Planned Amount: ${goal.expectedAmount}</p>
                  <p>Actual Amount: ${goal.currentAmount ?? 0}</p>
                  <p>
                    Duration: {goal.startDate} → {goal.endDate}
                  </p>
                  <CircleProgress progress={goal.percentageAchieved ?? 0} />
                  <button
                    className="goals-delete-btn"
                    onClick={() => handleDeleteGoal(goal.id)}
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <footer className="goals-footer">
          <p>FundFlow &copy; 2025</p>
          <p>This is a Senior Capstone Project for Farmingdale State College.</p>
          <p>
            Created by{" "}
            <a
              href="https://brianalterescu.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              Brian Alterescu
            </a>
            ,{" "}
            <a
              href="https://antyakoub.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              Antonious Yakoub
            </a>
            ,{" "}
            <a
              href="https://www.linkedin.com/in/christopher-brady-193638112/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              Christopher Brady
            </a>
            ,{" "}
            <a
              href="https://www.linkedin.com/in/marlen-zavala/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              Marlen Zavala-Maldonado
            </a>
            , and{" "}
            <a
              href="https://www.linkedin.com/in/katherine-acosta-318431232/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              Katherine Acosta
            </a>
            .
          </p>
        </footer>
      </main>
    </div>
  );
}



export default Goals;
