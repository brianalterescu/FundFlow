import React from "react";
import { Link } from "react-router-dom";
import "../styles/Home.css";

function Home() {
  return (
    <div className="home">
      {/* Navbar */}
      <header className="navbar">
        <Link to="/">
          <img
            src="./FundFlowLogo.png"
            alt="Fund Flow Logo"
            className="logo"
          />
        </Link>
        <nav className="nav-links">
          <Link to="/features">Features</Link>
          <Link to="/learn">Learn</Link>
          <Link to="/login">
            <button className="btn-outline">Log In</button>
          </Link>
          <Link to="/signup">
            <button className="btn-primary">Get Started</button>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-text">
          <h1>
            All-in-One <span className="accent">Social Finance</span> Tracker
          </h1>
          <p>
            Track your money, share insights, and grow smarter together. Fund
            Flow makes finances simple, social, and seamless.
          </p>
          <div className="hero-buttons">
            <Link to="/signup">
              <button className="btn-primary">Get Started Free</button>
            </Link>
            <Link to="/features">
              <button className="btn-outline-accent">Learn More</button>
            </Link>
          </div>
        </div>

        <div className="hero-image">
          <img src="https://placehold.co/600x400" alt="App Preview" />
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <h2>Why FundFlow?</h2>
        <p>All the tools you need to manage your finances, socialize, and grow.</p>
        <div className="feature-cards">
          <div className="feature-card">
            <h3>Track Your Expenses</h3>
            <p>Easily categorize spending, visualize trends, and see where your money goes.</p>
          </div>
          <div className="feature-card">
            <h3>Social Goals</h3>
            <p>Set savings goals and celebrate milestones with friends and family.</p>
          </div>
          <div className="feature-card">
            <h3>Insights & Analytics</h3>
            <p>Receive smart financial insights to optimize your budgeting and savings.</p>
          </div>
          <div className="feature-card">
            <h3>Secure & Private</h3>
            <p>Your data is protected with top-tier security standards you can trust.</p>
          </div>
        </div>
        <div className="cta-buttons">
          <Link to="/signup">
            <button className="btn-primary">Start Tracking Now</button>
          </Link>
          <Link to="/learn">
            <button className="btn-outline-accent">Discover More</button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>This is a Senior Capstone Project for Farmingdale State College.</p>
        <p>
          Created by Brian Alterescu, Antonious Yakoub, Christopher Brady,
          Marlen Zavala-Maldonado, and Katherine Acosta.
        </p>
      </footer>
    </div>
  );
}

export default Home;
