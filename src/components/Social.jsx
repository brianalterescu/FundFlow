import React, { useEffect, useState, useContext, useMemo, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
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
  getDoc
} from "firebase/firestore";
import { TransactionContext } from "../context/TransactionContext";

// Icons
import { 
  Home, CreditCard, Target, Users, User, Heart, Trash2, Send, 
  LogOut, Activity, Sparkles, TrendingUp, MessageSquare, Link as LinkIcon, PieChart as PieIcon,
  Loader2
} from "lucide-react";

const DEFAULT_PIC = "https://i.imgur.com/1xAP7pJ.png";

export default function Social() {
  const { user } = useContext(TransactionContext);
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = auth.currentUser;

  // State
  const [profile, setProfile] = useState({});
  const [postText, setPostText] = useState("");
  const [realPosts, setRealPosts] = useState([]);
  const [dummyPosts, setDummyPosts] = useState([]);
  const [following, setFollowing] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Infinite Scroll State
  const [rawCsvData, setRawCsvData] = useState([]);
  const [page, setPage] = useState(1);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // 1. Fetch Profile & Following
  useEffect(() => {
    if (!user) return navigate("/login");

    const fetchUserData = async () => {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) setProfile(userDoc.data());

      const q = query(collection(db, "follows"), where("followerID", "==", user.uid));
      const snap = await getDocs(q);
      setFollowing(snap.docs.map(doc => doc.data().followedID));
    };

    fetchUserData();
  }, [user, navigate]);

  // 2. Fetch Real Posts
  useEffect(() => {
    if (!user) return;

    const fetchPosts = async () => {
      try {
        let result = [];

        // Own posts
        const selfQuery = query(collection(db, "posts"), where("uid", "==", user.uid), orderBy("postedOn", "desc"));
        const selfSnap = await getDocs(selfQuery);
        selfSnap.forEach(doc => result.push({ id: doc.id, ...doc.data() }));

        // Followed posts
        if (following.length > 0) {
          const batchSize = 10;
          for (let i = 0; i < following.length; i += batchSize) {
            const batch = following.slice(i, i + batchSize);
            const followQuery = query(collection(db, "posts"), where("uid", "in", batch), orderBy("postedOn", "desc"));
            const followSnap = await getDocs(followQuery);
            followSnap.forEach(doc => result.push({ id: doc.id, ...doc.data() }));
          }
        }

        const map = {};
        result.forEach(p => map[p.id] = p);
        result = Object.values(map);

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

  // 3. Infinite Dummy Post Generator
  const generateDummyBatch = (rawData, pageNum) => {
    const shuffledData = [...rawData].sort(() => 0.5 - Math.random());

    const newDummyPosts = shuffledData.map((data, index) => {
      const randomLikeCount = Math.floor(Math.random() * 25);
      const fakeLikedBy = Array(randomLikeCount).fill("fake-user-id");

      // Push dates further back based on the "page" number to simulate history
      const hoursAgo = Math.floor(Math.random() * 5) + (index * 2) + (pageNum * 24); 
      const postDate = new Date();
      postDate.setHours(postDate.getHours() - hoursAgo);

      return {
        id: `dummy-${data.originalIndex}-p${pageNum}-${Math.random().toString(36).substring(7)}`,
        uid: `dummy-author-${data.originalIndex}`,
        content: data.content,
        likedBy: fakeLikedBy,
        postedOn: { seconds: Math.floor(postDate.getTime() / 1000) },
        author: {
          name: `${data.firstName} ${data.lastName}`,
          picURL: data.picUrl,
        },
        isDummy: true
      };
    });

    setDummyPosts(prev => [...prev, ...newDummyPosts]);
  };

  // Initial CSV Fetch
  useEffect(() => {
    const loadDummyData = async () => {
      try {
        const response = await fetch("/dummy_posts.csv");
        const csvText = await response.text();
        const lines = csvText.split('\n').filter(line => line.trim() !== '').slice(1);
        
        const parsedRawData = lines.map((line, index) => {
          const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
          const columns = line.split(regex);
          if (columns.length >= 5) {
            return {
              firstName: columns[0],
              lastName: columns[1],
              picUrl: columns[2],
              content: columns.slice(4).join(',').replace(/^"|"$/g, ''),
              originalIndex: index
            };
          }
          return null;
        }).filter(Boolean);

        setRawCsvData(parsedRawData);
        generateDummyBatch(parsedRawData, 1); // Load page 1
      } catch (err) {
        console.error("Failed to load dummy posts:", err);
      } finally {
        setLoading(false);
      }
    };
    loadDummyData();
  }, []);

  // Infinite Scroll Handler attached to the <main> element
  const handleScroll = (e) => {
    const { scrollTop, clientHeight, scrollHeight } = e.target;
    // If user scrolls within 200px of the bottom, trigger load
    if (scrollHeight - scrollTop <= clientHeight + 200) {
      if (!isFetchingMore && rawCsvData.length > 0) {
        setIsFetchingMore(true);
        // Artificial delay so it feels like real network loading
        setTimeout(() => {
          const nextPage = page + 1;
          setPage(nextPage);
          generateDummyBatch(rawCsvData, nextPage);
          setIsFetchingMore(false);
        }, 1000);
      }
    }
  };

  // Combine and sort
  const allPosts = useMemo(() => {
    return [...realPosts, ...dummyPosts].sort((a, b) => {
      const timeA = a.postedOn?.seconds || 0;
      const timeB = b.postedOn?.seconds || 0;
      return timeB - timeA;
    });
  }, [realPosts, dummyPosts]);

  // 4. Fetch Suggested Users
  useEffect(() => {
    if (!user) return;
    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, "users"));
      let list = snap.docs
        .map(d => ({ uid: d.id, ...d.data() }))
        .filter(u => u.uid !== user.uid && !following.includes(u.uid));

      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
      setUsersList(list.slice(0, 5));
    };
    fetchUsers();
  }, [user, following]);

  // Actions
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

    setRealPosts(prev => [
      {
        id: docRef.id,
        ...newPost,
        postedOn: { seconds: Date.now() / 1000 },
        author: {
          name: user.displayName || "You",
          picURL: profile.picURL || DEFAULT_PIC,
        },
      },
      ...prev,
    ]);
    setPostText("");
  };

  const handleLike = async (post) => {
    const isLiked = post.likedBy.includes(user.uid);
    const updatedLikes = isLiked
      ? post.likedBy.filter((id) => id !== user.uid)
      : [...post.likedBy, user.uid];

    if (post.isDummy) {
      setDummyPosts(prev => prev.map(p => (p.id === post.id ? { ...p, likedBy: updatedLikes } : p)));
      return;
    }

    await updateDoc(doc(db, "posts", post.id), { likedBy: updatedLikes });
    setRealPosts(prev => prev.map(p => p.id === post.id ? { ...p, likedBy: updatedLikes } : p));
  };

  const handleDelete = async (postID) => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await deleteDoc(doc(db, "posts", postID));
      setRealPosts(prev => prev.filter(p => p.id !== postID));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleFollow = async (uid) => {
    try {
      await addDoc(collection(db, "follows"), {
        followerID: currentUser.uid,
        followedID: uid,
        followedAt: serverTimestamp(),
      });
      setUsersList(prev => prev.map(u => u.uid === uid ? { ...u, isFollowing: true } : u));
    } catch (err) { console.error(err); }
  };

  const handleUnfollow = async (uid) => {
    try {
      const q = query(collection(db, "follows"), where("followerID", "==", currentUser.uid), where("followedID", "==", uid));
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map(d => deleteDoc(doc(db, "follows", d.id))));
      setUsersList(prev => prev.map(u => u.uid === uid ? { ...u, isFollowing: false } : u));
    } catch (err) { console.error(err); }
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "Just now";
    const now = new Date();
    const postDate = new Date(timestamp.seconds * 1000);
    const diffInHours = Math.floor((now - postDate) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "Yesterday";
    return `${diffInDays}d ago`;
  };

  const NAV_LINKS = [
    { name: "Dashboard", path: "/dashboard", icon: Home },
    { name: "Transactions", path: "/transactions", icon: CreditCard },
    { name: "Budget Plan", path: "/budget", icon: PieIcon }, 
    { name: "Goals", path: "/goals", icon: Target },
    { name: "Connections", path: "/connections", icon: LinkIcon },
    { name: "Users", path: "/users", icon: Users },
    { name: "Social Feed", path: "/social", icon: MessageSquare },
    { name: "CSV Uploading", path: "/csv", icon: Activity },
    { name: "Profile", path: "/profile", icon: User },
      // { name: "Wrapped", path: "/wrapped", icon: Sparkles },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0b0f19]">
        <div className="w-8 h-8 border-4 border-[#06D6A0] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0b0f19] text-gray-900 dark:text-white font-['Lexend_Deca'] overflow-hidden dark:[color-scheme:dark]">
      
      {/* SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-full z-20 shadow-sm flex-shrink-0">
        <div className="p-6 flex items-center gap-2">
          <img src="/FundFlow-Favicon.png" alt="Logo" className="h-8 w-8" />
          <span className="text-xl font-black tracking-tight"><span className="text-[#06D6A0]">Fund</span>Flow</span>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto no-scrollbar">
          {NAV_LINKS.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link key={link.name} to={link.path} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${isActive ? "bg-[#06D6A0]/10 text-[#06D6A0]" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"}`}>
                <link.icon size={18} className={isActive ? "text-[#06D6A0]" : ""} />
                <span className="text-sm">{link.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <button onClick={() => signOut(auth).then(()=>navigate('/login'))} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 lg:px-10 z-10 sticky top-0 flex-shrink-0">
          <h1 className="text-2xl font-black tracking-tight">Social Feed</h1>
          <img src={profile?.picURL || DEFAULT_PIC} alt="Avatar" className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 object-cover shadow-sm" />
        </header>

        {/* INFINITE SCROLL MAIN CONTAINER */}
        <main onScroll={handleScroll} className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 pb-24 md:pb-8">
            
            {/* FEED COLUMN */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Create Post Card */}
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 sm:p-6">
                <div className="flex gap-4">
                  <img src={profile?.picURL || DEFAULT_PIC} alt="You" className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 object-cover hidden sm:block" />
                  <div className="flex-1 space-y-4">
                    <textarea
                      value={postText}
                      onChange={(e) => setPostText(e.target.value)}
                      placeholder="Share a financial milestone or tip..."
                      className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-4 py-3.5 focus:ring-2 focus:ring-[#06d6a0] focus:border-transparent outline-none transition-all text-sm sm:text-base font-medium"
                      rows={3}
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2">Public Post</span>
                      <button 
                        onClick={handleCreatePost} 
                        disabled={!postText.trim()}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#06d6a0] text-white font-bold hover:bg-[#05b588] transition shadow-lg shadow-[#06d6a0]/20 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                      >
                        <Send size={16} /> Post
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Status Indicator */}
              <div className="flex items-center gap-2 mb-2 px-2">
                <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Community Activity</h2>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[10px] font-black uppercase">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                  </span>
                  Live
                </div>
              </div>
              
              {/* Posts Map */}
              {allPosts.map((post) => {
                const isLiked = post.likedBy.includes(user.uid);
                return (
                  <div key={post.id} className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 sm:p-6 flex gap-4 transition-all hover:border-[#06D6A0] group">
                    <img src={post.author.picURL || DEFAULT_PIC} alt="avatar" className="h-12 w-12 rounded-full object-cover border border-gray-200 dark:border-gray-700 flex-shrink-0" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white text-base leading-none">{post.author.name}</h4>
                          <span className="text-xs font-medium text-gray-400">{getTimeAgo(post.postedOn)}</span>
                        </div>
                        {post.uid === user.uid && !post.isDummy && (
                          <button onClick={() => handleDelete(post.id)} className="text-gray-400 hover:text-red-500 transition p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      
                      <p className="text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed mb-4 break-words">
                        {post.content}
                      </p>
                      
                      <button 
                        onClick={() => handleLike(post)} 
                        className={`flex items-center gap-1.5 text-sm transition font-bold px-3 py-1.5 rounded-lg border ${
                          isLiked 
                          ? "text-red-500 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30" 
                          : "text-gray-500 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-transparent"
                        }`}
                      >
                        <Heart size={16} fill={isLiked ? "currentColor" : "none"} className={isLiked ? "scale-110 transition-transform" : ""} />
                        <span>{post.likedBy.length}</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Infinite Scroll Loader */}
              {isFetchingMore && (
                <div className="py-6 flex flex-col items-center justify-center text-gray-400 gap-3">
                  <Loader2 size={24} className="animate-spin text-[#06D6A0]" />
                  <span className="text-xs font-bold uppercase tracking-wider">Loading older posts...</span>
                </div>
              )}
            </div>

            {/* SIDEBAR: DISCOVER USERS */}
            <div className="lg:col-span-4 relative hidden lg:block">
              <div className="sticky top-6 space-y-4">
                <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">Discover Users</h2>
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/50">
                  {usersList.length === 0 ? (
                    <p className="p-8 text-sm font-medium text-gray-500 text-center">No new users to follow.</p>
                  ) : (
                    usersList.map((u) => (
                      <div key={u.uid} className="p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                        <img src={u.picURL || DEFAULT_PIC} alt="avatar" className="h-10 w-10 rounded-full object-cover border border-gray-200 dark:border-gray-700 cursor-pointer" onClick={() => navigate(`/user/${u.uid}`)} />
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/user/${u.uid}`)}>
                          <p className="font-bold text-sm text-gray-900 dark:text-white hover:text-[#06d6a0] transition truncate">{u.name || "User"}</p>
                        </div>
                        <button
                          onClick={() => u.isFollowing ? handleUnfollow(u.uid) : handleFollow(u.uid)}
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                            u.isFollowing 
                              ? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600" 
                              : "bg-[#06d6a0] text-white hover:bg-[#05b588] shadow-md shadow-[#06d6a0]/20"
                          }`}
                        >
                          {u.isFollowing ? "Unfollow" : "Follow"}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50 pb-safe">
        <div className="flex justify-around items-center px-2">
          {NAV_LINKS.slice(0, 5).map((link) => {
            const isActive = location.pathname === link.path || (link.path === '/social' && location.pathname === '/social');
            return (
              <Link key={link.name} to={link.path} className={`flex flex-col items-center justify-center py-3 px-2 transition active:scale-95 ${isActive ? "text-[#06D6A0]" : "text-gray-500 hover:text-[#06D6A0]"}`}>
                <link.icon className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-bold truncate max-w-[60px] text-center">{link.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

    </div>
  );
}