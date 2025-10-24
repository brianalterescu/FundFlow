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

//common commands to get hosting working
//npm install firebase
//npm install vite
//npm install rechart

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
      <Route path="/edit-picture" element={<EditPicture />} />
      <Route path="/goals" element={<Goals />} />
      <Route path="/transactions" element={<Transactions />} />
    </Routes>
  );
}

export default App;
