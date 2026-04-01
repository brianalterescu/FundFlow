// Necessary imports React, Home, Login, Signup, Dashboard, and Profile.

// App.jsx gets run by main.jsx

// main.jsx --> App.jsx
import { Routes, Route } from "react-router-dom";
import Home from "./components/Home.jsx";
import Login from "./components/Login.jsx";
import Signup from "./components/Signup.jsx";
import Dashboard from "./components/Dashboard.jsx";
import Profile from "./components/Profile.jsx";
import ViewProfile from "./components/ViewProfile.jsx";
import EditPicture from "./components/EditPicture";
import Goals from "./components/Goals.jsx";
import Transactions from "./components/Transactions.jsx";
import Features from "./components/Features.jsx";
import Users from "./components/Users.jsx";
import Social from "./components/Social.jsx";
import CSV from "./components/CSV.jsx";
import Connections from "./components/Followers.jsx";
import IncomeForecastTool from "./components/IncomeForecast.jsx";
import Wrapped from "./components/Wrapped.jsx";
import Admin from "./components/Admin.jsx";
import AdvancedScriptPanel from "./components/AdvancedScriptPanel.jsx"; // New import for AdvancedScriptPanel
import Learn from "./components/Learn.jsx";
import TermsOfService from "./components/TermsOfService.jsx";
import Onboarding from "./components/Onboarding.jsx";
import Budget from "./components/Budget.jsx";
// import LoadingProvider from "./components/LoadingContext.jsx";
// Common commands to get hosting working
// npm install firebase
// npm install vite
// npm install rechart

function App() {
  return (
    // Handles the routes for the each page in the navigation bar using the react router.
    // Essentially setting up constant paths for the other components.
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/user/:uid" element={<ViewProfile />} />
      <Route path="/editpicture" element={<EditPicture />} />
      <Route path="/goals" element={<Goals />} />
      <Route path="/transactions" element={<Transactions />} />
      <Route path="/features" element={<Features />} />
      <Route path="/users" element={<Users />} />
      <Route path="/social" element={<Social />} />
      <Route path="/csv" element={<CSV />} />
      <Route path="/connections" element={<Connections />} />
      <Route path="/incomeforecast" element={<IncomeForecastTool />} />
      <Route path="/wrapped" element={<Wrapped />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/learn" element={<Learn />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/budget" element={<Budget />} />
    </Routes>
  );
}

export default App;
