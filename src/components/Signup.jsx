import React, { useState } from "react";
import "../styles/Signup.css";
import { auth, provider, db } from "../firebaseConfig.js";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
// Signup component - allows new users to create an account using email/password or Google authentication
function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    passwordRepeat: "",
    remember: true,
  });

  const handleChange = (e) => { // React event handler that processes changes from submitting fields
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleEmailSignup = async (e) => { // Default signup method (Fields displayed to user)
    e.preventDefault();
    if (formData.password !== formData.passwordRepeat) { // Checks for matching strings from the 2 password fields
      alert("Passwords do not match!");
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword( // Creates user with firebase functions using the submitted email and password
        auth,
        formData.email,
        formData.password
      );
      await saveUserToFirestore(userCredential.user);
      navigate("/");
    } catch (error) {
      alert(error.message);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      await saveUserToFirestore(result.user);
      navigate("/");
    } catch (error) {
      console.error(error.message);
    }
  };

  const saveUserToFirestore = async (user) => { // Function that is called in the email signup function, writes a doc to firebase setting the fields as the user submitted data, for the timestamp fields it takes the server timestamp'
    const userRef = doc(db, "users", user.uid);
    const defaultPicURL = "https://i.imgur.com/1xAP7pJ.png"
    await setDoc(
      userRef,
      {
        uid: user.uid,
        name:
          user.displayName || `${formData.firstName} ${formData.lastName}`,
        email: user.email,
        picURL: defaultPicURL, //add default picture, prevents flickering on profile page from no image being present
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      },
      { merge: true }
    );
  };

  return ( // Displays HTML Elements, text boxes and buttons, navigation bar etc.
    <div className="page">
      <div className="header-bar">
        <div className="logo"> <img src="./FundFlowLogo2.png" href="/" width={"100%rem"} height={"100%em"}></img></div>

        
        <div className="nav-links">
          <a href="/" className="nav-links">Home</a>
          <a href="/features" className="nav-links">Features</a>
          <a href="/learn" className="nav-links">Learn</a>
          <a href="/login" className="logout-small">Login</a>
        </div>
      </div>
      <div className="header-spacer" />

      {/* Existing Signup Form */}
      <div className="signup-container">
        <h1>Sign Up</h1>
        <p>Create your <a>Fund Flow</a> account</p>

        <form id="signup-form" onSubmit={handleEmailSignup}>
          <input
            type="text"
            name="firstName"
            placeholder="First Name"
            value={formData.firstName}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="lastName"
            placeholder="Last Name"
            value={formData.lastName}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="passwordRepeat"
            placeholder="Repeat Password"
            value={formData.passwordRepeat}
            onChange={handleChange}
            required
          />

          <label>
            <input
              type="checkbox"
              name="remember"
              checked={formData.remember}
              onChange={handleChange}
            />{" "}
        Remember me
          </label>

          <p className="terms">
            By creating an account you agree to our{" "}
            <a href="#" style={{ color: "dodgerblue" }}>
              Terms & Privacy
            </a>.
          </p>

          <div className="signup-btn-container">
            <button type="submit">Sign Up</button>
          </div>
        </form>

        <h4>Or Sign Up Using</h4>
        <button className="google-signup-btn" onClick={handleGoogleSignup}>
          Sign Up with Google
        </button>
      </div>
    </div>
  );
}

export default Signup;
