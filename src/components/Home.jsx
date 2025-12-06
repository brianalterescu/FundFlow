import React from "react"; // Brings React Library into scope, may not be used in this specific file but is a common practice. 
; import { Link } from "react-router-dom";  // Imports Link component from react-router-dom for navigation between routes in a single page application.
import "../styles/Home.css"; // Uses the specific CSS file for styling this component.

function Home() {
  return (
    <div className="home">
      {/* Navbar */}
      {/* Standard navigation to access other JSX files */}
      <header className="navbar">
        <Link to="/">
          <img
            src="./FundFlowLogo2.png"
            alt="Fund Flow Logo"
            className="logo"
          />
        </Link>
        <nav className="nav-links">
          <Link to="/features" className="nav-btn">Features</Link>
          <Link to="/learn" className="nav-btn">Learn</Link>
          <Link to="/login">
            <button className="btn-outline">Log In</button>
          </Link>
          <Link to="/signup">
            <button className="btn-primary">Get Started</button>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="home-hero">
        <div className="home-hero-text">
          <h1>
            All-in-One <span className="home-accent">Social Finance</span> Tracker
          </h1>
          <p>
            Track your money, share insights, and grow smarter together. Fund
            Flow makes finances simple, social, and seamless.
          </p>
          <div className="hero-buttons">
            <Link to="/signup">
              <button className="home-btn-primary">Get Started Free</button>
            </Link>
            <Link to="/features">
              <button className="home-btn-outline">Learn More</button>
            </Link>
          </div>
        </div>

        <div className="hero-image">
          <img src="./desktop.png" alt="App Preview" />
        </div>
      </section>

      {/* Features Section */}
      <section className="home-features">
        <h2>Why FundFlow?</h2>
        <p>All the tools you need to manage your finances, socialize, and grow.</p>
        <div className="home-feature-cards">
          <div className="home-feature-card">
            <h3>Track Your Expenses</h3>
            <p>
              Keep track of every expense without creating endless spreadsheets. Easily edit transactions if you make a mistake.
            </p>
          </div>
          <div className="home-feature-card">
            <h3>Set Financial Goals</h3>
            <p>
              Plan your spending and income goals to stay on track. Achieve more with clear targets and reminders.
            </p>
          </div>
          <div className="home-feature-card">
            <h3>Graph Analysis</h3>
            <p>
              Visualize your spending habits with charts and graphs. Understand where your money is going and make informed decisions.
            </p>
          </div>
          <div className="home-feature-card">
            <h3>Social & Connections</h3>
            <p>
              Follow your friends, block users, and see how your spending compares. Fund Flow makes finances social.
            </p>
          </div>

          <div className="home-feature-card">
            <h3>Customize Your Profile</h3>
            <p>
              Personalize your account, update your information, and make Fund Flow truly yours.
            </p>
          </div>
          <div className="home-feature-card">
            <h3>Analyze & Improve</h3>
            <p>
              Start analyzing your spending habits for better money management. Make smarter decisions and maximize your resources.
            </p>
          </div>
        </div>
        <div className="cta-buttons">
          <Link to="/signup">
            <button className="home-btn-primary">Start Tracking Now</button>
          </Link>
          <Link to="/learn">
            <button className="home-btn-outline-accent">Discover More</button>
          </Link>
        </div>
      </section>

      {/* Footer */}  
<footer className="footer">
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
</div>
  );
}

export default Home;
