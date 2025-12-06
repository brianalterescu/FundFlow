import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import { Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import "../styles/SearchUsers.css";
import "../styles/Profile.css"; // reuse header + shared styles

function SearchUsers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) navigate("/login");
      else setCurrentUser(u);
    });
    return () => unsub();
  }, [navigate]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    setLoading(true);
    setError("");
    setResults([]);

    try {
      const term = searchTerm.trim();
      const usersRef = collection(db, "users");

      // Query users by email - case sensitive due to firestore limitations - potential workaround is a lowercase field for emails, but could eat up more writes
      const qUsers = query(
        usersRef,
        where("email", ">=", term),
        where("email", "<=", term + "\uf8ff")
      );
      const userSnap = await getDocs(qUsers);
      const foundUsers = userSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Hide only users who have blocked me - lets you find users even if YOU blocked THEM so you can unblock them if you change your mind. Initially hid blocked users as well but this is more user friendly.
      const blocksRef = collection(db, "blocks");
      const blockedMeSnap = await getDocs(
        query(blocksRef, where("blockedId", "==", currentUser.uid))
      );
      const blockedByIds = new Set(blockedMeSnap.docs.map((d) => d.data().blockerId));

      const visible = foundUsers.filter(
        (u) => u.id !== currentUser.uid && !blockedByIds.has(u.id)
      );

      if (visible.length === 0) setError("No users found.");
      else setResults(visible);
    } catch (err) {
      console.error(err);
      setError("Error searching for users.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div className="page">
      {/* Header */}
      <header className="header-bar">
            <Link to="/dashboard">
          <img
            src="./FundFlowLogo2.png"
            alt="Fund Flow Logo"
            className="logo"
          />
        </Link>
        <nav className="nav-links">
          <a href="/dashboard">Dashboard</a>
          <a href="/transactions">Transactions</a>
          <a href="/goals">Goals</a>
         <a href="/connections">Connections</a>
          <a href="/searchUser">Users</a>
           <a href="/social">Social</a>

              <a href="/profile">Profile</a>
            
          <button onClick={handleLogout} className="logout-small">Logout</button>
        </nav>
      </header>

      <div className="header-spacer" />

      <div className="search-container">
        <h1 className="profile-search-header">Profile Search</h1>
        <h3>Enter Email Address (Case Sensitive)</h3>

        <form onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Enter user email"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {error && <p className="error">{error}</p>}

        <ul className="results-list">
          {results.map((user) => (
            <li key={user.id} className="user-item">
              <div className="user-info">
                <img
                  src={user.picURL}
                  alt={user.name || user.email}
                  className="avatar"
                />
                <div>
                  <p><strong>{user.name || "Unnamed User"}</strong></p>
                  <p>{user.email}</p>
                </div>
              </div>
              <Link to={`/user/${user.id}`} className="view-btn">
                View Profile
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default SearchUsers;
