import React, { useState, useEffect, useMemo } from 'react';
import '../styles/Wrapped.css';
import { db } from '../firebaseConfig.js';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { Link } from 'react-router-dom';

const FinanceTracker = () => {
  const [transactions, setTransactions] = useState([]);
  const [expectations, setExpectations] = useState([
    { id: 1, name: 'Emergency Fund', target: 10000, current: 6500 },
    { id: 2, name: 'Vacation Savings', target: 5000, current: 3200 },
    { id: 3, name: 'Monthly Savings', target: 1000, current: 850 }
  ]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('summary'); // 'summary', 'stories', 'goals'
  const [userId, setUserId] = useState(null);

  // Listen for auth state changes
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid || null);
    });
    return () => unsubscribe();
  }, []);

  console.log("userId:", userId);

  // Load transactions from Firestore
  useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      setLoading(true);

      try {
        const snapshot = await getDocs(
          query(collection(db, 'transactions'), where('userid', '==', userId))
        );

        // Normalize all transaction dates
        const data = snapshot.docs.map(doc => {
          const t = doc.data();
          const date = t.TransactionDate?.toDate?.() || new Date(t.date || t.createdAt?.toDate?.() || Date.now());
          return { id: doc.id, ...t, date };
        });

        const filtered = data.filter(t => t.date.getFullYear() === selectedYear);

        console.log('Filtered transactions:', filtered);
        setTransactions(filtered);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      }

      setLoading(false);
    };

    loadData();
  }, [userId, selectedYear]);

  // Analytics calculations
  const analytics = useMemo(() => {
    const yearTransactions = transactions.filter(t => t.date.getFullYear() === selectedYear);

    // Treat positive amounts as income, negative as expenses
    const totalIncome = yearTransactions
      .filter(t => t["transaction amount"] > 0)
      .reduce((sum, t) => sum + t["transaction amount"], 0);

    const totalExpenses = yearTransactions
      .filter(t => t["transaction amount"] < 0)
      .reduce((sum, t) => sum + Math.abs(t["transaction amount"]), 0);

    const netSavings = totalIncome - totalExpenses;

    // Category breakdown for expenses
    const categoryMap = {};
    yearTransactions
      .filter(t => t["transaction amount"] < 0)
      .forEach(t => {
        const cat = t.Category || 'Other';
        categoryMap[cat] = (categoryMap[cat] || 0) + Math.abs(t["transaction amount"]);
      });

    const categoryBreakdown = Object.entries(categoryMap)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    // Monthly trend
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({ month: i, income: 0, expenses: 0 }));
    yearTransactions.forEach(t => {
      const month = t.date.getMonth();
      if (t["transaction amount"] > 0) monthlyData[month].income += t["transaction amount"];
      else monthlyData[month].expenses += Math.abs(t["transaction amount"]);
    });

    const currentMonth = new Date().getMonth();
    const lastMonthExpenses = monthlyData[currentMonth - 1]?.expenses || 0;
    const currentMonthExpenses = monthlyData[currentMonth]?.expenses || 0;
    const expenseChange = lastMonthExpenses > 0
      ? ((currentMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
      : 0;

    const topCategory = categoryBreakdown[0] || { category: 'N/A', amount: 0 };

    return {
      totalIncome,
      totalExpenses,
      netSavings,
      categoryBreakdown,
      monthlyData,
      topCategory,
      expenseChange,
      transactionCount: yearTransactions.length
    };
  }, [transactions, selectedYear]);

  const handleShare = () => {
    alert('Share functionality - integrate html2canvas or similar');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your financial data...</p>
      </div>
    );
  }

  return (
    <div className="finance-tracker">
      {/* Navbar */}
      {/* Standard navigation to access other JSX files */}
      <header className="navbar">
        <Link to="/dashboard">
          <img src="./FundFlowLogo2.png" alt="Fund Flow" className="logo" />
        </Link>
        <nav className="nav-links">
          <a href="/dashboard" className="nav-links">Dashboard</a>
          <a href="/transactions" className="nav-links">Transactions</a>
          <a href="/goals" className="nav-links">Goals</a>
          <a href="/connections" className="nav-links">Connections</a>
          <a href="/searchUser" className="nav-links">Users</a>
          <a href="/profile" className="nav-links">Profile</a>
        </nav>
      </header>

      <header className="header">
        <h1>Your {selectedYear} Financial Journey</h1>
        <div className="header-controls">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="year-selector"
          >
            <option value={2025}>2025</option>
            <option value={2024}>2024</option>
            <option value={2023}>2023</option>
            <option value={2022}>2022</option>
          </select>
          <button onClick={handleShare} className="share-btn">Share Summary</button>
        </div>
      </header>

      <nav className="view-tabs">
        <button className={viewMode === 'summary' ? 'active' : ''} onClick={() => setViewMode('summary')}>Summary</button>
        <button className={viewMode === 'stories' ? 'active' : ''} onClick={() => setViewMode('stories')}>Stories</button>
        <button className={viewMode === 'goals' ? 'active' : ''} onClick={() => setViewMode('goals')}>Goals</button>
      </nav>

      <main id="summary-container" className="content">
        {viewMode === 'summary' && <SummaryView analytics={analytics} />}
        {viewMode === 'stories' && <StoriesView analytics={analytics} />}
        {viewMode === 'goals' && <GoalsView expectations={expectations} />}
      </main>
    </div>
  );
};

// ---------- COMPONENTS: SummaryView, StoriesView, GoalsView, StatCard, InsightCard, DonutChart, BarChart ----------


/**
 * SUMMARY VIEW COMPONENT
 * Displays overview cards and charts
 */
const SummaryView = ({ analytics }) => {
  return (
    <div className="summary-view">
      <div className="stats-grid">
        <StatCard
          title="Total Income"
          value={analytics.totalIncome}
          trend="up"
          icon="💰"
        />
        <StatCard
          title="Total Expenses"
          value={analytics.totalExpenses}
          trend="neutral"
          icon="💸"
        />
        <StatCard
          title="Net Savings"
          value={analytics.netSavings}
          trend={analytics.netSavings > 0 ? 'up' : 'down'}
          icon="🏦"
        />
        <StatCard
          title="Transactions"
          value={analytics.transactionCount}
          trend="neutral"
          icon="📊"
          isNumber
        />
      </div>

      <div className="charts-section">
        <div className="chart-container">
          <h3>Spending by Category</h3>
          <DonutChart data={analytics.categoryBreakdown} />
        </div>

        <div className="chart-container">
          <h3>Monthly Trend</h3>
          <BarChart data={analytics.monthlyData} />
        </div>
      </div>

      <div className="insights-section">
        <InsightCard
          title="Top Spending Category"
          description={`You spent the most on ${analytics.topCategory.category}`}
          value={analytics.topCategory.amount}
        />
        <InsightCard
          title="Monthly Change"
          description={`Your expenses ${analytics.expenseChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(analytics.expenseChange).toFixed(1)}% from last month`}
          trend={analytics.expenseChange > 0 ? 'up' : 'down'}
        />
      </div>
    </div>
  );
};

/**
 * STORIES VIEW COMPONENT
 * Wrapped-style animated slides
 */
const StoriesView = ({ analytics }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "Your Year in Numbers",
      content: `${analytics.transactionCount} transactions tracked`,
      highlight: analytics.transactionCount,
      color: '#6366f1'
    },
    {
      title: "You Earned",
      content: `$${analytics.totalIncome.toLocaleString()}`,
      highlight: `$${analytics.totalIncome.toLocaleString()}`,
      color: '#10b981'
    },
    {
      title: "You Spent",
      content: `$${analytics.totalExpenses.toLocaleString()}`,
      highlight: `$${analytics.totalExpenses.toLocaleString()}`,
      color: '#f59e0b'
    },
    {
      title: "Your Top Category",
      content: analytics.topCategory.category,
      highlight: `$${analytics.topCategory.amount.toLocaleString()}`,
      color: '#ec4899'
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="stories-view">
      <div className="story-slide" style={{ backgroundColor: slides[currentSlide].color }}>
        <div className="story-content">
          <h2>{slides[currentSlide].title}</h2>
          <div className="story-highlight">{slides[currentSlide].highlight}</div>
          <p>{slides[currentSlide].content}</p>
        </div>

        <div className="story-progress">
          {slides.map((_, idx) => (
            <div
              key={idx}
              className={`progress-bar ${idx === currentSlide ? 'active' : ''}`}
            />
          ))}
        </div>
      </div>

      <div className="story-controls">
        <button onClick={prevSlide} className="story-nav">←</button>
        <span>{currentSlide + 1} / {slides.length}</span>
        <button onClick={nextSlide} className="story-nav">→</button>
      </div>
    </div>
  );
};

/**
 * GOALS VIEW COMPONENT
 * Progress tracking for financial goals
 */
const GoalsView = ({ expectations }) => {
  return (
    <div className="goals-view">
      <h2>Your Financial Goals</h2>
      <div className="goals-grid">
        {expectations.map(goal => {
          const progress = (goal.current / goal.target) * 100;
          const isComplete = progress >= 100;

          return (
            <div key={goal.id} className="goal-card">
              <div className="goal-header">
                <h3>{goal.name}</h3>
                <span className={`goal-status ${isComplete ? 'complete' : ''}`}>
                  {isComplete ? '✓ Complete' : 'In Progress'}
                </span>
              </div>

              <div className="goal-amounts">
                <span>${goal.current.toLocaleString()}</span>
                <span className="target">of ${goal.target.toLocaleString()}</span>
              </div>

              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>

              <div className="goal-percentage">
                {progress.toFixed(1)}% Complete
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * REUSABLE COMPONENTS
 */
const StatCard = ({ title, value, trend, icon, isNumber = false }) => {
  const trendClass = trend === 'up' ? 'positive' : trend === 'down' ? 'negative' : 'neutral';

  return (
    <div className={`stat-card ${trendClass}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <h4>{title}</h4>
        <p className="stat-value">
          {isNumber ? value : `$${value.toLocaleString()}`}
        </p>
      </div>
    </div>
  );
};

const InsightCard = ({ title, description, value, trend }) => {
  return (
    <div className="insight-card">
      <h4>{title}</h4>
      <p>{description}</p>
      {value && <div className="insight-value">${value.toLocaleString()}</div>}
    </div>
  );
};

/**
 * DONUT CHART COMPONENT
 * Pure CSS/SVG implementation for performance
 */
const DonutChart = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.amount, 0);
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

  let currentAngle = 0;
  const segments = data.map((item, idx) => {
    const percentage = (item.amount / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;

    return {
      ...item,
      percentage,
      startAngle,
      endAngle: currentAngle,
      color: colors[idx % colors.length]
    };
  });

  return (
    <div className="donut-chart">
      <svg viewBox="0 0 200 200" className="donut-svg">
        <circle cx="100" cy="100" r="80" fill="none" stroke="#e5e7eb" strokeWidth="40" />
        {segments.map((segment, idx) => {
          const startRad = (segment.startAngle - 90) * (Math.PI / 180);
          const endRad = (segment.endAngle - 90) * (Math.PI / 180);

          const x1 = 100 + 80 * Math.cos(startRad);
          const y1 = 100 + 80 * Math.sin(startRad);
          const x2 = 100 + 80 * Math.cos(endRad);
          const y2 = 100 + 80 * Math.sin(endRad);

          const largeArc = segment.percentage > 50 ? 1 : 0;

          return (
            <path
              key={idx}
              d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`}
              fill={segment.color}
              opacity="0.8"
            />
          );
        })}
      </svg>

      <div className="donut-legend">
        {segments.map((segment, idx) => (
          <div key={idx} className="legend-item">
            <span
              className="legend-color"
              style={{ backgroundColor: segment.color }}
            />
            <span className="legend-label">{segment.category}</span>
            <span className="legend-value">${segment.amount.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * BAR CHART COMPONENT
 * Optimized for monthly trend visualization
 */
const BarChart = ({ data }) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const maxValue = Math.max(...data.map(d => Math.max(d.income, d.expenses)));

  return (
    <div className="bar-chart">
      {data.map((month, idx) => {
        const incomeHeight = (month.income / maxValue) * 100;
        const expenseHeight = (month.expenses / maxValue) * 100;

        return (
          <div key={idx} className="bar-group">
            <div className="bars">
              <div
                className="bar income"
                style={{ height: `${incomeHeight}%` }}
                title={`Income: $${month.income.toLocaleString()}`}
              />
              <div
                className="bar expense"
                style={{ height: `${expenseHeight}%` }}
                title={`Expenses: $${month.expenses.toLocaleString()}`}
              />
            </div>
            <span className="bar-label">{months[month.month]}</span>
          </div>
        );
      })}

      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-color income"></span>
          <span>Income</span>
        </div>
        <div className="legend-item">
          <span className="legend-color expense"></span>
          <span>Expenses</span>
        </div>
      </div>
    </div>
  );
};

export default FinanceTracker;