import Summary from "./Summary.jsx";
import StepCard from "./StepCard.jsx";
import "./Results.css";

export default function Results({
  result,
  onCalculate,
  calculating,
  disabled,
}) {
  if (!result) {
    return (
      <div className="section-card results-empty">
        <p className="results-empty-text">
          Set your combat levels and equipment, then calculate to find the
          optimal training path.
        </p>
        <button
          className="calculate-btn"
          onClick={onCalculate}
          disabled={disabled || calculating}
        >
          {calculating ? "Calculating..." : "Calculate Optimal Path"}
        </button>
      </div>
    );
  }

  const recalculateBtn = (
    <button
      className="recalculate-btn"
      onClick={onCalculate}
      disabled={calculating}
    >
      {calculating ? "Calculating..." : "Recalculate"}
    </button>
  );

  if (result.error) {
    return (
      <div className="section-card">
        <h2>Results</h2>
        <p className="results-error">{result.error}</p>
        {recalculateBtn}
      </div>
    );
  }

  if (result.steps.length === 0) {
    return (
      <div className="section-card">
        <h2>Results</h2>
        <p className="results-done">Your goals are already met!</p>
        {recalculateBtn}
      </div>
    );
  }

  return (
    <div className="section-card">
      <div className="results-header">
        <h2>Optimal Training Path</h2>
        {recalculateBtn}
      </div>
      <Summary result={result} />
      <div className="steps-list">
        {result.steps.map((step, i) => (
          <StepCard
            key={i}
            step={step}
            index={i}
            prevStep={i > 0 ? result.steps[i - 1] : null}
          />
        ))}
      </div>
    </div>
  );
}
