import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import { Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";

// Icons
import { 
  Home, CreditCard, Target, Users, User, ChevronLeft, Menu, Search
} from "lucide-react";
import { HiX } from "react-icons/hi";

function SearchUsers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();
  
  // Sidebar & Mobile Menu State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

      // Query users by email (Case sensitive workaround)
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

      // Hide users who have blocked me
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

  const NAV_LINKS = [ "Dashboard", "Transactions", "Budget", "Goals", "Connections", "Users", "Social", "Profile", "Wrapped" ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-['Lexend_Deca'] transition-colors duration-200">

      {/* ───────── COLLAPSIBLE SIDEBAR ───────── */}
      <aside
        className={`
          hidden md:flex flex-col w-64 fixed inset-y-0 left-0 z-20
          bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
          p-6 space-y-6 transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
          <img src="/FundFlow-Favicon.png" className="h-10 w-auto object-contain" alt="FundFlow" />
          <span className="text-2xl font-bold tracking-tight text-gray-800 dark:text-white">
            <span className="text-[#06D6A0]">Fund</span>Flow
          </span>
        </div>
        
        <nav className="flex flex-col space-y-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link}
              to={`/${link.toLowerCase().replace(/\s/g, "")}`}
              className={`
                px-3 py-2 rounded-lg transition text-sm font-medium whitespace-nowrap
                ${link === 'Users' 
                  ? 'bg-[#06D6A0] text-white shadow-md' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'}
              `}
            >
              {link}
            </Link>
          ))}
        </nav>
      </aside>

      {/* TOGGLE BUTTON */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`
          hidden md:flex fixed bottom-6 z-30 p-3 rounded-full shadow-lg transition-all duration-300
          items-center justify-center
          ${isSidebarOpen 
            ? "left-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500" 
            : "left-6 bg-[#06D6A0] text-white hover:scale-110"}
        `}
        title={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
      >
        {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 p-4 flex justify-between items-center z-50 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <img src="/FundFlow-Favicon.png" alt="Logo" className="h-8 w-auto" />
          <span className="text-xl font-bold text-gray-800 dark:text-white">
            <span className="text-[#06D6A0]">Fund</span>Flow
          </span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <HiX className="text-2xl dark:text-white" /> : <Menu className="text-2xl dark:text-white" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden fixed top-16 inset-x-0 bg-white dark:bg-gray-800 p-4 space-y-2 z-40 shadow-lg border-b border-gray-200 dark:border-gray-700">
          {NAV_LINKS.map((link) => (
            <Link
              key={link}
              to={`/${link.toLowerCase().replace(/\s/g, "")}`}
              className="block px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
              onClick={() => setMobileMenuOpen(false)}
            >
              {link}
            </Link>
          ))}
        </div>
      )}

      {/* ─── Main Content ─────────────────────────────── */}
      <main 
        className={`
          flex-1 p-6 mt-16 md:mt-0 pb-24 transition-all duration-300 ease-in-out
          ${isSidebarOpen ? "md:ml-64" : "md:ml-0"}
        `}
      >
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
              <Search className="w-8 h-8 text-[#06D6A0]" />
              Search Users
            </h1>

            <form
              onSubmit={handleSearch}
              className="flex flex-col sm:flex-row gap-3 mb-8"
            >
              <input
                type="text"
                placeholder="Enter user email (Case Sensitive)"
                className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#06D6A0] outline-none shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 rounded-xl bg-[#06D6A0] text-white font-bold hover:bg-[#05b588] transition shadow-md disabled:opacity-50"
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </form>

            {error && (
              <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl mb-6 text-center font-medium">
                {error}
              </div>
            )}

            <div className="grid gap-4">
              {results.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={user.picURL || "https://via.placeholder.com/150"}
                      alt={user.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                    />
                    <div>
                      <p className="font-bold text-lg text-gray-900 dark:text-white">
                        {user.name || "Unnamed User"}
                      </p>
                      {/* <p className="text-sm text-gray-500 dark:text-gray-400">
                        {user.email}
                      </p> */}
                    </div>
                  </div>

                  <Link
                    to={`/user/${user.id}`}
                    className="px-5 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium hover:bg-[#06D6A0] hover:text-white transition"
                  >
                    View Profile
                  </Link>
                </div>
              ))}
            </div>
        </div>
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="grid grid-cols-5 text-[11px]">
          {[
            { label: "Dashboard", icon: Home, to: "/dashboard" },
            { label: "Transactions", icon: CreditCard, to: "/transactions" },
            { label: "Goals", icon: Target, to: "/goals" },
            { label: "Social", icon: Users, to: "/social" },
            { label: "Profile", icon: User, to: "/profile" },
          ].map(({ label, icon: Icon, to }) => (
            <Link
              key={label}
              to={to}
              className="flex flex-col items-center justify-center py-3 transition hover:text-[#06d6a0] text-gray-500 dark:text-gray-400 active:scale-95"
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </nav>

    </div>
  );
}

export default SearchUsers;