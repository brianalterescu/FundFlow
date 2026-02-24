import React, { createContext, useContext, useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import { 
  Home, CreditCard, Target, Users, User, ChevronLeft, Menu, 
  Briefcase, TrendingUp, PieChart, RefreshCw, ChevronDown, ChevronUp 
} from "lucide-react";
import { HiX } from "react-icons/hi";

// Chart.js
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// ============================================================================
// CONTEXT SETUP
// ============================================================================
const TransactionContext = createContext();

const mockTransactions = [
  { id: 1, date: '2025-01-15', amount: 5000, type: 'salary', category: 'Employment' },
  { id: 3, date: '2025-02-15', amount: 5000, type: 'salary', category: 'Employment' },
  { id: 5, date: '2025-03-15', amount: 5000, type: 'salary', category: 'Employment' },
];

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                              */
/* -------------------------------------------------------------------------- */

export default function IncomeForecastingTool() {
  // -- Sidebar State --
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // -- Forecast State --
  const [forecastData, setForecastData] = useState({
    baseSalary: 60000,
    salaryIncrease: 0,
    bonus: 0,
    monthsToForecast: 12,
    taxRate: 22,
    deductions: 12000,
    inflationRate: 3,
  });

  // -- Calculation Logic --
  function calculateIncome(data, options = { applyRaise: true, applyInflation: false }) {
    const { baseSalary, salaryIncrease, bonus, taxRate, deductions, inflationRate, monthsToForecast } = data;

    const salary = baseSalary * (options.applyRaise ? 1 + salaryIncrease / 100 : 1);
    const gross = salary + bonus;
    const taxableIncome = Math.max(0, gross - deductions);
    const taxes = taxableIncome * (taxRate / 100);
    let net = gross - taxes;

    if (options.applyInflation) {
      net = net / Math.pow(1 + inflationRate / 100, monthsToForecast / 12);
    }

    return {
      salary: Math.round(salary),
      bonus,
      gross: Math.round(gross),
      taxes: Math.round(taxes),
      net: Math.round(net),
    };
  }

  const baselineBreakdown = calculateIncome(forecastData, { applyRaise: false, applyInflation: false });
  const projectedBreakdown = calculateIncome(forecastData, { applyRaise: true, applyInflation: true });

  const baseline = baselineBreakdown.net;
  const projected = projectedBreakdown.net;

  const navLinks = [ "Dashboard", "Transactions", "Goals", "Connections", "Users", "Social", "Profile", "Wrapped" ];

  return (
    <TransactionContext.Provider value={{ transactions: mockTransactions, forecastData, setForecastData }}>
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-['Lexend_Deca'] transition-colors duration-200">

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
                  ${link === 'Income Forecast' 
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
          <div className="max-w-6xl mx-auto">
            <Header baseline={baseline} projected={projected} />
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Inputs */}
              <div className="lg:col-span-5 space-y-6">
                <InputSections />
              </div>

              {/* Right Column: Charts & Results */}
              <div className="lg:col-span-7 space-y-6">
                <ResultsSection 
                  baseline={baseline} 
                  projected={projected} 
                  baselineBreakdown={baselineBreakdown} 
                  projectedBreakdown={projectedBreakdown}
                />
              </div>
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
    </TransactionContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/* SUB-COMPONENTS                              */
/* -------------------------------------------------------------------------- */

function Header({ baseline, projected }) {
  const difference = projected - baseline;
  const percentChange = baseline > 0 ? ((difference / baseline) * 100).toFixed(1) : 0;
  const isPositive = difference >= 0;

  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
        <TrendingUp className="text-[#06D6A0]" /> Income Forecast
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">Plan your financial future with real-time projections.</p>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Baseline Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Current Income</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            ${baseline.toLocaleString()}
          </p>
        </div>

        {/* Projected Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 border-l-4 border-l-[#06D6A0]">
          <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Projected Income</p>
          <p className="text-2xl font-bold text-[#06D6A0] mt-1">
            ${projected.toLocaleString()}
          </p>
        </div>

        {/* Difference Card */}
        <div className={`p-6 rounded-2xl shadow-sm border ${
          isPositive 
            ? "bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-800" 
            : "bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800"
        }`}>
          <p className={`text-sm uppercase tracking-wider font-medium ${isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            Net Change
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-2xl font-bold ${isPositive ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
              {isPositive ? "+" : ""}{difference.toLocaleString()}
            </span>
            <span className={`text-sm font-semibold ${isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              ({percentChange}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function InputSections() {
  const [openSection, setOpenSection] = useState('employment');

  const sections = [
    { id: 'employment', title: 'Employment & Salary', icon: <Briefcase className="w-5 h-5" /> },
    { id: 'tax', title: 'Tax & Deductions', icon: <PieChart className="w-5 h-5" /> },
    { id: 'economic', title: 'Economic Factors', icon: <TrendingUp className="w-5 h-5" /> },
  ];

  return (
    <div className="flex flex-col gap-4">
      {sections.map(section => (
        <AccordionCard
          key={section.id}
          id={section.id}
          title={section.title}
          icon={section.icon}
          isOpen={openSection === section.id}
          onToggle={() => setOpenSection(openSection === section.id ? null : section.id)}
        />
      ))}
    </div>
  );
}

function AccordionCard({ id, title, icon, isOpen, onToggle }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-300 ${isOpen ? 'ring-2 ring-[#06D6A0] dark:ring-[#06D6A0]' : ''}`}>
      <button 
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition"
      >
        <div className="flex items-center gap-3 text-gray-800 dark:text-white font-semibold">
          <div className={`p-2 rounded-lg ${isOpen ? "bg-[#06D6A0] text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300"}`}>
            {icon}
          </div>
          {title}
        </div>
        {isOpen ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
      </button>

      {isOpen && (
        <div className="p-5 pt-0 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
          <InputGroup sectionId={id} />
        </div>
      )}
    </div>
  );
}

function InputGroup({ sectionId }) {
  const { forecastData, setForecastData } = useContext(TransactionContext);

  const updateField = (field, value) => {
    setForecastData(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  const resetSection = () => {
    const defaults = {
        baseSalary: 60000, salaryIncrease: 0, bonus: 0,
        taxRate: 22, deductions: 12000,
        inflationRate: 3
    };
    
    if(sectionId === 'employment') setForecastData(p => ({...p, baseSalary: defaults.baseSalary, salaryIncrease: defaults.salaryIncrease, bonus: defaults.bonus}));
    if(sectionId === 'tax') setForecastData(p => ({...p, taxRate: defaults.taxRate, deductions: defaults.deductions}));
    if(sectionId === 'economic') setForecastData(p => ({...p, inflationRate: defaults.inflationRate}));
  };

  const ResetBtn = () => (
    <button 
      onClick={resetSection}
      className="mt-4 flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-red-500 transition"
    >
      <RefreshCw size={12} /> Reset to Defaults
    </button>
  );

  switch (sectionId) {
    case 'employment':
      return (
        <div className="space-y-6 mt-4">
          <InputField label="Base Annual Salary" value={forecastData.baseSalary} onChange={(v) => updateField('baseSalary', v)} min={0} max={500000} step={1000} prefix="$" />
          <InputField label="Expected Salary Increase" value={forecastData.salaryIncrease} onChange={(v) => updateField('salaryIncrease', v)} min={-50} max={100} step={0.5} suffix="%" />
          <InputField label="Annual Bonus" value={forecastData.bonus} onChange={(v) => updateField('bonus', v)} min={0} max={100000} step={500} prefix="$" />
          <ResetBtn />
        </div>
      );
    case 'tax':
      return (
        <div className="space-y-6 mt-4">
          <InputField label="Effective Tax Rate" value={forecastData.taxRate} onChange={(v) => updateField('taxRate', v)} min={0} max={50} step={0.5} suffix="%" />
          <InputField label="Annual Deductions" value={forecastData.deductions} onChange={(v) => updateField('deductions', v)} min={0} max={50000} step={500} prefix="$" />
          <ResetBtn />
        </div>
      );
    case 'economic':
      return (
        <div className="space-y-6 mt-4">
          <InputField label="Inflation Rate" value={forecastData.inflationRate} onChange={(v) => updateField('inflationRate', v)} min={0} max={20} step={0.1} suffix="%" />
          <ResetBtn />
        </div>
      );
    default: return null;
  }
}

function InputField({ label, value, onChange, min, max, step, prefix = '', suffix = '' }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <span className="text-xs font-bold text-[#06D6A0] bg-[#06D6A0]/10 px-2 py-1 rounded">
          {prefix}{value.toLocaleString()}{suffix}
        </span>
      </div>
      <div className="flex gap-4 items-center">
        <input
          type="range"
          min={min} max={max} step={step}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#06D6A0]"
        />
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-24 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-[#06D6A0]"
        />
      </div>
    </div>
  );
}

function ResultsSection({ baseline, projected, baselineBreakdown, projectedBreakdown }) {
  const isDark = document.documentElement.classList.contains("dark");

  const chartData = {
    labels: ['Base Salary', 'Gross (w/ Bonus)', 'Net Income'],
    datasets: [
      {
        label: 'Current Scenario',
        data: [baselineBreakdown.salary, baselineBreakdown.gross, baselineBreakdown.net],
        backgroundColor: 'rgba(107, 114, 128, 0.5)', // Gray
        borderRadius: 4,
      },
      {
        label: 'Projected Scenario',
        data: [projectedBreakdown.salary, projectedBreakdown.gross, projectedBreakdown.net],
        backgroundColor: '#06D6A0', // Teal
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: isDark ? '#fff' : '#000' } },
      tooltip: { backgroundColor: isDark ? '#374151' : '#fff', titleColor: isDark ? '#fff' : '#000', bodyColor: isDark ? '#fff' : '#000', borderColor: isDark ? '#4B5563' : '#E5E7EB', borderWidth: 1 }
    },
    scales: {
      y: { ticks: { color: isDark ? '#9CA3AF' : '#4B5563' }, grid: { color: isDark ? '#374151' : '#E5E7EB' } },
      x: { ticks: { color: isDark ? '#9CA3AF' : '#4B5563' }, grid: { display: false } }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-full flex flex-col">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Financial Impact Analysis</h3>
      
      <div className="flex-1 min-h-[300px]">
        <Bar data={chartData} options={options} />
      </div>

      <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
        <MetricBox label="Projected Gross" value={projectedBreakdown.gross} />
        <MetricBox label="Projected Net" value={projectedBreakdown.net} highlight />
        <MetricBox label="Total Taxes" value={projectedBreakdown.taxes} isExpense />
        <MetricBox label="Monthly Take-Home" value={Math.round(projectedBreakdown.net / 12)} />
      </div>
    </div>
  );
}

// FIXED METRIC BOX COMPONENT
function MetricBox({ label, value, highlight, isExpense }) {
  return (
    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 dark:bg-gray-700 dark:border-gray-600 transition-colors">
      <p className="text-xs text-gray-500 dark:text-gray-300 uppercase font-bold tracking-wider">{label}</p>
      <p className={`text-lg font-bold mt-1 ${
        highlight ? "text-[#06D6A0]" : isExpense ? "text-red-500" : "text-gray-900 dark:text-white"
      }`}>
        ${value.toLocaleString()}
      </p>
    </div>
  );
}