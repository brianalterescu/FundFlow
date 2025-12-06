import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged, signOut, deleteUser, updateProfile } from "firebase/auth";
import { useContext } from "react";
import { TransactionContext } from "../context/TransactionContext";  // Imports the TransactionContext for accessing user data.
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import "../styles/Profile.css";

function Profile() {
  const navigate = useNavigate();
  const [isIncome, setIsIncome] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({});
  const { transactions = [], setTransactions } = useContext(TransactionContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");

  const [newTx, setNewTx] = useState({
    Category: "",
    Description: "",
    amount: "",
    TransactionDate: "",
  });

  // Constant to load user on auth state change - auth listener that keeps track of the current logged on user 
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await loadUserData(currentUser);
      } else {
        navigate("/login");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  // Constant to load user data from Firestore
  const loadUserData = async (currentUser) => {
    try {
      const userRef = doc(db, "users", currentUser.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data(); //gets a snap of the current signed on user
        if (!data.picURL || typeof data.picURL !== "string" || data.picURL.trim() === "") {
          data.picURL = "https://i.imgur.com/1xAP7pJ.png"; //set default pic if one isn't found in the user data
        }
        setProfile(data);
      } else {
        await setDoc(userRef, { //catches a potentially authenticated user that isn't in the firestore somehow
          email: currentUser.email,
          uid: currentUser.uid,
          name: currentUser.displayName || "",
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        });
      }
    } catch (e) {
      console.error("Error loading user:", e); //error catch for testing the page - most frequent cause of user not found so far has been firestore rules issues
    }
  };

  // Input controls - changing name and adding transactions - transaction adding has been moved to separate page
  const handleChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });
  const handleTxChange = (e) => setNewTx({ ...newTx, [e.target.name]: e.target.value });

  // Constant to copy profile URL to clipboard
  const handleCopyProfileUrl = async () => {
    try {
      // try to get the uid from context/state first, otherwise fall back to auth.currentUser
      const uid = (user && user.uid) || (auth.currentUser && auth.currentUser.uid);

      if (!uid) {
        alert("You must be logged in to copy your profile link.");
        return;
      }

      const profileUrl = `https://fundflow.ing/users/${uid}`;

      // Primary: modern clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(profileUrl);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement("textarea");
        textarea.value = profileUrl;
        // Avoid scrolling to bottom
        textarea.style.position = "fixed";
        textarea.style.top = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        try {
          document.execCommand("copy");
        } finally {
          document.body.removeChild(textarea);
        }
      }

      // Visual feedback — replace with toast if you have one
      alert("Profile link copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy profile URL:", err);
      alert("Could not copy profile link.");
    }
  };


  // Constant to save profile changes to Firestore and Firebase Auth
  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);

    try {
      await setDoc(
        doc(db, "users", user.uid),
        { name: profile.name, updatedAt: serverTimestamp() },
        { merge: true }
      );

      await updateProfile(user, { displayName: profile.name });

      await user.reload();
      const refreshedUser = auth.currentUser;
      setUser({ ...refreshedUser });
      setProfile((p) => ({ ...p, name: refreshedUser.displayName }));

      alert("Profile updated!");
    } catch (e) {
      console.error("Error:", e);
      alert("Error saving profile.");
    } finally {
      setSaving(false);
    }
  };

  // Add transaction - no longer in use on this page
  const handleAddTransaction = async () => {
    if (!user) return alert("You must be logged in.");
    const { Category, Description, amount, TransactionDate } = newTx;

    if (!Category || !Description || !amount || !TransactionDate)
      return alert("Fill all fields.");

    try {
      await addDoc(collection(db, "transactions"), {
        Category,
        Description,
        "transaction amount": parseFloat(amount) * (isIncome ? 1 : -1),
        userid: user.uid, // <-- NOTE: uses userid, not uid
        TransactionDate: Timestamp.fromDate(new Date(TransactionDate)),
        createdAt: serverTimestamp(),
      });

      setNewTx({ Category: "", Description: "", amount: "", TransactionDate: "" });

      alert("Transaction added!");
    } catch (e) {
      console.error("Add tx error:", e);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  // -------------------------------------------
  // DELETE USER DATA FROM ALL COLLECTIONS
  // -------------------------------------------
  const deleteUserDataEverywhere = async (uid) => {
    const collections = [
      "Goals",
      "expectations",
      "follows",
      "notifications",
      "transactions",
      "posts",
      "users",
    ];

    // collections may use uid OR userid -> delete both - mistake from not keeping field names consistent across firestore - potential TBD fix and normalize field names
    const uidFields = ["uid", "userid"];

    for (const col of collections) {
      for (const field of uidFields) {
        const q = query(collection(db, col), where(field, "==", uid));
        const snap = await getDocs(q);

        const deletions = snap.docs.map((d) => deleteDoc(d.ref));
        await Promise.all(deletions);

        if (snap.size > 0) {
          console.log(`Deleted ${snap.size} docs from ${col} where ${field} == uid`);
        }
      }
    }
  };

  // DELETE ACCOUNT
  const handleDeleteAccount = async () => {
    if (!user) return;
    if (confirmEmail !== user.email) return alert("Email does not match.");

    try {
      // 1. Delete Firestore docs everywhere
      await deleteUserDataEverywhere(user.uid);

      // 2. Delete user's own document (already handled above but safe)
      await deleteDoc(doc(db, "users", user.uid));


      // 3. Delete Firebase Auth account
      await deleteUser(user);

      alert("Your account and all associated data have been deleted.");
      navigate("/login");
    } catch (e) {
      console.error("Delete account error:", e);
      alert("Failed to delete account.");
    }
  };

  if (loading)
    return <p style={{ color: "#fff", textAlign: "center" }}>Loading…</p>;

  // Chart data
  const chartData = (transactions || []).map((t) => ({
    date: t.TransactionDate?.seconds
      ? new Date(t.TransactionDate.seconds * 1000).toLocaleDateString()
      : "Unknown",
    income: t["transaction amount"] > 0 ? t["transaction amount"] : 0,
    expense: t["transaction amount"] < 0 ? Math.abs(t["transaction amount"]) : 0,
  }));

  const total = (transactions || []).reduce(
    (acc, t) => acc + t["transaction amount"],
    0
  );

  return (
    <div className="page">
      <header className="header-bar">
        <Link to="/dashboard">
          <img
            src="./FundFlowLogo2.png"
            alt="Fund Flow Logo"
            className="logo"
          />
        </Link>

        <nav className="nav-links">
          <a href="/dashboard" className="nav-btn">Dashboard</a>
          <a href="/transactions" className="nav-btn">Transactions</a>
          <a href="/goals" className="nav-btn">Goals</a>
          <a href="/connections" className="nav-btn">Connections</a>
          <a href="/searchUser" className="nav-btn">Users</a>

          <button onClick={handleLogout} className="logout-small">Logout</button>
        </nav>
      </header>



      <div className="header-spacer" />

      <div className="profile-card">
        <h1 className="header">Your Profile</h1>

        {/* PROFILE IMAGE */}
        <div className="self-profile-picture-section">
          <img src={profile.picURL} alt="Profile" className="profile-avatar" />
          <button className="self-profile-primary-btn" onClick={() => navigate("/edit-picture")}>
            Add / Change Picture
          </button>
        </div>

        <br />

        <p className="subtext">
          Welcome back, <strong>{user.displayName || profile.name || "User"}</strong> 👋
        </p>

        <p>
          Joined:{" "}
          {profile?.createdAt?.seconds
            ? new Date(profile.createdAt.seconds * 1000).toLocaleString()
            : "N/A"}
        </p>

        <p>
          Last Online:{" "}
          {profile?.lastLogin?.seconds
            ? new Date(profile.lastLogin.seconds * 1000).toLocaleString()
            : "N/A"}
        </p>

        <button
          onClick={handleCopyProfileUrl}
          disabled={saving}
          className="self-profile-primary-btn"
          style={{ marginTop: "10px" }}
        >
          {saving ? "Saving…" : "Share Profile"}
        </button>


        {/* EDIT PROFILE */}
        <div className="section">
          <h2 className="section-header">Edit Profile</h2>

          <input
            name="name"
            value={profile.name || ""}
            onChange={handleChange}
            placeholder="Your name"
            className="input"
          />

          <button onClick={handleSaveProfile} disabled={saving} className="self-profile-primary-btn">
            {saving ? "Saving…" : "Save Changes"}
          </button>

          <button onClick={() => setShowDeleteModal(true)} className="self-profile-danger-btn">
            Delete Account
          </button>
        </div>

        {/* DELETE MODAL */}
        {showDeleteModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h2>Confirm Account Deletion</h2>
              <p>Type your email to confirm:</p>

              <input
                type="email"
                className="input"
                placeholder="Enter your email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
              />

              <div className="modal-buttons">
                <button
                  onClick={handleDeleteAccount}
                  className="self-profile-danger-btn"
                  disabled={!confirmEmail}
                >
                  Confirm Delete
                </button>

                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setConfirmEmail("");
                  }}
                  className="self-profile-secondary-btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NET TOTAL */}
        <div className="summary-box">
          <h3>Net Total:</h3>
          <p
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: total >= 0 ? "#00E0A1" : "#F9295F",
            }}
          >
            {total >= 0 ? "+" : "-"}${Math.abs(total).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default Profile;
