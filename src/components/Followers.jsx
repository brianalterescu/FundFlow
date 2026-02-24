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
// import "../styles/Followers.css";
// import "../styles/Profile.css";


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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">

      {/* HEADER */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img
              src="./FundFlow-Favicon.png"
              alt="FundFlow Logo"
              className="h-8 w-auto"
            />
            <span className="text-xl font-semibold text-[#000]">
              <span className="text-[#06D6A0] font-bold">Fund</span>Flow
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link to="/dashboard" className="hover:text-[#06d6a0]">Dashboard</Link>
            <Link to="/transactions" className="hover:text-[#06d6a0]">Transactions</Link>
            <Link to="/goals" className="hover:text-[#06d6a0]">Goals</Link>
            <Link to="/users" className="hover:text-[#06d6a0]">Social</Link>
            <Link to="/profile" className="hover:text-[#06d6a0]">Profile</Link>
          </nav>
        </div>
      </header>

      {/* HEADER SPACER */}
      <div className="h-16" />

      {/* MAIN CONTENT */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold">Connections</h1>

          {/* TOGGLE */}
          <div className="flex rounded-lg bg-gray-200 dark:bg-gray-700 p-1 text-sm">
            {["followers", "following"].map((key) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                className={`px-4 py-2 rounded-md transition font-medium
              ${mode === key
                    ? "bg-white dark:bg-gray-900 text-[#06d6a0] shadow"
                    : "text-gray-600 dark:text-gray-300 hover:text-[#06d6a0]"
                  }`}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* STATES */}
        {loading && (
          <p className="text-center text-gray-500">Loading...</p>
        )}

        {error && (
          <p className="text-center text-red-500">{error}</p>
        )}

        {/* LIST */}
        {!loading && !error && (
          <ul className="bg-white dark:bg-gray-800 rounded-2xl shadow divide-y divide-gray-200 dark:divide-gray-700">

            {people.length === 0 && (
              <li className="p-6 text-center text-gray-500">
                {mode === "followers"
                  ? "No one is following you yet."
                  : mode === "following"
                    ? "You're not following anyone yet."
                    : "You haven’t blocked anyone."}
              </li>
            )}

            {people.map((item) => (
              <li
                key={item.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                {/* USER INFO */}
                <div>
                  <p className="font-semibold">
                    {displayName(item.user)}
                  </p>

                  {item.user?.email && (
                    <p className="text-sm text-gray-500">
                      {/* {item.user.email} */}
                    </p>
                  )}
                </div>

                {/* ACTIONS */}
                <div className="flex gap-3 text-sm">
                  <Link
                    to={`/user/${item.otherUserId}`}
                    className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                  >
                    View Profile
                  </Link>

                  {mode !== "blocked" && (
                    <button
                      className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
                    >
                      Block
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div className="grid grid-cols-5 text-xs">
          {[
            { label: "Dashboard", icon: "🏠", to: "/dashboard" },
            { label: "Tx", icon: "💸", to: "/transactions" },
            { label: "Goals", icon: "🎯", to: "/goals" },
            { label: "Social", icon: "👥", to: "/users" },
            { label: "Profile", icon: "👤", to: "/profile" },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center justify-center py-2 text-gray-600 dark:text-gray-300 hover:text-[#06d6a0]"
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

    </div>

  );
}
