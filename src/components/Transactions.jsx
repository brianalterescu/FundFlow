import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useContext } from "react";
import { TransactionContext } from "../context/TransactionContext";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import "../styles/Transactions.css";
import { updateProfile } from "firebase/auth"; 

// Toggle state for adding transactions 
 {/* Sidebar */}
      <aside className="sidebar">
        <h1 className="logo">FundFlow</h1>
        <nav className="sidebar-nav">
          <a href="/dashboard">Dashboard</a>
          <a href="/transactions">Transactions</a>
          <a href="/friends">Friends</a>
          <a href="/goals" className="active-link">
            Goals
          </a>
          <a href="/profile">Profile</a>
          <a href="/settings">Settings</a>
          <a href="/support">Support</a>
        </nav>
      </aside>

function Profile() {
  const navigate = useNavigate();
  const [isIncome, setIsIncome] = useState(true); 
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({});
  const { transactions, setTransactions } = useContext(TransactionContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTx, setNewTx] = useState({
    // Necessary fields for transactions
    Category: "",
    Description: "",
    amount: "",
    TransactionDate: "",
  });


  
  // Handles user authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await loadUserData(currentUser);
      } else {
        // If no user is detected, redirect to the Login page.
        navigate("/login");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  // Load user data and transactions
  const loadUserData = async (currentUser) => {
    try {
      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        setProfile(userSnap.data());
      } else {
        // If no matching user data is able to be retrieved, it is created.
        await setDoc(userRef, {
          email: currentUser.email,
          uid: currentUser.uid,
          name: currentUser.displayName || "",
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        });
      }

      await loadTransactions(currentUser.uid);
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const loadTransactions = async (uid) => {
    const transactionsRef = collection(db, "transactions"); //sets the transactions collection
    const q = query(transactionsRef, where("userid", "==", uid)); //matches transactions by checking the uid field in the transactions documents, and matches to the logged in uid
    const querySnapshot = await getDocs(q); //executes query q 
    const txList = querySnapshot.docs.map((doc) => ({
      id: doc.id, //firestore doc id for the transaction
      ...doc.data(), //captures all the fields as data
    }));
    txList.sort( //sorts transactions by date
      (a, b) =>
        (a.TransactionDate?.seconds || 0) - (b.TransactionDate?.seconds || 0)
    );
    setTransactions(txList); //lets the UI render the transactions retrieved
  };

  //handlers
  const handleChange = (e) =>
    setProfile({ ...profile, [e.target.name]: e.target.value });

const handleSaveProfile = async () => {
  if (!user) return;
  setSaving(true);

  try {
    await setDoc(
      doc(db, "users", user.uid),
      { name: profile.name, updatedAt: serverTimestamp() },
      { merge: true }
    );


    // TBD - Will utilize for updating url.
    await updateProfile(user, { displayName: profile.name });

    await user.reload(); //try to force refresh so the new name shows, not always working rn
    const refreshedUser = auth.currentUser;
    setUser({ ...refreshedUser }); //sets the user info for the page to the refreshedUser information we just set
    setProfile((prev) => ({ ...prev, name: refreshedUser.displayName }));

    alert("Profile updated successfully!");
  } catch (error) {
    console.error("Error saving profile:", error);
    alert("Error saving profile — check console for details.");
  } finally {
    setSaving(false);
  }
};


  const handleTxChange = (e) =>
    setNewTx({ ...newTx, [e.target.name]: e.target.value });

  const handleAddTransaction = async () => {
    // If no user is detected, have the user log in.
    if (!user) return alert("You must be logged in.");
    const { Category, Description, amount, TransactionDate } = newTx;

    // If any fields are null, an alert is shown to the user.
    if (!Category || !Description || !amount || !TransactionDate)
      return alert("Please fill in all fields.");

    try {
      await addDoc(collection(db, "transactions"), {
        Category,
        Description,
        "transaction amount": parseFloat(amount) * (isIncome ? 1 : -1),
        userid: user.uid,
        TransactionDate: Timestamp.fromDate(new Date(TransactionDate)),
        createdAt: serverTimestamp(),
      });

      // Creates the new transaction based on the new data.
      setNewTx({ Category: "", Description: "", amount: "", TransactionDate: "" });
      // All transactions based on the uid (primary key) are loaded.
      await loadTransactions(user.uid);
      alert("Transaction added successfully!");
    } catch (error) {
      console.error("Error adding transaction:", error);
    }
  };

  // Function to delete a transaction by its ID
  const handleDeleteTransaction = async (id) => {
    // Confirm with user before deleteing. If they cancel exit the function early
    if (!window.confirm("Are you sure you want to delete this transaction?")) return;
  
    try {

      // Delete transaction document from the firestore "transactions" collection
      await deleteDoc(doc(db, "transactions", id));

      // Reload the transactions for the current user to update the UI
      await loadTransactions(user.uid);
    } catch (error) {
      // If an error occurs during deletion, log it to the console
      console.error("Error deleting transaction:", error);

      // Show an alert notifcation to the user indiation deletion failed
      alert("Failed to delete transaction.");
    }
  };
  

  // Returns user to login page after signing them out.
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  // rechart data positive transactions are income, negative are expenses
  const chartData = transactions.map((t) => ({
    date: t.TransactionDate?.seconds
      ? new Date(t.TransactionDate.seconds * 1000).toLocaleDateString() //fixes issue where firebase datestring was not cooperating with rechart formatting by converting to a different type of date string
      : "Unknown",
    income: t["transaction amount"] > 0 ? t["transaction amount"] : 0, //income is defined as transactions with a positive value 
    expense: t["transaction amount"] < 0 ? Math.abs(t["transaction amount"]) : 0, //expenses are transactions with a negative value
  }));

  const total = transactions.reduce(
    (acc, t) => acc + t["transaction amount"],
    0
  );

  // Displays loading message to user.
  // TBD - Add loading icon here.
  if (loading) return <p style={{ color: "#fff", textAlign: "center" }}>Loading...</p>;

  return (
    <div className="page">
      {/* Standard Header Bar at the top of the page */}
      <header className="header-bar">
        <div className="logo"> FundFlow</div>
        <nav className="nav-links">
          <Link to="/" className="nav-btn">Home</Link>
          <Link to="/dashboard" className="nav-btn">Dashboard</Link>
          <Link to="/profile" className="nav-btn" style={{ color: "#00E0A1" }}>Profile</Link>
          <button onClick={handleLogout} className="logout-small">Logout</button>
        </nav>
      </header>

      <div className="header-spacer" />

      {/* MAIN CARD */}
    
    

        

        {/* Section for adding a transaction.*/}
        <div className="section">
          <h2 className="section-header">Add Transaction</h2>
           {/* Toggle Switch Start */}
            <div className="toggle-switch-wrapper">
            <div className={`toggle-switch ${isIncome ? "income" : "expense"}`}>
              <div className="slider" />
              <button
                className="toggle-option plus"
                onClick={() => setIsIncome(true)}
              >
                +
              </button>
              <button
                className="toggle-option minus"
                onClick={() => setIsIncome(false)}
              >
                -
              </button>
            </div>
          </div>

        {/* Toggle Switch End */}
          <input
            name="Category"
            value={newTx.Category}
            onChange={handleTxChange}
            placeholder="Category (e.g. Dining/Entertainment)"
            className="input"
          />
          <input
            name="Description"
            value={newTx.Description}
            onChange={handleTxChange}
            placeholder="Description (e.g. Business Name, What you bought or got paid for)"
            className="input"
          />
          <input
            type="number"
            name="amount"
            value={newTx.amount}
            onChange={handleTxChange}
            placeholder="Amount (e.g. 56)"
            className="input"
          />
          <input
            type="date"
            name="TransactionDate"
            value={newTx.TransactionDate}
            onChange={handleTxChange}
            className="input"
          />
          <button onClick={handleAddTransaction} className="primary-btn">
            Add Transaction
          </button>
        

        {/*TBD- rechart of income vs expenses may get replaced with chartjs down the line which does not require an installed package */}
        <div className="section">
          <h2 className="section-header">Money Flow Overview</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="incomeColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00E0A1" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#00E0A1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#00E0A1"
                  fillOpacity={1}
                  fill="url(#incomeColor)"
                  name="Money In"
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="#EF4444"
                  fillOpacity={1}
                  fill="url(#expenseColor)"
                  name="Money Out"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="empty-text">No transactions to display yet.</p>
          )}
        </div>

        <div className="summary-box">
          <h3>Net Total:</h3>
          <p
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: total >= 0 ? "#00E0A1" : "#EF4444",
            }}
          >
            {total >= 0 ? "+" : "-"}${Math.abs(total).toFixed(2)}
          </p>
        </div>

        {/* Transactions  */}
     <div className="section">
  <h2 className="section-header">Your Transactions</h2>

  {transactions.length > 0 ? (
    <div className="tx-table-wrapper">
      <table className="tx-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Description</th>
            <th>Amount</th>
            <th>Date</th>
            <th>Delete</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id}>
              <td>{t.Category}</td>
              <td>{t.Description}</td>
              <td
                style={{
                  fontWeight: "bold",
                  color: t["transaction amount"] < 0 ? "#EF4444" : "#00E0A1",
                  textAlign: "right"
                }}
              >
                {t["transaction amount"] < 0 ? "-" : "+"}${Math.abs(t["transaction amount"])}
              </td>
              <td>
                {t.TransactionDate?.seconds
                  ? new Date(t.TransactionDate.seconds * 1000).toLocaleDateString()
                  : "—"}
              </td>
              <td>
  <button
    className="delete-btn-table"
    onClick={() => handleDeleteTransaction(t.id)}
    title="Delete Transaction"
  >
    🗑️
  </button>
</td>

            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p className="empty-text">No transactions yet.</p>
  )}
</div>
      </div>
    </div>
  );
}

export default Profile;
