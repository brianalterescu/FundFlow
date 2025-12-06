import React from "react"; // Brings React Library into scope, may not be used in this specific file but is a common practice.
; import { Link } from "react-router-dom";  // Imports Link component from react-router-dom for navigation between routes in a single page application.  import { Link } from "react-router-dom";  // Imports Link component from react-router-dom for navigation between routes in a single page application.
import "../styles/Learn.css"; // Uses the specific CSS file for styling this component.

function Learn() {
  return (
    <div className="learn-container">
      {/* Navbar */}
      {/* Standard navigation to access other JSX files */}
      <header className="header-bar">
        <Link to="/dashboard">
          <img src="./FundFlowLogo2.png" alt="Fund Flow Logo" className="logo" />
        </Link>
        <nav className="learn-nav-links">
          <Link to="/" className="nav-btn">Home</Link>
          <Link to="/dashboard" className="nav-btn">Dashboard</Link>
          <Link to="/profile" className="nav-btn">Profile</Link>
        </nav>
      </header>

      <div className="learn-main">
        <h1 className="learn-title">Why use Fund Flow?</h1>
        <p className="learn-intro">
          Too many ways to spend money, not enough ways to earn it. Making the most of your money is key. Fund Flow helps you take control of your finances in a smart, simple way.
        </p>

        <div className="learn-features">
          <div className="feature-card">
            <h3>Track Your Expenses</h3>
            <p>
              Keep track of every expense without creating endless spreadsheets. Easily edit transactions if you make a mistake.
            </p>
          </div>

          <div className="feature-card">
            <h3>Set Financial Goals</h3>
            <p>
              Plan your spending and income goals to stay on track. Achieve more with clear targets and reminders.
            </p>
          </div>

          <div className="feature-card">
            <h3>Graph Analysis</h3>
            <p>
              Visualize your spending habits with charts and graphs. Understand where your money is going and make informed decisions.
            </p>
          </div>

          <div className="feature-card">
            <h3>Social & Connections</h3>
            <p>
              Follow your friends, block users, and see how your spending compares. Fund Flow makes finances social.
            </p>
          </div>

          <div className="feature-card">
            <h3>Customize Your Profile</h3>
            <p>
              Personalize your account, update your information, and make Fund Flow truly yours.
            </p>
          </div>

          <div className="feature-card">
            <h3>Analyze & Improve</h3>
            <p>
              Start analyzing your spending habits for better money management. Make smarter decisions and maximize your resources.
            </p>
          </div>
        </div>

        <div className="learn-cta">
          <h2>Ready to take control of your finances?</h2>
          <Link to="/signup" className="cta-btn">Sign Up Now</Link>
        </div>
      </div>
    </div>
  );
}

export default Learn;
