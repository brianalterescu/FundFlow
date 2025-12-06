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
import "../styles/CSV.css";
import "../styles/Profile.css"; // for shared header

export default function CsvPage() {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("");
  const [rowsPreview, setRowsPreview] = useState([]);
  const [header, setHeader] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const fileRef = useRef(null);
  const navigate = useNavigate();

  // Export order of fields)
  const FIELD_ORDER = useMemo(
    () => [
      "TransactionDate",
      "Category",
      "Description",
      "transaction amount",
      "createdAt",
    ],
    []
  );

  // Import template header - expected columns
  const IMPORT_HEADER = useMemo(
    () => ["TransactionDate", "Category", "Description", "transaction amount"],
    []
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) navigate("/login");
      else setUser(u);
    });
    return () => unsub();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  // Parse CSV file and show preview
  const handleFileSelect = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    const { header: h, rows } = parseCSV(text);
    setHeader(h);
    setTotalRows(rows.length);
    setRowsPreview(rows.slice(0, 10));
    setStatus(`Parsed ${rows.length} rows. Showing first 10 below.`);
  };

  // Import File and commit write batch to firestore
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
      const d = mapRowToDoc(r, uid, header); //go through rows mapping them to documents
      if (d) docs.push(d); //combines them with a push so they can be imported as a batch
    }
    if (!docs.length) {
      setStatus("No valid rows to import.");
      return;
    }

    const CHUNK = 400; //control size for commits, 500 limit for firestore so 400 keeps it under that
    let imported = 0;
    setStatus(`Importing ${docs.length} transactions…`);

    //loop through docs in chunks per Firestore batch limitations
    for (let i = 0; i < docs.length; i += CHUNK) { //CHUNK controls the loop, allowing for writes up to the allotted amount0
      const batch = writeBatch(db); 
      const slice = docs.slice(i, i + CHUNK);
      for (const d of slice) { //add each of the docs in this slice to the overall batch
        batch.set(doc(collection(db, "transactions")), d);
      }
      await commitWithRetry(batch); //commit the batch to the firestore
      imported += slice.length;
      setStatus(`Imported ${imported}/${docs.length}…`); //counts records added
      await sleep(150); // back-pressure delay - keeps from a mass, quick multiple upload
    }

    setStatus(`Hurrah! Imported ${imported} transactions.`);
  };

  // Export Transactions to CSV
  const handleExport = async () => {
    if (!user) return setStatus("Please log in first.");
    setStatus("Fetching transactions…");

    const txRef = collection(db, "transactions");
    const q = query(txRef, where("userid", "==", user.uid));
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (!items.length) return setStatus("No transactions to export.");

    const order = FIELD_ORDER.length ? FIELD_ORDER : inferFieldOrder(items[0]);

    // strip userid so it doesn't export, format dates in MM/DD/YYYY
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

  // Download CSV Template - contains just the header line for quick setup
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

  
  return (
    <div className="page">
      {/* Header */}
      <header className="header-bar">
 <Link to="/">
          <img
            src="./FundFlowLogo2.png"
            alt="Fund Flow Logo"
            className="logo"
          />
        </Link>
        <nav className="nav-links">
          <Link to="/dashboard" className="nav-self-profile-primary-btn">Dashboard</Link>
          <Link to="/profile" className="nav-self-profile-primary-btn">Profile</Link>
          <Link to="/goals" className="nav-self-profile-primary-btn">Goals</Link>
          <Link to="/Transactions" className="nav-self-profile-primary-btn">Transactions</Link>
          <button onClick={handleLogout} className="logout-small">Logout</button>
        </nav>
      </header>

      <div className="header-spacer" />

      <div className="csv-page">
        <h1>CSV Import & Export</h1>

        {!user && (
          <p className="warning">You must be logged in to use this page.</p>
        )}

        <section className="csv-section">
          <h2>Import Transactions (MM/DD/YYYY)</h2>
          <div className="hint">
            Expected header (case-sensitive):{" "}
            <code>{IMPORT_HEADER.join(",")}</code>
          </div>



          <div className="inline-controls">
          <p className="csv-p"> Download the Template Below for preset headers </p>
          <h1></h1>
          <p className="csv-p"> For transaction amount - enter positive values for Income and Negative values for expenses </p>

            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileSelect}
              className="CSV-file-input"
            />           

            <button onClick={handleDownloadTemplate} className="self-profile-primary-btn">
              Download CSV Template
            </button>
          </div>

          {rowsPreview.length > 0 && (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    {header.map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rowsPreview.map((r, i) => (
                    <tr key={i}>
                      {r.map((cell, j) => (
                        <td key={j}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="preview-note">
                Showing first {rowsPreview.length} of {totalRows} rows.
              </p>
            </div>
          )}

            <div className="new-spacer" />

          <button onClick={handleImport} disabled={!user} className="self-profile-primary-btn">
            Upload File and Import Transactions
          </button>
        </section>

        <section className="csv-section">
          <h2>Export My Transactions</h2>
          <button onClick={handleExport} disabled={!user} className="self-profile-primary-btn">
            Export Transactions Data
          </button>
        </section>

        {status && <p className="status">{status}</p>}
      </div>
    </div>
  );
}

//parse function helper
function parseCSV(text) {
  const rows = [];
  let field = "";
  let row = [];
  let i = 0;
  let inQuotes = false;

  const pushField = () => { //to move between fields when reading the CSV
    row.push(field);
    field = "";
  };
  const pushRow = () => { //for moving to next row
    if (row.length && !(row.length === 1 && row[0].trim() === "")) rows.push(row);
    row = [];
  };

  while (i < text.length) { //loop to iterate through the loop
    const c = text[i];
    if (inQuotes) { //for detecting and handling text in quotes, sees if there are double quotes within the field, keeps them or skips a single quote
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
      } else {
        field += c;
        i++;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
        i++;
      } else if (c === ",") {
        pushField();
        i++;
      } else if (c === "\n") {
        pushField();
        pushRow();
        i++;
      } else if (c === "\r") {
        pushField();
        pushRow();
        if (text[i + 1] === "\n") i++;
        i++;
      } else {
        field += c;
        i++;
      }
    }
  }
  pushField(); //go to next field
  pushRow(); //go to next row

  if (!rows.length) return { header: [], rows: [] }; //detects no rows
  const [header, ...dataRows] = rows; //finds header from first row
  return { header: header.map((h) => h.trim()), rows: dataRows }; //remove space from header
}

//for fixing dates
function parseStrictDate(str) {
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [_, mm, dd, yyyy] = m;
  const d = new Date(`${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T00:00:00`);
  return isNaN(d) ? null : d;
}


//maps CSV row to Firestore document
function mapRowToDoc(row, uid, header) {
  const byName = Object.fromEntries(header.map((h, i) => [h.trim(), row[i] ?? ""])); //strips the fields from the row that was read
  const desc = (byName["Description"] || "").trim();
  const cat = (byName["Category"] || "").trim();
  const amtStr = byName["transaction amount"] ?? byName["amount"] ?? "";
  const amount = parseFloat(String(amtStr).replace(/[, ]/g, "")) || 0;

  const rawDate = (byName["TransactionDate"] || "").trim();
  const dateValue = parseStrictDate(rawDate); //handles the date cleanup to accomodate firestore
  if (!dateValue) {
    console.warn(`Invalid date format for row: ${rawDate}`); //try to catch bad date formats to avoid breaking the database
    return null;
  }

  return {
    userid: uid, // set internally, never read from CSV, based on current logged on user only
    Category: cat, 
    Description: desc,
    "transaction amount": amount,
    TransactionDate: dateValue,
    createdAt: serverTimestamp(),
  };
}

//format dates
function formatMMDDYYYY(value) { //perform firestore date transformation
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

function escCSV(x) { //needed for CSV export to handle null values as empty strings, adds quotes where needed
  if (x === null || x === undefined) return "";
  const s = String(x);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCSV(items, order) { //turn array into CSV text - for CSV Export
  const header = order.join(",");
  const lines = items.map((it) => order.map((key) => escCSV(it[key])).join(","));
  return [header, ...lines].join("\r\n");
}

function inferFieldOrder(sample) { //attempt to infer field order from document headers if missing, shouldn't be needed as we use defined field order, filters IDs as we only use/want the current logged on user ID from auth, not from a file
  return Object.keys(sample).filter((k) => k !== "id" && k !== "userid");
}

function sleep(ms) { //for setting time between reads
  return new Promise((res) => setTimeout(res, ms));
}

//attempts to commit to firebase
async function commitWithRetry(batch, maxRetries = 5) {
  let attempt = 0;
  while (true) {
    try {
      await batch.commit();
      return;
    } catch (err) {
      if (attempt >= maxRetries) throw err;
      const backoff = Math.min(2000, 200 * Math.pow(2, attempt));
      await sleep(backoff + Math.floor(Math.random() * 120));
      attempt++;
    }
  }
}
