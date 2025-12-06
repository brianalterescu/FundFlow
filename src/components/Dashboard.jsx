import React, { useContext } from "react";
import "../styles/Dashboard.css";
import { TransactionContext } from "../context/TransactionContext";  // Imports the TransactionContext for accessing user data.
import NotificationBell from "./NotificationBell";
import NotificationList from "./NotificationList";
import { useNotificationContext } from "../context/NotificationContext";

function Dashboard() {
  const { transactions } = useContext(TransactionContext);

  // Pull notifications from context
  const { notifications, loading: notificationsLoading, unreadCount, markAllAsRead } =
    useNotificationContext();

  // Variables for income/expenses/balance
  const totalIncome = transactions.reduce(
    (sum, tx) => (tx["transaction amount"] > 0 ? sum + tx["transaction amount"] : sum),
    0
  );

  const totalExpenses = transactions.reduce(
    (sum, tx) => (tx["transaction amount"] < 0 ? sum + Math.abs(tx["transaction amount"]) : sum),
    0
  );




  const totalBalance = totalIncome - totalExpenses;

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <h1 className="logo">FundFlow</h1>
        {/* <div className="logo"> <img src="./FundFlowLogo2.png" href="/" width={"100%rem"} height={"100%em"}></img></div> */}

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
          {/* <a href="/settings">Settings</a> */}
          {/* <a href="/support">Support</a> */}
        </nav>
      </aside>

      {/* Main Content */}
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


          {/* Pass unreadCount to NotificationBell */}
          <NotificationBell unreadCount={unreadCount} />
        </section>

        {/* Notifications Section */}


        <section className="notifications">
          <h3>Notifications</h3>
          {notificationsLoading ? (
            <p>Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <p>No notifications.</p>
          ) : (
            <NotificationList notifications={notifications} />
          )}
          {notifications.length > 0 && (
            <button className={"self-profile-primary-btn"} onClick={markAllAsRead}>Mark All as Read</button>
          )}

          <button
            className="btn btn-clear-notifications"
            onClick={() => {
              if (window.confirm("Are you sure you want to clear all notifications?")) {
                markAllAsRead(); // or your context method to clear notifications
              }
            }}
          >
            Clear Notifications
          </button>
        </section>




        {/* Transactions & Charts */}
        <section className="main-section">
          <div className="transactions">
            <h2>Recent Transactions</h2>

            {/* Show table if transactions exist */}
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
                  {/* Sort newest to oldest */}
                  {[...transactions]
                    .sort((a, b) => {
                      const aTime = a.TransactionDate?.seconds ?? 0;
                      const bTime = b.TransactionDate?.seconds ?? 0;
                      return bTime - aTime;
                    })
                    .map((tx) => {
                      const {
                        id,
                        TransactionDate,
                        Description,
                        Category,
                        ["transaction amount"]: rawAmount,
                      } = tx;

                      // Parse and format data
                      const amount = Number(rawAmount) || 0;
                      const isExpense = amount < 0;
                      const date = TransactionDate?.seconds
                        ? new Date(TransactionDate.seconds * 1000).toLocaleDateString()
                        : "—";

                      return (
                        <tr key={id}>
                          <td>{date}</td>
                          <td>{Description}</td>
                          <td>{Category}</td>
                          <td
                            style={{
                              color: isExpense ? "#EF4444" : "#00E0A1",
                              fontWeight: "bold",
                            }}>
                            {isExpense ? "-" : "+"}${Math.abs(amount).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            ) : (
              /* No transactions fallback */
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
              <strong>Marlen</strong> added a new goal "Save enough to stop checking
              prices"
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="dashboard-footer">
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

export default Dashboard;
