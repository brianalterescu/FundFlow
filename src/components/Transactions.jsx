import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useContext } from "react";
import { TransactionContext } from "../context/TransactionContext";  // Imports the TransactionContext for accessing user data.
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

function Profile() {
  const navigate = useNavigate(); // Constant to call the useNavigate() function
  const [isIncome, setIsIncome] = useState(false); // Defaults the slider to expense, more expenses than income for most users.
  const [user, setUser] = useState(null); // Constant to hold the authenticated user information
  const [profile, setProfile] = useState({}); // Constant to hold the user's profile data
  const { transactions, setTransactions } = useContext(TransactionContext); // Access transactions from context
  const [loading, setLoading] = useState(true); // Loading state for the component
  const [saving, setSaving] = useState(false); // Constant for profile updates
  const [editId, setEditId] = useState(null); // Constant for the ID of the transaction being edited
  const [editForm, setEditForm] = useState({}); // Constant for the form data of the transaction being edited


  const [newTx, setNewTx] = useState({
    // Necessary fields for transactions
    Category: "",
    Description: "",
    amount: "",
    // Default date is set up to be current date.
    TransactionDate: new Date().toISOString().split("T")[0],
  });


  /* ------------------------------------------------- 
  1. Authentication & Transaction Loading 
    - Handles user authentication state changes and loads user 
      data and transactions from Firestore.
  ------------------------------------------------- */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await loadUserData(currentUser);
      } else {
        // If unable to authenticate, return to login page.
        navigate("/login");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  // Constant function to load user data and transactions from Firestore
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
      // Displays error in console if user data fails to load.
      console.error("Error loading user data:", error);
    }
  };
  // Constant function to load transactions for the authenticated user
  const loadTransactions = async (uid) => {
    const transactionsRef = collection(db, "transactions"); //sets the transactions collection
    const q = query(transactionsRef, where("userid", "==", uid)); //matches transactions by checking the uid field in the transactions documents, and matches to the logged in uid
    const querySnapshot = await getDocs(q); //executes query q 
    const txList = querySnapshot.docs.map((doc) => ({
      id: doc.id, // Constant for transaction ID
      ...doc.data(), // Captures all other transaction data fields
    }));
    txList.sort( // Sorts the transactions by date in ascending order
      (a, b) =>
        (a.TransactionDate?.seconds || 0) - (b.TransactionDate?.seconds || 0)
    );
    // Sets the transactions in context
    setTransactions(txList);
  };

  // Constant

  // Constant to handle changes in the new transaction form
  const handleTxChange = (e) =>
    setNewTx({ ...newTx, [e.target.name]: e.target.value });

  // Constant to add a new transaction
  const handleAddTransaction = async () => {
    // If no user is detected, have the user log in.
    if (!user) return alert("You must be logged in.");
    const { Category, Description, amount, TransactionDate } = newTx;
    const fixedDate = new Date(editForm.TransactionDate + "T12:00:00");
    // If any fields are null, an alert is shown to the user.
    if (!Category || !Description || !amount || !TransactionDate)
      return alert("Please fill in all fields.");

    try {
      console.log("isIncome:", isIncome, "amount:", amount);

      await addDoc(collection(db, "transactions"), {
        Category,
        Description,
        "transaction amount": parseFloat(amount) * (isIncome ? 1 : -1),
        userid: user.uid,
        TransactionDate: Timestamp.fromDate(new Date(TransactionDate + "T12:00:00")),
        createdAt: serverTimestamp(),
      });

      // Creates the new transaction based on the new data.
      setNewTx({ Category: "", Description: "", amount: "", TransactionDate: "" });
      // All transactions based on the uid (primary key) are loaded.
      await loadTransactions(user.uid);
      alert("Transaction added successfully!");
    } catch (error) {
      console.log("Error adding transaction:", error);
    }
  };

  // Constant to delete a transaction by its ID
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

  // Constant necessary for editing transactions
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
  // Constant to cancel editing a transaction
  const cancelEdit = () => {
    setEditId(null);
    setEditForm({});
  };
  // Constant to handle changes in the edit transaction form
  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };
  // Constant to save the edited transaction
  const saveEdit = async (id) => {
    const txRef = doc(db, "transactions", id);

    const fixedDate = new Date(editForm.TransactionDate + "T12:00:00");
    await setDoc(
      txRef,
      {
        TransactionDate: Timestamp.fromDate(fixedDate),
        Category: editForm.Category,
        Description: editForm.Description,
        "transaction amount":
          parseFloat(editForm.amount) *
          (editForm.isIncome ? 1 : -1),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    await loadTransactions(user.uid);

    setEditId(null);
    setEditForm({});
  };


  // Constant to return a user to login page after signing them out.
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  // Constant for Rechart data positive transactions are income, negative are expenses
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
  const categories = ["Food", "Gifts", "Health/Medical", "Home", "Transportation", "Personal", "Pets", "Utilities", "Travel", "Debt", "Subscriptions", "Fun", "Social", "Recreational", "Other"];

  return (
    <div className="page">

      {/* Standard Header Bar at the top of the page */}
      <header className="header-bar">
        <Link to="/dashboard">
          <img
            src="./FundFlowLogo2.png"
            alt="Fund Flow Logo"
            className="logo"
          />
        </Link>


        <nav className="nav-links">
          <Link to="/" className="nav-btn">Home</Link>
          <Link to="/dashboard" className="nav-btn">Dashboard</Link>
          <Link to="/social" className="nav-btn">Social</Link>
          <Link to="/profile" className="nav-btn">Profile</Link>
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
          <div className={`toggle-switch ${isIncome ? "expense" : "income"}`}>
            <div className="slider" />
            <button
              className="toggle-option minus"
              onClick={() => setIsIncome(false)}
            >
              Expense
            </button>
            <button
              className="toggle-option plus"
              onClick={() => setIsIncome(true)}
            >
              Income
            </button>

          </div>
        </div>

        {/* Toggle Switch End */}
        <input
          type="date"
          name="TransactionDate"
          value={newTx.TransactionDate}
          onChange={handleTxChange}
          className="input"
        />
        <input
          type="number"
          name="amount"
          value={newTx.amount}
          onChange={handleTxChange}
          placeholder="Amount (67.00)"
          className="input"
        />
        <input
          name="Category"
          value={newTx.Category}
          onChange={handleTxChange}
          placeholder="Category"
          className="input"
        />
        <input
          name="Description"
          value={newTx.Description}
          onChange={handleTxChange}
          placeholder="Description"
          className="input"
        />
        <div className="category-grid">
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
              className={`category-btn ${newTx.Category === cat.name ? "selected" : ""
                }`}
              onClick={() =>
                handleTxChange({
                  target: { name: "Category", value: cat.name },
                })
              }
            >
              <span className="icon">{cat.icon}</span> {cat.name}
            </button>
          ))}
        </div>


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
                    <stop offset="5%" stopColor="#F9295F" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#F9295F" stopOpacity={0} />
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
                  stroke="#F9295F"
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
              color: total >= 0 ? "#00E0A1" : "#F9295F",
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
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id}>

                      {/* DATE */}
                      <td>
                        {editId === t.id ? (
                          <input
                            type="date"
                            name="TransactionDate"
                            value={editForm.TransactionDate}
                            onChange={handleEditChange}
                          />
                        ) : (
                          t.TransactionDate?.seconds
                            ? new Date(t.TransactionDate.seconds * 1000).toLocaleDateString()
                            : "—"
                        )}
                      </td>

                      {/* AMOUNT */}
                      <td>
                        {editId === t.id ? (
                          <input
                            type="number"
                            name="amount"
                            value={editForm.amount}
                            onChange={handleEditChange}
                          />
                        ) : (
                          <span
                            style={{
                              fontWeight: "bold",
                              color:
                                t["transaction amount"] < 0 ? "#F9295F" : "#00E0A1",
                            }}
                          >
                            {t["transaction amount"] < 0 ? "-" : "+"}$
                            {Math.abs(t["transaction amount"])}
                          </span>
                        )}
                      </td>

                      {/* DESCRIPTION */}
                      <td>
                        {editId === t.id ? (
                          <input
                            type="text"
                            name="Description"
                            value={editForm.Description}
                            onChange={handleEditChange}
                          />
                        ) : (
                          t.Description
                        )}
                      </td>

                      {/* CATEGORY */}
                      <td>
                        {editId === t.id ? (
                          <input
                            type="text"
                            name="Category"
                            value={editForm.Category}
                            onChange={handleEditChange}
                          />
                        ) : (
                          t.Category
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td style={{ display: "flex", gap: "0.4rem" }}>
                        {editId === t.id ? (
                          <>
                            <button
                              className="admin-main-btn"
                              onClick={() => saveEdit(t.id)}
                            >
                              Save
                            </button>
                            <button
                              className="admin-delete-btn"
                              onClick={cancelEdit}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="admin-main-btn"
                              onClick={() => startEdit(t)}
                            >
                              Edit
                            </button>
                            <button
                              className="delete-btn-table"
                              onClick={() => handleDeleteTransaction(t.id)}
                              title="Delete Transaction"
                            >
                              🗑️
                            </button>
                          </>
                        )}
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
