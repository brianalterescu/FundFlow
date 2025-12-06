import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, provider, db } from "../firebaseConfig";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import "../styles/Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate(); // useNavigate hook

  // Save user info in Firestore
  const saveUserToFirestore = async (user) => {
    const userRef = doc(db, "users", user.uid);
    await setDoc(
      userRef,
      {
        // Firebase User ID
        uid: user.uid,
        // User Display Name
        name: user.displayName || null,
        // User's Email Address
        email: user.email,
        // Last Login from Firebase
        lastLogin: serverTimestamp()
      },
      { merge: true }
    );
  };

  // Handles regular Email & Password login.
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await saveUserToFirestore(userCredential.user);
      navigate("/dashboard");
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        alert("No account found with that email. Please sign up instead.");
      } else if (error.code === "auth/wrong-password") {
        alert("Incorrect password. Try again.");
      } else {
        alert(error.message);
      }
    }
  };
  

  // Google OAUth login
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      await saveUserToFirestore(result.user);
      // Once user is successfully logged in with Google, dashboard is redirected to the homepage.
      navigate("/dashboard"); //  redirect after Google login
    } catch (error) {
      console.error(error.message);
      alert("Google login failed: " + error.message);
    }
  };

  // This is what is being returned to the index page.
  return (
    <div className="login-container">
      <div className="navbar">
        <div className="logo"> <img src="./FundFlowLogo2.png" href="/" width={"100%rem"} height={"100%em"}></img></div>

        
        <div className="nav-links">
          <a href="/" className="nav-btn">Home</a>
          <a href="/features" className="nav-btn">Features</a>
          <a href="/learn" className="nav-btn">Learn</a>
          <a href="/signup" className="home-btn-primary">Sign Up</a>
        </div>
      </div>

      <form className="login-form" onSubmit={handleLogin}>
        <h1>Log In</h1>
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
        />
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
        />
        <button type="submit">Login</button>
        <button type="button" className="google-login-btn" onClick={handleGoogleLogin}>
          Login with Google
        </button>
      </form>
    </div>
  );
}
