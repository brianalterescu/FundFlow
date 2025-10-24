import React, { useContext } from "react";
import "../styles/Dashboard.css";
import { TransactionContext } from "../context/TransactionContext";


// Necessary JavaScript functions
function Dashboard() {
  const { transactions } = useContext(TransactionContext);

  // Variable for determining the total income.
  const totalIncome = transactions.reduce((sum, tx) => {
    return tx["transaction amount"] > 0 ? sum + tx["transaction amount"] : sum;
  }, 0);


  // Variable for determining the total expenses.
  const totalExpenses = transactions.reduce((sum, tx) => {
    return tx["transaction amount"] < 0
      ? sum + Math.abs(tx["transaction amount"])
      : sum;
  }, 0);

  // Variable for determining the total balance.
  const totalBalance = totalIncome - totalExpenses;

  return (
    // Anything being returned is mostly HTML
    <div className="dashboard-layout">
    {/* Navigation Sidebar */}
     <aside className="sidebar">
      <h1 className="logo">FundFlow</h1>
        <nav className="sidebar-nav">
          <a href="/dashboard">Dashboard</a>
          <a href="/transactions">Transactions</a>
               <a href="/goals">Goals</a>
          <a href="/friends">Friends</a>
           <a href="/profile">Profile</a>
           <a href='/user'>Users</a>
          <a href="/settings">Settings</a>
          <a href="/support">Support</a>
        </nav>
    </aside>

      {/* Main content */}
      <main className="dashboard-content">
        {/* Summary Cards */}
        <section className="summary-cards">
          <div className="card balance-card">
            <h3>Total Balance</h3>
            <p>${totalBalance.toFixed(2)}</p>
          </div>
          <div className="card income-card">
            <h3>Total Income</h3>
            <p>${totalIncome.toFixed(2)}</p>
          </div>
          <div className="card expenses-card">
            <h3>Total Expenses</h3>
            <p>${totalExpenses.toFixed(2)}</p>
          </div>
          <div className="card goals-card">
            <h3>Personal Goals Progress</h3>
            <p>80%</p>
          </div>
          <div className="card goals-card">
            <h3>Group Goals Progress</h3>
            <p>85%</p>
          </div>
          
        </section>

        {/* Transactions & Charts */}
        <section className="main-section">
          <div className="transactions">
            <h2>Recent Transactions</h2>
            {transactions.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                        <tbody>
                           {/*  Clone the transactions array and sort it by TransactionDate (newest first).
                                Using the spread operator avoids mutating the original array. */}
                  {[...transactions]
                  // Sort by Firestore timestamp in descending order (most recent first)
                  .sort((a, b) => (b.TransactionDate?.seconds ?? 0) - (a.TransactionDate?.seconds ?? 0))

                   // Map over each transaction object to render a table row (<tr>)
                  .map(({ id, TransactionDate, Description, Category, ["transaction amount"]: amount }) => (

                    // Each row needs a unique key prop for React’s rendering system
                  <tr key={id}>

                     {/* Convert Firestore timestamp (in seconds) to a human-readable date.
                    Multiply by 1000 to convert seconds -> milliseconds.
                    If no date exists, display a dash "-".*/}
                  <td>{TransactionDate?.seconds ? new Date(TransactionDate.seconds * 1000).toLocaleDateString() : "—"}</td>

                  {/* Display the transaction’s description text and Category */}
                  <td>{Description}</td>
                  <td>{Category}</td>

                   {/* Display the transaction amount:
                    - If amount < 0 → red (#EF4444) to indicate expense
                    - If amount > 0 → green (#00E0A1) to indicate income
                    - Make text bold for emphasis
                    - Use "+" or "-" prefix depending on sign
                    - Use Math.abs() to remove the negative sign before formatting
                    - .toFixed(2) ensures two decimal places */}
                    
                  <td style={{ color: amount < 0 ? "#EF4444" : "#00E0A1", fontWeight: "bold" }}>
                    {amount < 0 ? "-" : "+"}${Math.abs(amount).toFixed(2)}
                </td>
              </tr>
              ))}
            </tbody>
              </table>
            ) : (
              <p>No transactions yet.</p>
            )}
          </div>

          <div className="charts">
            <h2>Spending Breakdown</h2>
            <div className="chart-placeholder">
              <p>[Graph will go here]</p>
            </div>
          </div>
        </section>

        {/* Social Feed */}
        <section className="social-feed">
          <h2>Friends' Updates</h2>
          <div className="feed-item">
            <p>
              <strong>Antonious</strong> reached 80% of his savings goal!
            </p>
          </div>
          <div className="feed-item">
            <p>
              <strong>Marlen</strong> added a new goal  "Save enough to stop checking prices"
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="dashboard-footer">
          <p>FundFlow &copy; 2025</p>
        </footer>
      </main>
    </div>
  );
}

export default Dashboard;
