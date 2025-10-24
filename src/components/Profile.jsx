import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useContext } from "react";
import { TransactionContext } from "../context/TransactionContext";
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
  updateDoc,
} from "firebase/firestore";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import "../styles/Profile.css";
import { updateProfile } from "firebase/auth"; 
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"; //was going to be used for storing profile pictures in firebase storage, too costly in $$$ so for now just using URL links

// Toggle state for adding transactions 

function Profile() {
  const navigate = useNavigate();
  const [isIncome, setIsIncome] = useState(true); 
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({});
  const { transactions, setTransactions } = useContext(TransactionContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // const [uploading, setUploading] = useState(false); //was part of the upload picture function no longer needed
  const [newTx, setNewTx] = useState({
    // Necessary fields for transactions
    Category: "",
    Description: "",
    amount: "",
    TransactionDate: "",
  });

  // Handles user authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await loadUserData(currentUser);
      } else {
        // If no user is detected, redirect to the Login page.
        navigate("/login");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  // Load user data and transactions
  const loadUserData = async (currentUser) => {
    try {
      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();

        // some stuff I was trying to prevent the flicker of no profile pic showing on profile page load, did not work.
        if (!data.picURL || typeof data.picURL !== "string" || data.picURL.trim() === "") {
          data.picURL = null;
        }

        setProfile(data);
        console.log("Signed in UID:", currentUser.uid);
      } else {
        // If no matching user data is able to be retrieved, it is created.
        await setDoc(userRef, {
          email: currentUser.email,
          uid: currentUser.uid,
          name: currentUser.displayName || "",
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        });
      }

      // await loadTransactions(currentUser.uid);
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };


  //handlers
  const handleChange = (e) =>
    setProfile({ ...profile, [e.target.name]: e.target.value });

  //   const handlePictureUpload = async (e) => { tried doing an upload function to firestore, requires a blaz plan for storage. Commenting out in case we decide to use a blaze plan down the line.

  //   const file = e.target.files[0];
  //   if (!file || !user?.uid) return;

  //   try {
  //     const storage = getStorage(); //initialize firebase storage
  //     const picRef = ref(storage, `Pics/${user.uid}.jpg`); //saves picture destination as Pics/UID.jpg

  //     // Upload to Firebase Storage
  //     await uploadBytes(picRef, file); //sets destination and file to upload
  //     const downloadURL = await getDownloadURL(picRef); //gets download URL for the file for presentation

  //     // Save to Firestore
  //     await updateDoc(doc(db, "users", user.uid), { picURL: downloadURL }); //sets the URL to the user document in firestore

  //     // Updates Profile so profile updates in real-time when you upload the picture
  //     setProfile((prev) => ({ ...prev, picURL: downloadURL }));

  //     console.log("Profile Picture uploaded!");
  //   } catch (error) {
  //     console.error("Error uploading picture:", error);
  //   }
  // };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);

    try {
      await setDoc(
        doc(db, "users", user.uid),
        { name: profile.name, updatedAt: serverTimestamp() },
        { merge: true }
      );

      // TBD - Will utilize for updating url.
      await updateProfile(user, { displayName: profile.name });

      await user.reload(); //try to force refresh so the new name shows, not always working rn
      const refreshedUser = auth.currentUser;
      setUser({ ...refreshedUser }); //sets the user info for the page to the refreshedUser information we just set
      setProfile((prev) => ({ ...prev, name: refreshedUser.displayName }));

      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Error saving profile — check console for details.");
    } finally {
      setSaving(false);
    }
  };

  const handleTxChange = (e) =>
    setNewTx({ ...newTx, [e.target.name]: e.target.value });

  const handleAddTransaction = async () => {
    // If no user is detected, have the user log in.
    if (!user) return alert("You must be logged in.");
    const { Category, Description, amount, TransactionDate } = newTx;

    // If any fields are null, an alert is shown to the user.
    if (!Category || !Description || !amount || !TransactionDate)
      return alert("Please fill in all fields.");

    try {
      await addDoc(collection(db, "transactions"), {
        Category,
        Description,
        "transaction amount": parseFloat(amount) * (isIncome ? 1 : -1),
        userid: user.uid,
        TransactionDate: Timestamp.fromDate(new Date(TransactionDate)),
        createdAt: serverTimestamp(),
      });

      // Creates the new transaction based on the new data.
      setNewTx({ Category: "", Description: "", amount: "", TransactionDate: "" });
      // All transactions based on the uid (primary key) are loaded.
      await loadTransactions(user.uid);
      alert("Transaction added successfully!");
    } catch (error) {
      console.error("Error adding transaction:", error);
    }
  };


  // Returns user to login page after signing them out.
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  // rechart data positive transactions are income, negative are expenses
  const chartData = transactions.map((t) => ({
    date: t.TransactionDate?.seconds
      ? new Date(t.TransactionDate.seconds * 1000).toLocaleDateString() //fixes issue where firebase datestring was not cooperating with rechart formatting by converting to a different type of date string
      : "Unknown",
    income: t["transaction amount"] > 0 ? t["transaction amount"] : 0, //income is defined as transactions with a positive value 
    expense: t["transaction amount"] < 0 ? Math.abs(t["transaction amount"]) : 0, //expenses are transactions with a negative value
  }));

  const total = transactions.reduce(
    (acc, t) => acc + t["transaction amount"],
    0
  );

  // Displays loading message to user.
  // TBD - Add loading icon here.
  if (loading) return <p style={{ color: "#fff", textAlign: "center" }}>Loading...</p>;

  return (
    <div className="page">
      {/* Standard Header Bar at the top of the page */}
      <header className="header-bar">
        <div className="logo"> FundFlow</div>
        <nav className="nav-links">
          <Link to="/" className="nav-btn">Home</Link>
          <Link to="/dashboard" className="nav-btn">Dashboard</Link>
          <Link to="/profile" className="nav-btn" style={{ color: "#00E0A1" }}>Profile</Link>
          <button onClick={handleLogout} className="logout-small">Logout</button>
        </nav>
      </header>

      <div className="header-spacer" />

      {/* MAIN CARD */}
      <div className="profile-card">
        <h1 className="header">Your Profile</h1>
        
        {/* Profile Picture Section */}
        <div className="profile-picture-section"> 
          <img
            src={profile?.picURL} //pulls the profile picture URL from firestore, workaround for fixing the flickering was to set a default picURL in signup if none exists, and to move updating the picture to a separate page
            alt="Profile"
            className="profile-avatar"
          />

          {/* Navigate to picture edit page */}
          <button
            className="primary-btn"
            onClick={() => navigate("/edit-picture")} //send you to the picture edit page
          >
            Add / Change Picture
          </button>
        </div>
        <br />

        <p className="subtext">
          Welcome back, <strong>{user.displayName || profile.name || "User"}</strong> 👋
        </p>

        {/* TBD - Will resolve */}
        <p>Joined: {new Date(profile.createdAt.seconds * 1000).toLocaleString()} </p>
        <p>Last Online: {new Date(profile.lastLogin.seconds * 1000).toLocaleString()}</p>


        {/* NAME CHANGER */}
        <div className="section">
          <h2 className="section-header">Edit Profile</h2>
          <p2 className="subtext">Change your display name below:</p2>
          <input
            name="name"
            value={profile.name || ""}
            onChange={handleChange}
            placeholder="Your name"
            className="input"
          />
          <button onClick={handleSaveProfile} disabled={saving} className="primary-btn">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {/* Section for adding a transaction.*/}
       
        <div className="summary-box">
          <h3>Net Total:</h3>
          <p
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: total >= 0 ? "#00E0A1" : "#EF4444",
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
