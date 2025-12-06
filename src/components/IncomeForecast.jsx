import React, { createContext, useContext, useState } from 'react'; // Import React and useful hooks from the React library
import styles from '../styles/Forecast.module.css'; // Import CSS module for styling

// ============================================================================
// CONTEXT SETUP
// ============================================================================
const TransactionContext = createContext(); // Creates context to share transaction data between components

// Mock Values for testing
const mockTransactions = [
  { id: 1, date: '2025-01-15', amount: 5000, type: 'salary', category: 'Employment' },
  { id: 3, date: '2025-02-15', amount: 5000, type: 'salary', category: 'Employment' },
  { id: 5, date: '2025-03-15', amount: 5000, type: 'salary', category: 'Employment' },
];

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
  // State object that holds all forecasting inputs
export default function IncomeForecastingTool() {
  const [forecastData, setForecastData] = useState({
    baseSalary: 60000,
    salaryIncrease: 0,
    bonus: 0,
    monthsToForecast: 12,

    // Tax
    taxRate: 22,
    deductions: 12000,

    // Economic
    inflationRate: 3,
  });

/* This function calculates projected income based on salary, taxes, inflation,
   bonuses, and optional economic adjustments. It returns a month-by-month
 forecast of net income. */
  function calculateIncome(data, options = { applyRaise: true, applyInflation: false }) {
    const {
      baseSalary,
      salaryIncrease,
      bonus,
      taxRate,
      deductions,
      inflationRate,
      monthsToForecast,
    } = data;

     // Calculate adjusted salary.
     // If applyRaise = true, salaryIncrease% is applied; otherwise use base salary.
    const salary = baseSalary * (options.applyRaise ? 1 + salaryIncrease / 100 : 1);

    // Total annual income before taxes (salary + bonus)
    const gross = salary + bonus;

    // Amount of income that will be taxed after deductions.
    // Math.max ensures taxable income cannot go below 0.
    const taxableIncome = Math.max(0, gross - deductions);

    // Total annual taxes owed based on taxable income and tax rate.
    const taxes = taxableIncome * (taxRate / 100);
    let net = gross - taxes;

    // Adjust net amount for inflation over the forecast period (if enabled)
    if (options.applyInflation) {
      net = net / Math.pow(1 + inflationRate / 100, monthsToForecast / 12);
    }

    return {
      salary: Math.round(salary),
      bonus,
      gross: Math.round(gross),
      taxes: Math.round(taxes),
      net: Math.round(net), // Return inflation-adjusted and rounded net amount
    };
  }

  // Baseline income (no raises or inflation)
  const baselineBreakdown = calculateIncome(forecastData, { applyRaise: false, applyInflation: false });

  // Projected income (with raises and inflation)
  const projectedBreakdown = calculateIncome(forecastData, { applyRaise: true, applyInflation: true });

  // Net incomes
  const baseline = baselineBreakdown.net;
  const projected = projectedBreakdown.net;

  // Provide transaction and forecast context to child components
  return (
    <TransactionContext.Provider value={{ transactions: mockTransactions, forecastData, setForecastData }}>
      <div className={styles.forecastContainer}>
        <Header baseline={baseline} projected={projected} />
        <InputSections />
        <ResultsSection
          baseline={baseline}
          projected={projected}
          baselineBreakdown={baselineBreakdown}
          projectedBreakdown={projectedBreakdown}
        />
      </div>
    </TransactionContext.Provider>
  );
}

// ============================================================================
// HEADER COMPONENT
// ============================================================================
function Header({ baseline, projected }) {
   // Calculate difference and percent change between baseline and projected
  const difference = projected - baseline;
  const percentChange = baseline > 0 ? ((difference / baseline) * 100).toFixed(1) : 0;
  const isPositive = difference >= 0;

  return (
    /* Logo linking to dashboard */
    <header className={styles.header}>
      <div className="logo"> <img src="./FundFlowLogo2.png" href="/dashboard" width={"10%rem"} height={"50%em"}></img></div>
      <div className={styles.headerContent}>

      {/* Title and subtitle */}
        <h1 className={styles.title}>Income Forecasting Tool</h1>
        <p className={styles.subtitle}>Plan your financial future with data-driven projections</p>
      </div>
      {/* Summary panel showing baseline, projected, and change */} 
      <div className={styles.summaryPanel}>

        {/* Baseline income card */}
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Baseline Income</span>
          <span className={styles.summaryValue}>${baseline.toLocaleString()}</span>
        </div>

        <div className={styles.summaryDivider}>→</div>

         {/* Projected income card */}
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Projected Income</span>
          <span className={styles.summaryValue}>${projected.toLocaleString()}</span>
        </div>

        {/* Change card with conditional styling */}
        <div className={`${styles.summaryCard} ${isPositive ? styles.positive : styles.negative}`}>
          <span className={styles.summaryLabel}>Change</span>
          <span className={styles.summaryValue}>
            {isPositive ? '+' : ''}{difference.toLocaleString()}
            <span className={styles.summaryPercent}>({isPositive ? '+' : ''}{percentChange}%)</span>
          </span>
        </div>
      </div>
    </header>
  );
}

// ============================================================================
// INPUT SECTIONS
// ============================================================================
function InputSections() {
  // Track which section is currently open
  const [openSection, setOpenSection] = useState('employment');

  // Defines all input sections
  const sections = [
    { id: 'employment', title: 'Employment & Salary', icon: '💼' },
    { id: 'tax', title: 'Tax & Deductions', icon: '📊' },
    { id: 'economic', title: 'Economic Factors', icon: '📈' },
  ];

  // Renders a list of accordion sections. Only one section can be open at a time.
  // When a section header is clicked, it toggles open/closed using openSection state.
  return (
    <div className={styles.inputSections}>
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

// ============================================================================
// ACCORDION CARD
// ============================================================================

// AccordionCard: A single accordion item.
// Shows a header with icon + title. Clicking toggles it open/closed.
// When open, it renders the InputGroup for that section.
function AccordionCard({ id, title, icon, isOpen, onToggle }) {
  return (
    <div className={`${styles.accordionCard} ${isOpen ? styles.open : ''}`}>
      <button className={styles.accordionHeader} onClick={onToggle}>
        <span className={styles.accordionIcon}>{icon}</span>
        <span className={styles.accordionTitle}>{title}</span>
        <span className={styles.accordionArrow}>{isOpen ? '▼' : '▶'}</span>
      </button>

      {isOpen && (
        <div className={styles.accordionContent}>
          <InputGroup sectionId={id} />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// INPUT GROUP (CLEANED)
// ============================================================================

// InputGroup: Renders the inputs for a specific accordion section.
// Uses sectionId ("employment", "tax", "economic") to decide which fields to show.
// Each input updates the shared forecastData state in TransactionContext.
// Includes a Reset button that restores default values for that section.
function InputGroup({ sectionId }) {
  const { forecastData, setForecastData } = useContext(TransactionContext);

  const updateField = (field, value) => {
    setForecastData(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  const resetSection = () => {
    switch (sectionId) {
      case 'employment':
        setForecastData(prev => ({
          ...prev,
          baseSalary: 60000,
          salaryIncrease: 0,
          bonus: 0,
        }));
        break;

      case 'tax':
        setForecastData(prev => ({
          ...prev,
          taxRate: 22,
          deductions: 12000,
        }));
        break;

      case 'economic':
        setForecastData(prev => ({
          ...prev,
          inflationRate: 3,
        }));
        break;

      default:
        break;
    }
  };

  // Reset to default values
  const resetButton = (
    <button
      style={{
        borderRadius: '10px',
        fontWeight: 600,
        fontSize: '1rem',
        cursor: 'pointer',
        border: 'none',
        background: '#374151',
        color: 'white',
        padding: '0.5rem 1rem',
        marginTop: '1rem',
      }}
      onClick={resetSection}
    >
      Reset Section
    </button>
  );

// Render input fields based on the section ID.
// Each section groups related financial settings for the forecast.
  switch (sectionId) {
     // Employment-related inputs: salary and expected raise
    case 'employment':
      return (
        <>
        {/* Current annual salary before any adjustments */}
          <InputField
            label="Base Annual Salary"
            value={forecastData.baseSalary}
            onChange={(v) => updateField('baseSalary', v)}
            min={0} max={500000} step={1000} prefix="$"
            tooltip="Your current annual salary before any raises"
          />
          {/* Current Expected salary after any adjustments */}
          <InputField
            label="Expected Salary Increase"
            value={forecastData.salaryIncrease}
            onChange={(v) => updateField('salaryIncrease', v)}
            min={-50} max={100} step={0.5} suffix="%"
            tooltip="Projected percentage increase"
          />
          {resetButton}
        </>
      );

        // Tax-related inputs: effective rate and deductions
    case 'tax':
      return (
        <>
          {/* Total tax burden as a percentage */}
          <InputField
            label="Effective Tax Rate"
            value={forecastData.taxRate}
            onChange={(v) => updateField('taxRate', v)}
            min={0} max={50} step={0.5} suffix="%"
            tooltip="Overall tax percentage"
          />

          {/* Annual deductions (standard or itemized) */}
          <InputField
            label="Annual Deductions"
            value={forecastData.deductions}
            onChange={(v) => updateField('deductions', v)}
            min={0} max={50000} step={500} prefix="$"
            tooltip="Standard or itemized deductions"
          />
          {resetButton}
        </>
      );

      // Economic assumptions: inflation only (for now)
    case 'economic':
      return (
        <>
         {/* Expected yearly inflation rate applied to projections */}
          <InputField
            label="Inflation Rate"
            value={forecastData.inflationRate}
            onChange={(v) => updateField('inflationRate', v)}
            min={0} max={20} step={0.1} suffix="%"
            tooltip="Expected annual inflation"
          />
          {resetButton}
        </>
      );

    default:
      return null;
  }
}

// ============================================================================
// INPUT FIELD
// ============================================================================
// Generic input component that pairs a slider with a numeric input.
// Supports optional prefix/suffix symbols and an on-hover tooltip.
function InputField({ label, value, onChange, min, max, step, prefix = '', suffix = '', tooltip }) {
  // Local UI state for showing/hiding the tooltip
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className={styles.inputField}>

      {/* Label row with tooltip trigger */}
      <div className={styles.inputLabelRow}>
        <label className={styles.inputLabel}>{label}</label>

        {/* Tooltip icon; visibility controlled by hover */}
        <button
          className={styles.tooltipTrigger}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          ℹ️
        </button>

        {/* Tooltip content */}
        {showTooltip && <div className={styles.tooltip}>{tooltip}</div>}
      </div>

      {/* Slider + numeric field pair */}
      <div className={styles.inputRow}>

        {/* Range slider for quick adjustments */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={styles.slider}
        />

        {/* Numeric field showing the exact value */}
        <div className={styles.inputValue}>
          {prefix}

          <input
            type="number"
            value={value}
            onChange={e => onChange(e.target.value)}
            min={min}
            max={max}
            step={step}
            className={styles.numberInput}
          />

          {suffix}
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// RESULTS SECTION
// ============================================================================
// Displays the full results view: comparison chart, financial breakdown,
// and a summary of how projected income differs from the baseline.
function ResultsSection({ baseline, projected }) {
  const { forecastData } = useContext(TransactionContext);

  // Difference between current and projected income
  const difference = projected - baseline;
  const isPositive = difference >= 0;

  // Calculate detailed breakdown (gross, taxes, net, etc.)
  const breakdown = calculateBreakdown(forecastData);

  return (
    <div className={styles.resultsSection}>
      <h2 className={styles.resultsTitle}>Forecast Results</h2>

      {/* Layout grid containing chart + detailed financial metrics */}
      <div className={styles.resultsGrid}>

        {/* Comparison card showing baseline vs projected income */}
        <div className={styles.resultCard}>
          <h3 className={styles.cardTitle}>Income Comparison</h3>
          <ComparisonChart baseline={baseline} projected={projected} />
        </div>

        {/* Full-width card for detailed financial breakdown */}
        <div className={`${styles.resultCard} ${styles.fullWidth}`}>
          <h3 className={styles.cardTitle}>Detailed Breakdown</h3>

          {/* Key financial metrics derived from forecast */}
          <div className={styles.metricsGrid}>
            <Metric label="Gross Annual Income" value={breakdown.gross} />
            <Metric label="Total Taxes" value={breakdown.taxes} negative />
            <Metric label="Net Income" value={breakdown.net} />
            <Metric label="Monthly Take-Home" value={Math.round(breakdown.net / 12)} />
          </div>
        </div>
      </div>

      {/* Summary indicator highlighting how projected income changes */}
      <div className={`${styles.changeIndicator} ${isPositive ? styles.positive : styles.negative}`}>
        <span className={styles.changeIcon}>{isPositive ? '↑' : '↓'}</span>
        <span className={styles.changeText}>
          Your projected income is <strong>${Math.abs(difference).toLocaleString()}</strong>
          {isPositive ? ' higher' : ' lower'} than baseline
        </span>
      </div>
    </div>
  );
}


// ============================================================================
// BREAKDOWN CALC (SIMPLIFIED)
// ============================================================================
// Calculates salary, tax, and net income breakdown from forecast data
function calculateBreakdown(data) {
  // Pull the needed fields from the data object
  const { baseSalary, salaryIncrease, bonus, taxRate, deductions } = data;

  // Apply salary increase percentage to base salary
  const salary = baseSalary * (1 + salaryIncrease / 100);

  // Total before taxes or deductions
  const gross = salary + bonus;

  // Income subject to tax (never below zero)
  const taxableIncome = Math.max(0, gross - deductions);

  // Taxes owed based on tax rate
  const taxes = taxableIncome * (taxRate / 100);

  // Final take-home pay
  const net = gross - taxes;

  // Return rounded values for display
  return {
    salary: Math.round(salary),
    bonus,
    gross: Math.round(gross),
    taxes: Math.round(taxes),
    net: Math.round(net),
  };
}


// ============================================================================
// CHARTS + METRICS (UNCHANGED)
// ============================================================================
// ComparisonChart component: displays two vertical bars (Baseline vs Projected) with height scaled relative to the larger value
function ComparisonChart({ baseline, projected }) {
  // Determine the maximum value to scale both bars proportionally
  const maxValue = Math.max(baseline, projected);
  
  // Scale function: converts a value into a percentage height for the bar using square root scaling
  const scale = (v) => Math.sqrt(v / maxValue) * 400;

  return (
    <div className={styles.chartContainer}>
      <div className={styles.barChart}>
        {/* Baseline Bar */}
        <div className={styles.barGroup}>
          <div className={styles.barLabel}>Baseline</div>
          <div className={styles.barWrapper}>
            <div 
              className={`${styles.bar} ${styles.baselineBar}`} 
              style={{ height: `${scale(baseline)}%` }}
            >
              {/* Display the numeric value on the bar */}
              <span className={styles.barValue}>${baseline.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Projected Bar */}
        <div className={styles.barGroup}>
          <div className={styles.barLabel}>Projected</div>
          <div className={styles.barWrapper}>
            <div 
              className={`${styles.bar} ${styles.projectedBar}`} 
              style={{ height: `${scale(projected)}%` }}
            >
              <span className={styles.barValue}>${projected.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// BreakdownChart component: displays a horizontal stacked bar showing the split between salary and bonus
function BreakdownChart({ breakdown }) {
  // Calculate total for percentage calculations
  const total = breakdown.salary + breakdown.bonus;
  const salaryPercent = (breakdown.salary / total) * 100;
  const bonusPercent = (breakdown.bonus / total) * 100;

  return (
    <div className={styles.breakdownChart}>
      {/* Stacked bar visualization */}
      <div className={styles.stackedBar}>
        {/* Salary portion */}
        <div
          className={`${styles.stackSegment} ${styles.salarySegment}`}
          style={{ width: `${salaryPercent}%` }}
        />
        {/* Bonus portion, only if bonus > 0 */}
        {breakdown.bonus > 0 && (
          <div
            className={`${styles.stackSegment} ${styles.bonusSegment}`}
            style={{ width: `${bonusPercent}%` }}
          />
        )}
      </div>

      {/* Legend explaining color-coded segments */}
      <div className={styles.breakdownLegend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendColor} ${styles.salaryColor}`} />
          <span>Salary: ${breakdown.salary.toLocaleString()}</span>
        </div>
        {breakdown.bonus > 0 && (
          <div className={styles.legendItem}>
            <span className={`${styles.legendColor} ${styles.bonusColor}`} />
            <span>Bonus: ${breakdown.bonus.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Metric component: displays a single labeled metric, optionally marking negative values
function Metric({ label, value, negative = false }) {
  return (
    <div className={styles.metric}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={`${styles.metricValue} ${negative ? styles.negativeValue : ''}`}>
        {/* Prefix '-' if negative */}
        {negative && '-'}${value.toLocaleString()}
      </span>
    </div>
  );
}
