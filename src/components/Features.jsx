import React from "react"; // Brings React Library into scope, may not be used in this specific file but is a common practice.
import { Link } from "react-router-dom";
import "../styles/Features.css"; // Uses the specific CSS file for styling this component.

const Features = () => {
  return (
    <div className="features-features-page">
      {/* Navbar */}
      {/* Standard navigation to access other JSX files */}
      <header className="navbar">
        <Link to="/dashboard">
          <img
            src="./FundFlowLogo2.png"
            alt="Fund Flow Logo"
            className="logo"
          />
        </Link>
        <nav className="nav-links">
          <Link to="/features" className="nav-btn">Features</Link>
          <Link to="/learn" className="nav-btn">Learn</Link>
          <Link to="/login" className="nav-btn">
            <button className="btn-outline">Log In</button>
          </Link>
          <Link to="/signup">
            <button className="btn-primary">Get Started</button>
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="features-features-content">
        <section className="hero">
          <h1 className="features-h1">Explore What Fund Flow Can Do</h1>
          <p className="features-p">
            We’re building a smarter way to manage goals, connect with others,
            and stay financially on track.
          </p>
        </section>

        <section className="features-features-list">
          <div className="feature-card">
            <h2>👤 View Another User’s Profile</h2>
            <ul>
              <li className='features-list-item'>Added the ability to view other users’ profiles.</li>
              <li className='features-list-item'>Designed the layout for clear profile details.</li>
              <li className='features-list-item'>Tested viewing functionality successfully.</li>
            </ul>
          </div>

          <div className="feature-card">
            <h2>🚫 User Blocking</h2>
            <ul>
              <li className='features-list-item'>Added a blocking feature to prevent unwanted interactions.</li>
              <li className='features-list-item'>Created backend logic for secure blocking behavior.</li>
              <li className='features-list-item'>Added visual confirmation when blocking someone.</li>
            </ul>
          </div>

          <div className="feature-card">
            <h2>🔒 Blocked User Privacy</h2>
            <ul>
              <li className='features-list-item'>Blocked users can’t view your profile.</li>
              <li className='features-list-item'>Error message displays on restricted access.</li>
              <li className='features-list-item'>Verified privacy filter accuracy.</li>
            </ul>
          </div>

          <div className="feature-card">
            <h2>🎨 Simplified Self Profile View</h2>
            <ul>
              <li className='features-list-item'>Cleaned up layout and removed unnecessary menus.</li>
              <li className='features-list-item'>Improved navigation for a smoother experience.</li>
            </ul>
          </div>

          <div className="feature-card">
            <h2>🖼️ Custom Profile Picture (URL)</h2>
            <ul>
              <li className='features-list-item'>Set a custom profile picture using a URL.</li>
              <li className='features-list-item'>Linked URL input to update the profile automatically.</li>
              <li className='features-list-item'>Verified links display correctly.</li>
            </ul>
          </div>

          <div className="feature-card">
            <h2>🔔 Notifications</h2>
            <ul>
              <li className='features-list-item'>Implemented alerts for user activity and goals.</li>
              <li className='features-list-item'>Interactive notifications linking to Profile & Goals pages.</li>
              <li className='features-list-item'>Messages like “Welcome to the Flow!” add personality.</li>
            </ul>
          </div>

          <div className="feature-card">
            <h2>📊 Goals (Coming Soon)</h2>
            <ul>
              <li className='features-list-item'>Designed the layout and structure for tracking progress.</li>
              <li className='features-list-item'>Will connect directly with notifications next sprint.</li>
            </ul>
          </div>
        </section>

        <footer className="footer">
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
};

export default Features;
