// src/components/ViewProfile.jsx
import { useEffect, useState } from "react"; // React imports
import { useParams, useNavigate, Link } from "react-router-dom"; // Router imports for navigation and params

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore"; // Firebase imports
import { db, auth } from "../firebaseConfig"; // Firebase config import
import { onAuthStateChanged } from "firebase/auth"; // Firebase auth listener
import "../styles/ViewProfile.css"; // Stylesheet for ViewProfile component

export default function ViewProfile() {
  const { uid } = useParams(); // UID of the profile being viewed
  const navigate = useNavigate(); // constant to call useNavigate()

  const [userData, setUserData] = useState(null); // Profile user data
  const [currentUser, setCurrentUser] = useState(null); // Currently logged-in user
  const [loading, setLoading] = useState(true); // Loading state
  const [isBlocked, setIsBlocked] = useState(false); // Block status
  const [isFollowing, setIsFollowing] = useState(false); // Follow status
  const [followersCount, setFollowersCount] = useState(0); // Number of followers
  const [followingCount, setFollowingCount] = useState(0); // Number of following
  // TBD - Show Anonymous if name is null or undefined

  // --------------------
  // Auth Listener

  // --------------------

  // Auth listener which Redirects to login if not authenticated
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        console.warn("No user signed in — redirecting to login.");
        navigate("/login");
      } else {
        setCurrentUser(user);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Load profile + block/follow status
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!uid) return navigate("/search");
      if (!currentUser) return;

      try {
        // Check block relationship if either user has blocked the other - do not load profile
        const blocksRef = collection(db, "blocks");
        const qBlocks = query( //creates query logic qBlocks
          blocksRef,
          where("blockerId", "in", [currentUser.uid, uid]),
          where("blockedId", "in", [currentUser.uid, uid])
        );
        const blockSnap = await getDocs(qBlocks);
        setIsBlocked(!blockSnap.empty);

        // Load user profile info
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setUserData(docSnap.data());
        else setUserData(null);

        // Check follow status (only if not blocked)
        if (!blockSnap.empty) return;
        const followsRef = collection(db, "follows");
        const qFollow = query(
          followsRef,
          where("followerID", "==", currentUser.uid),
          where("followedID", "==", uid)
        );
        const followSnap = await getDocs(qFollow);
        setIsFollowing(!followSnap.empty);
        if (currentUser.name === null || currentUser.name === undefined) {
          console.log("Current user name is null or undefined");
          const currentUserName = "Anonymous";
          currentUser.name= currentUserName;
        }


      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [uid, currentUser, navigate]);


  // --------------------
  // Fetch Followers & Following
  // --------------------

//Chris - TBD - I don't think these get used anywhere on this page, can these be removed?
  const fetchFollowCounts = async (uid) => {
    try {
      // Count followers (who follows this user)
      const followersQuery = query(
        collection(db, "follows"),
        where("followedID", "==", uid)
      );
      const followersSnap = await getDocs(followersQuery);
      setFollowersCount(followersSnap.size);

      // Count following (who this user follows)
      const followingQuery = query(
        collection(db, "follows"),
        where("followerID", "==", uid)
      );
      const followingSnap = await getDocs(followingQuery);
      setFollowingCount(followingSnap.size);
    } catch (err) {
      console.error("Error fetching follow counts:", err);
    }
  };




  // Follow / Unfollow handlers
  const handleFollow = async () => {
    if (!currentUser || isBlocked) return;
    try {
      const q = query(
        collection(db, "follows"),
        where("followerID", "==", currentUser.uid),
        where("followedID", "==", uid)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) return;

      await addDoc(collection(db, "follows"), {
        followerID: currentUser.uid,
        followedID: uid,
        followedAt: serverTimestamp(),
      });
      setIsFollowing(true);
    } catch (err) {
      console.error("Error following user:", err);
    }
  };

  const handleUnfollow = async () => {
    if (!currentUser) return;
    try {
      const q = query(
        collection(db, "follows"),
        where("followerID", "==", currentUser.uid),
        where("followedID", "==", uid)
      );
      const snapshot = await getDocs(q);
      snapshot.forEach(async (docSnap) => await deleteDoc(docSnap.ref));
      setIsFollowing(false);
    } catch (err) {
      console.error("Error unfollowing user:", err);
    }
  };

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

  const handleUnblock = async () => {
    if (!currentUser) return;
    try {
      const q = query(
        collection(db, "blocks"),
        where("blockerId", "==", currentUser.uid),
        where("blockedId", "==", uid)
      );
      const snapshot = await getDocs(q);
      snapshot.forEach(async (docSnap) => await deleteDoc(docSnap.ref));
      setIsBlocked(false);
    } catch (err) {
      console.error("Error unblocking user:", err);
    }
  };

  if (loading) return <p>Loading profile...</p>;
  if (!userData) return <p>User not found.</p>;

  return (



    <div className="view-profile-page">
      <header className="navbar">
        <Link to="/dashboard">
          <img
            src="/FundFlowLogo2.png"
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
          <a href="/profile" className="nav-btn">Profile</a>
        </nav>
      </header>


      <div className="view-profile-card">
        <img
          src={userData.picURL}
          alt={`${userData.name || "User"}'s picture`}
          className="user-picture"
        />
       
        <h2>{userData.name}</h2>
        <p>Joined: {new Date(userData.createdAt.seconds * 1000).toLocaleString()}</p>
        <p>Last Online: {new Date(userData.lastLogin.seconds * 1000).toLocaleString()}</p>

        {/* Follow button */}
        {!isBlocked && (
          <button
            onClick={isFollowing ? handleUnfollow : handleFollow}
            className={isFollowing ? "unfollow-btn" : "follow-btn"}
          >
            {isFollowing ? "Unfollow" : "Follow"}
          </button>
        )}

        {/* Block button */}
        <button
          onClick={isBlocked ? handleUnblock : handleBlock}
          className={isBlocked ? "unblock-btn" : "block-btn"}
        >
          {isBlocked ? "Unblock" : "Block User"}
        </button>

        {isBlocked && <p className="blocked-note">You cannot view this profile while blocked.</p>} 
      </div>
    </div>
  );
}
