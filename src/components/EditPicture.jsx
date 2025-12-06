import { useState, useEffect } from "react";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import "../styles/Profile.css";

function EditPicture() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [inputURL, setInputURL] = useState("");   // tracks input box value
  const [previewURL, setPreviewURL] = useState(""); // tracks image preview separately
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load user data on mount and initialize input + preview
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const docSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (docSnap.exists()) {
          const url = docSnap.data().picURL || "";
          setInputURL(url);    // populate input box
          setPreviewURL(url);  // set initial image preview
        }
      } else {
        navigate("/login"); // redirect to login if not logged in
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  if (loading) return <div>Loading...</div>; // show while data is loading

  // Save input URL to Firestore and update preview
  const handleSave = async () => {
    if (!inputURL.match(/\.(jpeg|jpg|gif|png|webp)$/i))
      return alert("Please enter a valid image URL ending in .jpg, .png, etc.");
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { picURL: inputURL });
      setPreviewURL(inputURL); // update preview after save
      alert("Profile picture updated!");
      navigate("/profile");
    } catch (error) {
      console.error("Error saving picture URL:", error);
      alert("Error saving picture URL — check console for details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <header className="header-bar">
        <div className="logo"> FundFlow</div>
        <nav className="nav-links">
          <Link to="/" className="nav-links">Home</Link>
          <Link to="/dashboard" className="nav-links">Dashboard</Link>
          <Link to="/profile" className="nav-links">Profile</Link>
        </nav>
      </header>

      <div className="header-spacer" />

      <div className="profile-card">
        <h1 className="header">Edit Profile Picture</h1>

        {/* Image preview uses separate state to avoid flicker while typing */}
        <img
          src={previewURL || "/default-avatar.png"}  
          alt="preview"
          className="profile-avatar"
          onError={(e) => (e.target.src = "/default-avatar.png")}
        />

        {/* Input box for new URL */}
        <input
          type="text"
          value={inputURL}                
          onChange={(e) => setInputURL(e.target.value)}
          placeholder="Paste image URL (e.g. https://...)"
          className="input"
        />

        {/* Preview button updates only the preview, not Firestore */}
        <button
          type="button"
          onClick={() => setPreviewURL(inputURL)}  
          className="secondary-btn"
        >
          Preview
        </button>

        {/* Save button writes to Firestore and updates preview */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="primary-btn"
        >
          {saving ? "Saving..." : "Save Picture"}
        </button>

        <button
          onClick={() => navigate("/profile")}
          className="secondary-btn"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default EditPicture;
