// ------------------
// Advanced Script Panel
// ------------------
import React, { useState } from "react";
import { collection, getDocs, updateDoc, doc, deleteField } from "firebase/firestore";
import { db } from "../firebaseConfig";
import "../styles/Admin.css";

function AdvancedScriptPanel() {
  const [collectionName, setCollectionName] = useState("");
  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState("string"); // New: type dropdown
  const [defaultValue, setDefaultValue] = useState(""); // New: default value input
  const [action, setAction] = useState("add"); // "add" | "delete"
  const [status, setStatus] = useState("");

  const parseValue = (value, type) => {
    try {
      switch (type) {
        case "number":
          return Number(value);
        case "boolean":
          return value.toLowerCase() === "true";
        case "array":
        case "object":
          return value ? JSON.parse(value) : type === "array" ? [] : {};
        default:
          return value; // string
      }
    } catch {
      return type === "array" ? [] : type === "object" ? {} : value;
    }
  };

  const handleRunScript = async () => {
    if (!collectionName.trim() || !fieldName.trim()) {
      alert("Collection and Field Name are required.");
      return;
    }

    const confirmMsg =
      action === "add"
        ? `Add/update field "${fieldName}" in all documents of "${collectionName}"?`
        : `Delete field "${fieldName}" from all documents of "${collectionName}"?`;
    if (!window.confirm(confirmMsg)) return;

    setStatus("Running script...");
    try {
      const collRef = collection(db, collectionName);
      const snap = await getDocs(collRef);
      let updatedCount = 0;

      await Promise.all(
        snap.docs.map(async (d) => {
          const docRef = doc(db, collectionName, d.id);
          if (action === "add") {
            const parsedValue = parseValue(defaultValue, fieldType);
            await updateDoc(docRef, { [fieldName]: parsedValue });
          } else if (action === "delete") {
            await updateDoc(docRef, { [fieldName]: deleteField() });
          }
          updatedCount++;
        })
      );

      setStatus(`Success! Updated ${updatedCount} documents.`);
    } catch (err) {
      console.error("Error running script:", err);
      setStatus("Error: " + err.message);
    }
  };

  return (
    <div className="admin-main" style={{ marginTop: "2rem" }}>
      <h3 className="admin-main-text">Advanced Script Panel</h3>

      <label className="admin-main-text">Collection Name:</label>
      <input
        type="text"
        placeholder="e.g., users, posts"
        value={collectionName}
        onChange={(e) => setCollectionName(e.target.value)}
      />

      <label className="admin-main-text">Field Name:</label>
      <input
        type="text"
        placeholder="e.g., bio"
        value={fieldName}
        onChange={(e) => setFieldName(e.target.value)}
      />

      {action === "add" && (
        <>
          <label className="admin-main-text">Field Type:</label>
          <select value={fieldType} onChange={(e) => setFieldType(e.target.value)}>
            <option className="admin-main-text" value="string">String</option>
            <option className="admin-main-text" value="number">Number</option>
            <option className="admin-main-text" value="boolean">Boolean</option>
            <option className="admin-main-text" value="array">Array</option>
            <option className="admin-main-text" value="object">Object</option>
          </select>

          <label>Default Value:</label>
          <input
            type="text"
            placeholder="Enter default value for existing documents"
            value={defaultValue}
            onChange={(e) => setDefaultValue(e.target.value)}
          />
        </>
      )}

      <div style={{ marginBottom: "1rem" }}>
        <button
          className="admin-main-btn"
          onClick={() => setAction("add")}
          style={{ marginRight: "0.5rem" }}
        >
          Add/Update Field
        </button>
        <button className="admin-delete-btn" onClick={() => setAction("delete")}>
          Delete Field
        </button>
      </div>

      <button className="admin-main-btn" onClick={handleRunScript}>
        Run Script
      </button>

      {status && <p className="admin-userInfo" style={{ marginTop: "1rem" }}>{status}</p>}
    </div>
  );
}

export default AdvancedScriptPanel;
