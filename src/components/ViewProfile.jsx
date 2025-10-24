import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
} from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import "../styles/ViewProfile.css";

export default function ViewProfile() {
  const { uid } = useParams(); // UID of the profile being viewed
  const navigate = useNavigate();

  const [userData, setUserData] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null); // we'll set this when auth initializes

  // Redirect to login if not authenticated
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

  useEffect(() => { 
    const loadUserProfile = async () => {
      try {
        // No matching UID? Go back to search page
        if (!uid) {
          navigate("/search");
          return;
        }

        // Ensure someone is signed in
        if (!currentUser) {
          console.warn("Waiting for auth state...");
          return;
        }

        //Check if either user has blocked the other - if so do not load profile
        const blocksRef = collection(db, "blocks");
        const q = query( //creates query logic q
          blocksRef,
          where("blockerId", "in", [currentUser.uid, uid]),
          where("blockedId", "in", [currentUser.uid, uid])
        );

        const snapshot = await getDocs(q); //checks the blocks collection for any matching block relationships
        if (!snapshot.empty) { //if snapshot is not empty, then a block relationship exists, set isBlocked to true, setLoading to false
          setIsBlocked(true);
          setLoading(false);
          return;
        }

        //Load user profile info
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data()); //sets userdata from the firestore if found
        } else {
          console.warn("User not found in Firestore"); //Not found message
          setUserData(null);
        }
      } catch (err) {
        console.error("Error loading user profile:", err); //generic loading error message, general catch
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [uid, navigate, currentUser]);

  //Block user
  const handleBlock = async () => {
    try {
      if (!currentUser) return;
      // Check if a block already exists between these two users
      const q = query(
        collection(db, "blocks"),
        where("blockerId", "==", currentUser.uid),
        where("blockedId", "==", uid)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) { //if there is a block relationship already, don't create a new one
        console.log("Block relationship already exists — skipping duplicate.");
        return;
      }

      // If no existing block, create one
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

  //Unblock user
  const handleUnblock = async () => {
    try {
      if (!currentUser) return; //search blocks collection for block relationship documents matching the two users
      const q = query(
        collection(db, "blocks"),
        where("blockerId", "==", currentUser.uid),
        where("blockedId", "==", uid)
      );
      const snapshot = await getDocs(q);
      snapshot.forEach(async (docSnap) => { //for any matching block documents found, delete them
        await deleteDoc(docSnap.ref);
      });
      setIsBlocked(false); //setIsBlocked flag sets to false
    } catch (err) {
      console.error("Error unblocking user:", err);
    }
  };

  //Loading state
  if (loading) return <p>Loading profile...</p>;

  //if isBlocked is true, show generic "cannot view profile" message with option to unblock- only if the viewing user created the block - nevermind, Blocked user sees it too, but they can't unblock themselves. Not sure how to fix.
  if (isBlocked)
    return (
      <div className="blocked-container">
        <p>You cannot view this profile.</p>
        {/* Only show Unblock button if current user initiated the block */}
        <button onClick={handleUnblock} className="unblock-btn">
          Unblock User
        </button>
      </div>
    );

  if (!userData) return <p>User not found.</p>; // No user data found message, auth listener required to avoid this being the only state this page could reach.

  // Normal view - works when user is logged in, and there is not a block relationship existing between the two users. Need to update the profile pic stuff to work with custom pictures once that's built.
  return (
    <div className="view-profile-page">
      <div className="view-profile-card">
        <img
                src={userData.picURL} // uses Firestore picURL field
                alt={`${userData.name || "User"}'s picture`}
                className="user-picture"
        />

        <h2>{userData.name}</h2>
        <p>Joined: {new Date(userData.createdAt.seconds * 1000).toLocaleString()} </p>
        <p>Last Online: {new Date(userData.lastLogin.seconds * 1000).toLocaleString()}</p>

        <button
          onClick={isBlocked ? handleUnblock : handleBlock}
          className={isBlocked ? "unblock-btn" : "block-btn"}
        >
          {isBlocked ? "Unblock" : "Block User"} 
        </button>
      </div>
    </div>
  );
}
