import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../firebaseConfig";

// Icons
import { 
  Home, CreditCard, Target, Users, User, ChevronLeft, Menu, 
  Upload, Download, FileText, CheckCircle, AlertCircle
} from "lucide-react";
import { HiX } from "react-icons/hi";

export default function CsvPage() {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("");
  const [rowsPreview, setRowsPreview] = useState([]);
  const [header, setHeader] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const fileRef = useRef(null);
  const navigate = useNavigate();

  // Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Export order
  const FIELD_ORDER = useMemo(
    () => ["TransactionDate", "Category", "Description", "transaction amount", "createdAt"],
    []
  );

  // Import template header
  const IMPORT_HEADER = useMemo(
    () => ["TransactionDate", "Category", "Description", "transaction amount", "createdAt"],
    []
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) navigate("/login");
      else setUser(u);
    });
    return () => unsub();
  }, [navigate]);

  // --- CSV LOGIC START ---
  const handleFileSelect = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    const { header: h, rows } = parseCSV(text);
    setHeader(h);
    setTotalRows(rows.length);
    setRowsPreview(rows.slice(0, 10));
    setStatus(`Parsed ${rows.length} rows. Ready to import.`);
  };

  const handleImport = async () => {
    if (!user) return setStatus("Please log in first.");
    if (!fileRef.current?.files?.[0]) return setStatus("No file selected.");
    const text = await fileRef.current.files[0].text();
    const parsed = parseCSV(text);
    await importRows(parsed.rows, parsed.header, user.uid);
  };

  const importRows = async (rows, header, uid) => {
    setStatus("Validating rows…");
    const docs = [];
    for (const r of rows) {
      const d = mapRowToDoc(r, uid, header);
      if (d) docs.push(d);
    }
    if (!docs.length) {
      setStatus("No valid rows to import.");
      return;
    }

    const CHUNK = 400;
    let imported = 0;
    setStatus(`Importing ${docs.length} transactions…`);

    for (let i = 0; i < docs.length; i += CHUNK) {
      const batch = writeBatch(db);
      const slice = docs.slice(i, i + CHUNK);
      for (const d of slice) {
        batch.set(doc(collection(db, "transactions")), d);
      }
      await commitWithRetry(batch);
      imported += slice.length;
      setStatus(`Imported ${imported}/${docs.length}…`);
      await sleep(150);
    }
    setStatus(`Success! Imported ${imported} transactions.`);
  };

  const handleExport = async () => {
    if (!user) return setStatus("Please log in first.");
    setStatus("Fetching transactions…");

    const txRef = collection(db, "transactions");
    const q = query(txRef, where("userid", "==", user.uid));
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (!items.length) return setStatus("No transactions to export.");

    const order = FIELD_ORDER.length ? FIELD_ORDER : inferFieldOrder(items[0]);

    const sanitized = items.map((it) => {
      const { userid, ...rest } = it;
      return {
        ...rest,
        TransactionDate: formatMMDDYYYY(it.TransactionDate),
        createdAt: formatMMDDYYYY(it.createdAt),
      };
    });
    
    const csv = toCSV(sanitized, order);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `transactions_${ts}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus(`Success! Exported ${items.length} transactions.`);
  };

  const handleDownloadTemplate = () => {
    const headerLine = IMPORT_HEADER.join(",") + "\r\n";
    const blob = new Blob([headerLine], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions_template.csv";
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded CSV template.");
  };
  // --- CSV LOGIC END ---

  const navLinks = [ "Dashboard", "Transactions", "Goals", "Connections", "Users", "Social", "CSV Uploading", "Profile", "Wrapped" ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-['Lexend_Deca'] transition-colors duration-200">

      {/* ───────── SIDEBAR ───────── */}
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
          {navLinks.map((link) => (
            <Link
              key={link}
              to={`/${link.toLowerCase().replace(/\s/g, "")}`}
              className={`
                px-3 py-2 rounded-lg transition text-sm font-medium whitespace-nowrap
                ${link === 'CSV Uploading' 
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
          {navLinks.map((link) => (
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

      {/* ───────── MAIN CONTENT ───────── */}
      <main 
        className={`
          flex-1 p-6 mt-16 md:mt-0 pb-24 transition-all duration-300 ease-in-out
          ${isSidebarOpen ? "md:ml-64" : "md:ml-0"}
        `}
      >
        <div className="max-w-4xl mx-auto">
            
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Upload className="text-[#06D6A0]" /> CSV Import & Export
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">Manage your data in bulk. Upload bank statements or backup your history.</p>

            {/* STATUS ALERT */}
            {status && (
                <div className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50 flex items-center gap-2">
                    <CheckCircle size={20} />
                    <span className="font-medium">{status}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* IMPORT CARD */}
                <section className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-[#06D6A0]">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Import Data</h2>
                            <p className="text-xs text-gray-500">Format: MM/DD/YYYY</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-center">
                            <input
                                ref={fileRef}
                                type="file"
                                accept=".csv,text/csv"
                                onChange={handleFileSelect}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#06D6A0]/10 file:text-[#06D6A0] hover:file:bg-[#06D6A0]/20 transition"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleDownloadTemplate}
                                className="flex-1 py-2 px-4 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm"
                            >
                                Get Template
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={!user || !rowsPreview.length}
                                className="flex-1 py-2 px-4 rounded-lg bg-[#06D6A0] text-white font-medium hover:bg-[#05b588] transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Import Now
                            </button>
                        </div>
                    </div>
                </section>

                {/* EXPORT CARD */}
                <section className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-500">
                            <Download size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Export Data</h2>
                            <p className="text-xs text-gray-500">Backup your history</p>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl mb-4">
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                            Download a complete record of your income and expenses. The file will be in CSV format, compatible with Excel and Google Sheets.
                        </p>
                    </div>

                    <button
                        onClick={handleExport}
                        disabled={!user}
                        className="w-full py-3 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold hover:opacity-90 transition disabled:opacity-50"
                    >
                        Export All Transactions
                    </button>
                </section>
            </div>

            {/* PREVIEW TABLE */}
            {rowsPreview.length > 0 && (
                <section className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900 dark:text-white">File Preview</h3>
                        <span className="text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
                            Showing 10 of {totalRows} rows
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-500 dark:text-gray-400">
                                <tr>
                                    {header.map((h) => (
                                        <th key={h} className="px-6 py-3 font-medium whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {rowsPreview.map((row, i) => (
                                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        {row.map((cell, j) => (
                                            <td key={j} className="px-6 py-3 whitespace-nowrap">{cell}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

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

// --- HELPER FUNCTIONS ---

function parseCSV(text) {
  const rows = [];
  let field = "";
  let row = [];
  let i = 0;
  let inQuotes = false;

  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => { if (row.length && !(row.length === 1 && row[0].trim() === "")) rows.push(row); row = []; };

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++;
      } else { field += c; i++; }
    } else {
      if (c === '"') { inQuotes = true; i++; }
      else if (c === ",") { pushField(); i++; }
      else if (c === "\n") { pushField(); pushRow(); i++; }
      else if (c === "\r") { pushField(); pushRow(); if (text[i + 1] === "\n") i++; i++; }
      else { field += c; i++; }
    }
  }
  pushField(); pushRow();

  if (!rows.length) return { header: [], rows: [] };
  const [header, ...dataRows] = rows;
  return { header: header.map((h) => h.trim()), rows: dataRows };
}

function parseStrictDate(str) {
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [_, mm, dd, yyyy] = m;
  const d = new Date(`${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T00:00:00`);
  return isNaN(d) ? null : d;
}

function mapRowToDoc(row, uid, header) {
  const byName = Object.fromEntries(header.map((h, i) => [h.trim(), row[i] ?? ""]));
  const desc = (byName["Description"] || "").trim();
  const cat = (byName["Category"] || "").trim();
  const amtStr = byName["transaction amount"] ?? byName["amount"] ?? "";
  const amount = parseFloat(String(amtStr).replace(/[, ]/g, "")) || 0;
  const rawDate = (byName["TransactionDate"] || "").trim();
  const dateValue = parseStrictDate(rawDate);
  
  if (!dateValue) { console.warn(`Invalid date: ${rawDate}`); return null; }

  return {
    userid: uid,
    Category: cat,
    Description: desc,
    "transaction amount": amount,
    TransactionDate: dateValue,
    createdAt: serverTimestamp(),
  };
}

function formatMMDDYYYY(value) {
  if (!value) return "";
  let d;
  if (value?.seconds) d = new Date(value.seconds * 1000);
  else if (value instanceof Date) d = value;
  else return String(value);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function escCSV(x) {
  if (x === null || x === undefined) return "";
  const s = String(x);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCSV(items, order) {
  const header = order.join(",");
  const lines = items.map((it) => order.map((key) => escCSV(it[key])).join(","));
  return [header, ...lines].join("\r\n");
}

function inferFieldOrder(sample) {
  return Object.keys(sample).filter((k) => k !== "id" && k !== "userid");
}

function sleep(ms) { return new Promise((res) => setTimeout(res, ms)); }

async function commitWithRetry(batch, maxRetries = 5) {
  let attempt = 0;
  while (true) {
    try { await batch.commit(); return; }
    catch (err) {
      if (attempt >= maxRetries) throw err;
      const backoff = Math.min(2000, 200 * Math.pow(2, attempt));
      await sleep(backoff + Math.floor(Math.random() * 120));
      attempt++;
    }
  }
}