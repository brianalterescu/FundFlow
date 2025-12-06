import React, { useEffect, useState, useContext } from "react"; // Brings React Library into scope, may not be used in this specific file but is a common practice.
; import { Link } from "react-router-dom";  // Imports Link component from react-router-dom for navigation between routes in a single page application. 
import { useNavigate } from "react-router-dom";  // Allows programmatic navigation between routes.
import { auth } from "../firebaseConfig"; // Imports the Firebase authentication module from the project's configuration.
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { deleteDoc } from "firebase/firestore"; // Needed for the delete button.
import { db } from "../firebaseConfig"; // Imports the Firestore database module from the project's configuration.
import { TransactionContext } from "../context/TransactionContext";  // Imports the TransactionContext for accessing user data. // Imports the TransactionContext for accessing user data.
import "../styles/Social.css"; // Uses the specific CSS file for styling this component.

const DEFAULT_PIC = "https://i.imgur.com/1xAP7pJ.png"; // Default profile picture URL.

function Social() {
  const { user } = useContext(TransactionContext); // Accesses the current user from the TransactionContext.
  const [postText, setPostText] = useState(""); // State for the new post text input.
  const [posts, setPosts] = useState([]); // State for the list of posts in the feed.
  const [following, setFollowing] = useState([]); // State for the list of user IDs that the current user is following.
  const [usersList, setUsersList] = useState([]); // State for the list of suggested users to follow.
  const navigate = useNavigate(); // Constant to call the useNavigate() function
  const currentUser = auth.currentUser; // This sets the currentUser to the authenticated user.

  // ----------------------------
  // 1. Fetch Following (Fixed Field Names)
  //  - New useEffect to load the list of user IDs that the current user is following.
  // ----------------------------
  useEffect(() => {
    if (!user) return;

    const fetchFollowing = async () => {
      const q = query(
        collection(db, "follows"),
        where("followerID", "==", user.uid) // ✅ FIXED FIELD NAME
      );

      const snap = await getDocs(q);

      const followingIds = snap.docs.map(doc => doc.data().followedID); // ✅ FIXED FIELD NAME

      console.log("FOLLOWING:", followingIds);

      setFollowing(followingIds);
    };

    fetchFollowing();
  }, [user]);


  // ----------------------------
  // 2. Fetch Posts (Fixed Logic)
  // - Updated useEffect to load posts from self and followed users, with optimizations.
  // ----------------------------
  useEffect(() => {
    if (!user) return;

    const fetchPosts = async () => {
      try {
        let result = [];

        // Fetches your own posts
        const selfQuery = query(
          collection(db, "posts"),
          where("uid", "==", user.uid),
          orderBy("postedOn", "desc")
        );
        const selfSnap = await getDocs(selfQuery);
        selfSnap.forEach(doc => {
          result.push({ id: doc.id, ...doc.data() });
        });

        // If you follow users, fetch their posts in batches.
        if (following.length > 0) {
          const batchSize = 10;

          for (let i = 0; i < following.length; i += batchSize) {
            const batch = following.slice(i, i + batchSize);
            // Fetch posts for this batch of followed users
            const followQuery = query(
              collection(db, "posts"),
              where("uid", "in", batch),
              orderBy("postedOn", "desc")
            );

            const followSnap = await getDocs(followQuery);
            followSnap.forEach(doc => {
              result.push({ id: doc.id, ...doc.data() });
            });
          }
        }
        console.log("Loaded posts:", result); // Used for debugging


       // Handles duplicates (in case of overlapping queries)
        const map = {};
        result.forEach(p => map[p.id] = p);
        result = Object.values(map);

        // Fetch user data for authors in a single query (every read counts!)
        const userSnap = await getDocs(collection(db, "users"));
        const userMap = {};
        userSnap.forEach(u => userMap[u.id] = u.data());

        // Associates posts with author data and sorts them
        const final = result
          .filter(p => p.postedOn) // Filter out posts without postedOn timestamp.
          .map(p => ({
            ...p,
            author: userMap[p.uid] || {
              name: "Unknown",
              picURL: DEFAULT_PIC
            }
          }))
          // Sort by postedOn timestamp descending.
          .sort((a, b) => b.postedOn.seconds - a.postedOn.seconds);

        setPosts(final);

      } catch (e) {
        // Debugging error handling when loading posts.
        console.error("Post load failed:", e);
      }
    };
    // Calls the fetchPosts function to load posts.
    fetchPosts();
  }, [following, user]);

  // ----------------------------
  // 3. Fetch Users (Who To Follow)
  //  - New useEffect to load a random selection of users not already followed.
  // ----------------------------
  useEffect(() => {
    if (!user) return; // Standard coding practice to ensure the user object is available.
    // Fetches users from Firestore
    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, "users"));

      let list = snap.docs
        .map(d => ({ uid: d.id, ...d.data() }))
        .filter(u =>
          u.uid !== user.uid &&              // Recommended users won't include self
          !following.includes(u.uid)         // Only shows the user users not already followed
        );

      // For-loop to shuffle the list randomly
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }

      setUsersList(list.slice(0, 5)); // Shows only top 5 suggestions
    };
    // Fetches the users for the "Who to follow" section.
    fetchUsers();
  }, [user, following]);


  // ----------------------------
  // 4. Create Post
  // - Constant for creating a new post and updating the UI.
  // ----------------------------
  const handleCreatePost = async () => {
    // Client validation
    if (!postText.trim()) return alert("Post cannot be empty");
    // Data structure for new post
    const newPost = {
      uid: user.uid,
      content: postText,
      likedBy: [],
      pid: crypto.randomUUID().slice(0, 8),
      postedOn: serverTimestamp(),
    };
    // Writing data to Firestore under the posts collection
    const docRef = await addDoc(collection(db, "posts"), newPost);

    // Updates the UI immediately
    setPosts((prev) => [
      {
        id: docRef.id,
        ...newPost,
        postedOn: { seconds: Date.now() / 1000 },
        author: {
          name: user.displayName || "You",
          picURL: user.photoURL || DEFAULT_PIC,
        },
      },
      ...prev,
    ]);

    setPostText("");
  };

  // ----------------------------
  // 5. Like / Unlike
  // - Constant for liking or unliking a post and updating the UI.
  // ----------------------------
  const handleLike = async (post) => {
    // The specific post ID is needed in order to like/unlike.
    const postRef = doc(db, "posts", post.id);
    // Determine new likedBy array
    const updatedLikes = post.likedBy.includes(user.uid)
      ? post.likedBy.filter((id) => id !== user.uid)
      : [...post.likedBy, user.uid];
    // Update Firestore
    await updateDoc(postRef, { likedBy: updatedLikes });
    // Update UI with the amount of likes
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id ? { ...p, likedBy: updatedLikes } : p
      )
    );
  };

  // ----------------------------
  // 6. Delete Post
  // - Constant for deleting a post and updating the UI.
  // ----------------------------
  const handleDelete = async (postID) => {
    // Standard confirmation dialog before deletion.
    const confirm = window.confirm("Delete this post permanently?");
    // Exit if the user cancels.
    if (!confirm) return; 

    try {
      // Deletes the post from Firestore based on the postID.
      await deleteDoc(doc(db, "posts", postID));
      // Updates the UI immediately by removing the deleted post.
      setPosts(prev => prev.filter(p => p.id !== postID)); 

    } catch (err) {
      // Debugging error handling when deleting a post.
      console.error("Delete failed:", err);
      alert("Failed to delete post.");
    }
  };

  // ----------------------------
  // 7. Handle follows
  // - Constant for following a user and updating the UI.
  // ----------------------------
  const handleFollow = async (uid) => {
    // Can't fetch current user, returns early.
    if (!currentUser) return;

    try {
      // Follows the user by adding a document to the follows collection.
      await addDoc(collection(db, "follows"), {
        followerID: currentUser.uid,
        followedID: uid,
        followedAt: serverTimestamp(),
      });

      // Update UI immediately without refreshing the page
      setUsersList((prev) =>
        prev.map((u) =>
          u.uid === uid ? { ...u, isFollowing: true } : u
        )
      );
    } catch (err) {
      // Debugging error handling when following a user.
      console.error("Error following user:", err);
    }
  };

  // ----------------------------
  // 8. Handle unfollows
  // 
  // ----------------------------
  const handleUnfollow = async (uid) => {
    if (!currentUser) return;

    try {
      const q = query(
        collection(db, "follows"),
        where("followerID", "==", currentUser.uid),
        where("followedID", "==", uid)
      );

      const snap = await getDocs(q);

      await Promise.all(
        snap.docs.map((d) => deleteDoc(doc(db, "follows", d.id)))
      );

      // Update UI instantly
      setUsersList((prev) =>
        prev.map((u) =>
          u.uid === uid ? { ...u, isFollowing: false } : u
        )
      );
    } catch (err) {
      console.error("Error unfollowing user:", err);
    }
  };


  return (
    <div className="social-container">
      {/* Navbar */}
{/* Standard navigation to access other JSX files */}
      <header className="navbar">
        <Link  to="/dashboard">
          <img src="./FundFlowLogo2.png" alt="Fund Flow" className="logo" />
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

      <div className="social-main">
        {/* Create Post */}
        <div className="social-create-post">
          <textarea
            className="social-post-input"
            placeholder="What's on your mind?"
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
          />
          <button className="social-post-btn" onClick={handleCreatePost}>
            Post
          </button>
        </div>

        {/* Feed */}
        <div className="social-feed">
          <h2 className="social-section-title">Feed</h2>

          {posts.length === 0 && (
            <p className="social-empty">No posts yet.</p>
          )}

          {posts.map((post) => (
            <div key={post.id} className="social-post">
              <img
                src={post.author.picURL || DEFAULT_PIC}
                className="social-avatar"
                alt="pfp"
              />
              <div className="social-post-content">
                <h4 className="social-post-author">{post.author.name}</h4>
                <p>{post.content}</p>
                <button
                  className="social-like-btn"
                  onClick={() => handleLike(post)}
                >
                  ❤️ {post.likedBy.length}
                </button>

                {post.uid === user.uid && (
                  <button
                    className="social-delete-btn"
                    onClick={() => handleDelete(post.id)}
                    title="Delete Post"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Who To Follow */}
        <div className="social-follow-suggestions">
          <h2 className="social-section-title">Who to follow</h2>

          {usersList.map((u) => {
            if (u.uid === currentUser?.uid) return null; // prevent self-follow

            return (
              <div key={u.uid} className="social-user-card">

                {/* Profile Picture shows up with post */}
                <img
                  src={u.picURL || DEFAULT_PIC}
                  className="social-avatar-sm"
                  alt="pfp"
                />

                {/* Name is clickable to view profile */}
                <h4
                  className="social-user-name"
                  onClick={() => navigate(`/user/${u.uid}`)}
                  title="View Profile"
                >
                  {u.name || "Unnamed User"}
                </h4>

                {/* Follow Button unless they're blocked*/}
                {currentUser && !u.isBlocked && u.uid !== currentUser.uid && (
                  <button
                    onClick={() => (u.isFollowing ? handleUnfollow(u.uid) : handleFollow(u.uid))}
                    className={u.isFollowing ? "unfollow-btn" : "follow-btn"}
                  >
                    {u.isFollowing ? "Unfollow" : "Follow"}
                  </button>
                )}

              </div>
            );
          })}
        </div>



      </div>
    </div>
  );
}

export default Social;
