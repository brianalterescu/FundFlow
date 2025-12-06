import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import "../styles/Followers.css";
import "../styles/Profile.css";


export default function Followers() {
  const [currentUser, setCurrentUser] = useState(null);
  const [mode, setMode] = useState("followers"); //set default state to followers 
  const [people, setPeople] = useState([]); //array for the list of people
  const [loading, setLoading] = useState(true); //for loading state
  const [error, setError] = useState(""); //for error catching
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) navigate("/login");
      else setCurrentUser(u);
    });
    return () => unsub();
  }, [navigate]);

  useEffect(() => {
    if (!currentUser) return;

    const loadPeople = async () => {
      setLoading(true);
      setError("");

      try {
        const followsRef = collection(db, "follows");
        let q =
          mode === "followers" //for followers mode, query value is set to where you're the followed ID, for following mode, where you're the follower
            ? query(followsRef, where("followedID", "==", currentUser.uid))
            : query(followsRef, where("followerID", "==", currentUser.uid));

        const snap = await getDocs(q);
        const otherIdField =
          mode === "followers" ? "followerID" : "followedID"; //sets modes

        const items = await Promise.all(
          snap.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const otherUserId = data[otherIdField]; //set otherIdField based on current mode for the query

            let userData = null;
            const userDoc = await getDoc(doc(db, "users", otherUserId));
            if (userDoc.exists()) userData = userDoc.data(); //sets userData for each follow relationship found

            return {
              id: docSnap.id,
              otherUserId,
              user: userData,
            };
          })
        );

        setPeople(items);
      } catch (e) {
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };

    loadPeople();
  }, [currentUser, mode]);

  
    // Block / Unblock handlers
    const handleBlock = async () => {
      if (!currentUser) return;
      try {
        // Remove any follow relationships between these two users
        const followsRef = collection(db, "follows");
        const qFollows = query(
          followsRef,
          where("followerID", "in", [currentUser.uid, uid]),
          where("followedID", "in", [currentUser.uid, uid])
        );
        const followSnap = await getDocs(qFollows);
        followSnap.forEach(async (docSnap) => await deleteDoc(docSnap.ref));
        setIsFollowing(false);
  
        // Create block
        const q = query(
          collection(db, "blocks"),
          where("blockerId", "==", currentUser.uid),
          where("blockedId", "==", uid)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) return;
  
        await addDoc(collection(db, "blocks"), {
          blockerId: currentUser.uid,
          blockedId: uid,
          blockedAt: serverTimestamp(),
        });
        setIsBlocked(true);
  
      } catch (err) {
        console.error("Error blocking user:", err);
      }
    };
  const displayName = (u) =>
    u?.name || u?.displayName || "Unknown User";

  return (

    
    
    
    <div className="page-container">
      <header className="header-bar">
    <div className="logo"> <img src="./FundFlowLogo2.png" href="/" width={"100%rem"} height={"100%em"}></img></div>
        <nav className="nav-links">
          <Link to="/dashboard" className="nav-btn">Dashboard</Link>
          <Link to="/transactions" className="nav-btn">Transactions</Link>
          <Link to="/goals" className="nav-btn">Goals</Link>
          <Link to="/searchUser" className="nav-btn">Social</Link> 
          <Link to="/connections" className="nav-btn">Connections</Link>
          <Link to="/profile" className="nav-btn">Profile</Link>
        </nav>
      </header>

       <div className="header-spacer" />

      <div className="followers-page"> 
        <header className="followers-header">
          <h1>Connections</h1>
          <div className="followers-toggle"> {/* Lets you switch between views for followers, following, and blocked users */}
            <button
              className={mode === "followers" ? "active" : ""} 
              onClick={() => setMode("followers")}
            >
              Followers
            </button>
            <button
              className={mode === "following" ? "active" : ""}
              onClick={() => setMode("following")}
            >
              Following
            </button>

              <button
              className={mode === "blocked" ? "active" : ""} 
              onClick={() => setMode("blocked")}
            >
              Blocked
            </button>
          </div>
        </header>

        {loading && <p>Loading...</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && (
          <ul className="followers-list"> {/*for empty lists */}
            {people.length === 0 && (
              <li className="empty">
                {mode === "followers"
                  ? "No one is following you yet."
                  : "You're not following anyone yet."}
              </li>
            )}

            {people.map((item) => (
              <li key={item.id} className="followers-item">
                <div className="followers-main">
                  <span className="followers-name">
                    {displayName(item.user)}
                  </span>

                  {item.user?.email && (
                    <span className="followers-email">
                      {item.user.email}
                    </span>
                  )}
                </div>

                <Link
                  to={`/user/${item.otherUserId}`}
                  className="view-profile-link"
                >
                  View Profile
                </Link>
                  
                <Link
                  to={`/user/${item.otherUserId}`}
                  className="connections-block-btn"
                >
                  Block
                </Link>
              </li>
            ))}
          </ul>
        )}

        
      </div>

      
    </div>
  );
}
