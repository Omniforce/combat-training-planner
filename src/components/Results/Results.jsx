import Summary from './Summary.jsx';
import StepCard from './StepCard.jsx';
import './Results.css';

export default function Results({ result }) {
  if (!result) return null;

  if (result.error) {
    return (
      <div className="section-card">
        <h2>Results</h2>
        <p className="results-error">{result.error}</p>
      </div>
    );
  }

  if (result.steps.length === 0) {
    return (
      <div className="section-card">
        <h2>Results</h2>
        <p className="results-done">Your goals are already met!</p>
      </div>
    );
  }

  return (
    <div className="section-card">
      <h2>Optimal Training Path</h2>
      <Summary result={result} />
      <div className="steps-list">
        {result.steps.map((step, i) => (
          <StepCard key={i} step={step} index={i} />
        ))}
      </div>
    </div>
  );
}
