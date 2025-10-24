import React, { useState, useEffect, useContext } from "react";
import "../styles/Goals.css";
import { TransactionContext } from "../context/TransactionContext";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

function Goals() {
  const { user, transactions } = useContext(TransactionContext) || {};
  const [goals, setGoals] = useState([]);
  const [goalName, setGoalName] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [endDate, setEndDate] = useState("");

  // Loads all of the user goals from Firebase.
  useEffect(() => {
    const fetchGoals = async () => {
      try {
        // Our Goals are stored in a collection called "Goals"
        const querySnapshot = await getDocs(collection(db, "Goals"));
        const goalList = querySnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          // Goals are shown based on the uid.
          .filter((g) => g.uid === user?.uid);
        setGoals(goalList);
      } catch (err) {
        console.error("Error fetching goals:", err);
      }
    };
    fetchGoals();
  }, [user]);

 // Section for adding new goals.
  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!goalName || !goalAmount || !endDate)
      return alert("Please fill all fields.");

    try {
      // Data applied to the Firebase for creating Goals.
      const newGoalRef = await addDoc(collection(db, "Goals"), {
        goalName,
        goalAmount: Number(goalAmount),
        startDate: serverTimestamp(),
        endDate: new Date(endDate),
        completed: false,
        achievedDate: null,
        uid: user?.uid || "guest",
        progress: 0, // start at 0%
      });

      // Function for setting goals, writing in the proper format for our firebase data.
      setGoals((prev) => [
        ...prev,
        {
          id: newGoalRef.id,
          goalName,
          goalAmount: Number(goalAmount),
          startDate: { seconds: Date.now() / 1000 },
          endDate: new Date(endDate),
          completed: false,
          achievedDate: null,
          uid: user?.uid || "guest",
          progress: 0,
        },
      ]);


      setGoalName("");
      setGoalAmount("");
      setEndDate("");
      alert("Goal added!");
    } catch (err) {
      console.error("Error adding goal:", err);
    }
  };

  // Function for setting a goal as completed. 
  const markAsCompleted = async (goal) => {
    const goalRef = doc(db, "Goals", goal.id);
    // Completion is based on a boolean value.
    await updateDoc(goalRef, {
      completed: true,
      achievedDate: serverTimestamp(),
      progress: 100,
    });

    setGoals((prev) =>
      prev.map((g) =>
        g.id === goal.id
          ? { ...g, completed: true, achievedDate: new Date(), progress: 100 }
          : g
      )
    );
  };

  // Calculate progress based on income transactions
  const calculateProgress = (goal) => {
    if (goal.completed) return 100;

    if (!goal.startDate) return 0;
    const start = new Date(goal.startDate.seconds * 1000);

    const incomeTransactions = transactions.filter(
      (tx) =>
        tx["transaction amount"] > 0 &&
        new Date(tx.TransactionDate.seconds * 1000) >= start &&
        tx.userid === goal.uid
    );

    const totalIncome = incomeTransactions.reduce(
      (sum, tx) => sum + tx["transaction amount"],
      0
    );

    return Math.min(Math.round((totalIncome / goal.goalAmount) * 100), 100);
  };

  // 
  useEffect(() => {
    const syncProgress = async () => {
      for (const goal of goals) {
        if (!goal.completed) {
          // Shows the progress percentage
          const progress = calculateProgress(goal);
          // Each goal as their own unique ID, associated with the uid.
          const goalRef = doc(db, "Goals", goal.id);
          await updateDoc(goalRef, { progress });
          setGoals((prev) =>
            prev.map((g) =>
              g.id === goal.id ? { ...g, progress } : g
            )
          );
        }
      }
    };
    if (goals.length > 0) syncProgress();
  }, [transactions, goals]);

  return (
    <div className="dashboard-layout">
     {/* Navigation Sidebar */}
     <aside className="sidebar">
      <h1 className="logo">FundFlow</h1>
        <nav className="sidebar-nav">
          <a href="/dashboard">Dashboard</a>
          <a href="/transactions">Transactions</a>
               <a href="/goals">Goals</a>
          <a href="/friends">Friends</a>
           <a href="/profile">Profile</a>
           <a href='/user'>Users</a>
          <a href="/settings">Settings</a>
          <a href="/support">Support</a>
        </nav>
    </aside>

      {/* Main Content */}
      <main className="dashboard-content">
        <section className="summary-cards">
          <div className="card goals-card">
            <h3>Add New Goal</h3>
            {/* Goal Input Form which sends the data from the user into Firebase. */}
            <form className="goal-form" onSubmit={handleAddGoal}>
              <input
                type="text"
                placeholder="Goal Name"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
              />
              <input
                type="number"
                placeholder="Goal Amount ($)"
                value={goalAmount}
                onChange={(e) => setGoalAmount(e.target.value)}
              />
              <label>Target End Date:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <button type="submit" className="add-goal-btn">
                Add Goal
              </button>
            </form>
          </div>
        </section>

        <section className="main-section">
          {/* Displays the users current goals, based on the uid. */}
          <h2>Your Goals</h2>
          <div className="goals-list">
            {goals.length === 0 ? (
              // If no goals have been created, the user is shown a message.
              <p className="no-goals">No Goals have been created</p>
            ) : (
              goals.map((goal) => (
                <div
                  key={goal.id}
                  className={`goal-item ${
                    goal.completed ? "completed-goal" : ""
                  }`}
                >
                  <div className="goal-info">
                    <h3>{goal.goalName}</h3>
                    <p>Target Amount: ${goal.goalAmount}</p>
                    <p>
                      Duration:{" "}
                      {goal.startDate
                        ? new Date(goal.startDate.seconds * 1000).toDateString()
                        : "N/A"}{" "}
                      -{" "}
                      {goal.endDate
                        ? new Date(goal.endDate.seconds * 1000).toDateString()
                        : "N/A"}
                    </p>
                    <p>
                      Status:{" "}
                      <span
                        className={
                          goal.completed ? "goal-complete" : "goal-pending"
                        }
                      >
                        {goal.completed ? "Completed" : "In Progress"}
                      </span>
                    </p>
                    {goal.completed && goal.achievedDate && (
                      <p>
                        Achieved:{" "}
                        {new Date(goal.achievedDate.seconds * 1000).toDateString()}
                      </p>
                    )}
                    <p>Progress: {goal.progress ?? 0}%</p>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${goal.progress ?? 0}%` }}
                      />
                    </div>
                  </div>
                  {!goal.completed && (
                    <button
                      onClick={() => markAsCompleted(goal)}
                      className="complete-btn"
                    >
                      Mark as Done
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        <footer className="dashboard-footer">
          <p>FundFlow © 2025</p>
           <p>This is a Senior Capstone Project for Farmingdale State College.</p>
          <p>
          Created by Brian Alterescu, Antonious Yakoub, Christopher Brady,
          Marlen Zavala-Maldonado, and Katherine Acosta.
        </p>
        </footer>
      </main>
    </div>
  );
}

export default Goals;
