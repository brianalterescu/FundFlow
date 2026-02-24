import React, { useEffect, useState, useContext, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { TransactionContext } from "../context/TransactionContext";

// Icons
import { 
  Home, CreditCard, Target, Users, User, Heart, Trash2, Send
} from "lucide-react";

const DEFAULT_PIC = "https://i.imgur.com/1xAP7pJ.png";

export default function Social() {
  const { user } = useContext(TransactionContext);
  const [postText, setPostText] = useState("");
  const [realPosts, setRealPosts] = useState([]);
  const [dummyPosts, setDummyPosts] = useState([]);
  const [following, setFollowing] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  // 1. Fetch Following
  useEffect(() => {
    if (!user) return;

    const fetchFollowing = async () => {
      const q = query(
        collection(db, "follows"),
        where("followerID", "==", user.uid)
      );
      const snap = await getDocs(q);
      const followingIds = snap.docs.map(doc => doc.data().followedID);
      setFollowing(followingIds);
    };

    fetchFollowing();
  }, [user]);

  // 2. Fetch Real Posts from Firebase
  useEffect(() => {
    if (!user) return;

    const fetchPosts = async () => {
      try {
        let result = [];

        // Own posts
        const selfQuery = query(
          collection(db, "posts"),
          where("uid", "==", user.uid),
          orderBy("postedOn", "desc")
        );
        const selfSnap = await getDocs(selfQuery);
        selfSnap.forEach(doc => result.push({ id: doc.id, ...doc.data() }));

        // Followed posts
        if (following.length > 0) {
          const batchSize = 10;
          for (let i = 0; i < following.length; i += batchSize) {
            const batch = following.slice(i, i + batchSize);
            const followQuery = query(
              collection(db, "posts"),
              where("uid", "in", batch),
              orderBy("postedOn", "desc")
            );
            const followSnap = await getDocs(followQuery);
            followSnap.forEach(doc => result.push({ id: doc.id, ...doc.data() }));
          }
        }

        // Deduplicate
        const map = {};
        result.forEach(p => map[p.id] = p);
        result = Object.values(map);

        // Fetch Authors
        const userSnap = await getDocs(collection(db, "users"));
        const userMap = {};
        userSnap.forEach(u => userMap[u.id] = u.data());

        const final = result
          .filter(p => p.postedOn)
          .map(p => ({
            ...p,
            author: userMap[p.uid] || { name: "Unknown", picURL: DEFAULT_PIC }
          }));

        setRealPosts(final);
      } catch (e) {
        console.error("Post load failed:", e);
      }
    };
    fetchPosts();
  }, [following, user]);

  // 3. Fetch & Parse Dummy CSV Posts
  useEffect(() => {
    const loadDummyData = async () => {
      try {
        const response = await fetch("/dummy_posts.csv");
        const csvText = await response.text();
        
        // Split into lines, skipping the header row
        const lines = csvText.split('\n').filter(line => line.trim() !== '').slice(1);
        
        const parsedDummyPosts = lines.map((line, index) => {
          // Regex to split by comma, but ignore commas inside quotes
          const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
          const columns = line.split(regex);
          
          if (columns.length >= 5) {
            const firstName = columns[0];
            const lastName = columns[1];
            const picUrl = columns[2];
            const dateStr = columns[3];
            // Remove the surrounding quotes from the post content
            const content = columns.slice(4).join(',').replace(/^"|"$/g, '');
            
            // Generate some random fake likes so the feed looks active
            const randomLikeCount = Math.floor(Math.random() * 15);
            const fakeLikedBy = Array(randomLikeCount).fill("fake-user-id");

            return {
              id: `dummy-${index}`,
              uid: `dummy-author-${index}`,
              content: content,
              likedBy: fakeLikedBy,
              // Convert date string to Firebase-style timestamp format
              postedOn: { seconds: new Date(dateStr).getTime() / 1000 },
              author: {
                name: `${firstName} ${lastName}`,
                picURL: picUrl,
              },
              isDummy: true // Flag to prevent DB updates
            };
          }
          return null;
        }).filter(Boolean);

        setDummyPosts(parsedDummyPosts);
      } catch (err) {
        console.error("Failed to load dummy posts:", err);
      }
    };

    loadDummyData();
  }, []);

  // Combine and sort both real and dummy posts
  const allPosts = useMemo(() => {
    return [...realPosts, ...dummyPosts].sort((a, b) => {
      const timeA = a.postedOn?.seconds || 0;
      const timeB = b.postedOn?.seconds || 0;
      return timeB - timeA;
    });
  }, [realPosts, dummyPosts]);

  // 4. Fetch Suggested Users (Real users only)
  useEffect(() => {
    if (!user) return;
    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, "users"));
      let list = snap.docs
        .map(d => ({ uid: d.id, ...d.data() }))
        .filter(u => u.uid !== user.uid && !following.includes(u.uid));

      // Shuffle
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
      setUsersList(list.slice(0, 5));
    };
    fetchUsers();
  }, [user, following]);

  // 5. Create Post
  const handleCreatePost = async () => {
    if (!postText.trim()) return alert("Post cannot be empty");
    const newPost = {
      uid: user.uid,
      content: postText,
      likedBy: [],
      pid: crypto.randomUUID().slice(0, 8),
      postedOn: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, "posts"), newPost);

    setRealPosts((prev) => [
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

  // 6. Like
  const handleLike = async (post) => {
    const isLiked = post.likedBy.includes(user.uid);
    const updatedLikes = isLiked
      ? post.likedBy.filter((id) => id !== user.uid)
      : [...post.likedBy, user.uid];

    // If it's a dummy post, only update the local state
    if (post.isDummy) {
      setDummyPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, likedBy: updatedLikes } : p))
      );
      return;
    }

    // If it's a real post, update Firestore and local state
    const postRef = doc(db, "posts", post.id);
    await updateDoc(postRef, { likedBy: updatedLikes });
    
    setRealPosts((prev) =>
      prev.map((p) =>
        p.id === post.id ? { ...p, likedBy: updatedLikes } : p
      )
    );
  };

  // 7. Delete
  const handleDelete = async (postID) => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await deleteDoc(doc(db, "posts", postID));
      setRealPosts(prev => prev.filter(p => p.id !== postID));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  // 8. Follow/Unfollow (Real users only)
  const handleFollow = async (uid) => {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, "follows"), {
        followerID: currentUser.uid,
        followedID: uid,
        followedAt: serverTimestamp(),
      });
      setUsersList((prev) => prev.map((u) => u.uid === uid ? { ...u, isFollowing: true } : u));
    } catch (err) { console.error(err); }
  };

  const handleUnfollow = async (uid) => {
    if (!currentUser) return;
    try {
      const q = query(collection(db, "follows"), where("followerID", "==", currentUser.uid), where("followedID", "==", uid));
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, "follows", d.id))));
      setUsersList((prev) => prev.map((u) => u.uid === uid ? { ...u, isFollowing: false } : u));
    } catch (err) { console.error(err); }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-['Lexend_Deca']">

      {/* HEADER */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src="./FundFlow-Favicon.png" alt="Logo" className="h-8 w-auto" />
            <span className="text-xl font-semibold text-[#000] dark:text-white">
              <span className="text-[#06D6A0] font-bold">Fund</span>Flow
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link to="/dashboard" className="hover:text-[#06d6a0]">Dashboard</Link>
            <Link to="/transactions" className="hover:text-[#06d6a0]">Transactions</Link>
            <Link to="/goals" className="hover:text-[#06d6a0]">Goals</Link>
            <Link to="/connections" className="hover:text-[#06d6a0]">Connections</Link>
            <Link to="/users" className="hover:text-[#06d6a0]">Users</Link>
            <Link to="/profile" className="hover:text-[#06d6a0]">Profile</Link>
          </nav>
        </div>
      </header>

      <div className="h-16" />

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* FEED */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Create Post */}
          <section className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 space-y-4">
            <textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder="Share a financial milestone or tip..."
              className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-4 py-3 focus:ring-2 focus:ring-[#06d6a0] focus:border-transparent outline-none transition-all"
              rows={3}
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500 font-medium px-2">Public Feed</span>
              <button onClick={handleCreatePost} className="flex items-center gap-2 px-6 py-2 rounded-full bg-[#06d6a0] text-white font-bold hover:bg-[#05b588] transition shadow-md shadow-[#06d6a0]/20 hover:shadow-lg hover:-translate-y-0.5 active:scale-95">
                <Send size={16} /> Post
              </button>
            </div>
          </section>

          {/* Posts List */}
          <section className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold">Community Activity</h2>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-bold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Live
              </div>
            </div>

            {allPosts.length === 0 && <p className="text-gray-500 text-center py-10">No posts yet.</p>}
            
            {allPosts.map((post) => {
              const isLiked = post.likedBy.includes(user.uid);
              const postDate = new Date(post.postedOn.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

              return (
                <div key={post.id} className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex gap-4 transition-all hover:shadow-md">
                  <img src={post.author.picURL || DEFAULT_PIC} alt="avatar" className="h-12 w-12 rounded-full object-cover border border-gray-200 dark:border-gray-700 shadow-sm" />
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900 dark:text-white">{post.author.name}</h4>
                        <span className="text-xs text-gray-400 font-medium">• {postDate}</span>
                      </div>
                      {post.uid === user.uid && !post.isDummy && (
                        <button onClick={() => handleDelete(post.id)} className="text-gray-400 hover:text-red-500 transition p-1">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    
                    <p className="text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed mb-4">{post.content}</p>
                    
                    <button 
                      onClick={() => handleLike(post)} 
                      className={`flex items-center gap-1.5 text-sm transition font-medium px-3 py-1.5 rounded-full ${
                        isLiked 
                        ? "text-red-500 bg-red-50 dark:bg-red-900/20" 
                        : "text-gray-500 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      }`}
                    >
                      <Heart size={16} fill={isLiked ? "currentColor" : "none"} className={isLiked ? "scale-110 transition-transform" : ""} />
                      <span>{post.likedBy.length}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </section>
        </div>

        {/* SIDEBAR: WHO TO FOLLOW */}
        <aside className="lg:col-span-4 space-y-4 relative">
          <div className="sticky top-24">
            <h2 className="text-lg font-bold mb-4">Discover Users</h2>
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
              {usersList.length === 0 ? (
                <p className="p-6 text-sm text-gray-500 text-center">No new users to follow.</p>
              ) : (
                usersList.map((u) => (
                  <div key={u.uid} className="p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition">
                    <img src={u.picURL || DEFAULT_PIC} alt="avatar" className="h-10 w-10 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/user/${u.uid}`)}>
                      <p className="font-bold text-sm text-gray-900 dark:text-white hover:text-[#06d6a0] transition truncate">{u.name || "User"}</p>
                    </div>
                    <button
                      onClick={() => u.isFollowing ? handleUnfollow(u.uid) : handleFollow(u.uid)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition shadow-sm ${
                        u.isFollowing 
                          ? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600" 
                          : "bg-[#06d6a0] text-white hover:bg-[#05b588] hover:shadow-md hover:-translate-y-0.5"
                      }`}
                    >
                      {u.isFollowing ? "Unfollow" : "Follow"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

      </main>

      {/* MOBILE NAV */}
      <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-safe">
        <div className="grid grid-cols-5 text-[10px] font-medium">
          {[
            { label: "Dashboard", icon: Home, to: "/dashboard" },
            { label: "Transactions", icon: CreditCard, to: "/transactions" },
            { label: "Goals", icon: Target, to: "/goals" },
            { label: "Users", icon: Users, to: "/users" },
            { label: "Profile", icon: User, to: "/profile" },
          ].map(({ label, icon: Icon, to }) => (
            <Link key={label} to={to} className="flex flex-col items-center justify-center py-3 text-gray-500 hover:text-[#06d6a0] transition active:scale-95">
              <Icon className="w-5 h-5 mb-1" />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </nav>

    </div>
  );
}