import './CalculateButton.css';

export default function CalculateButton({ onClick, disabled, calculating }) {
  return (
    <div className="calculate-wrapper">
      <button
        className="calculate-btn"
        onClick={onClick}
        disabled={disabled || calculating}
      >
        {calculating ? 'Calculating...' : 'Calculate Optimal Path'}
      </button>
    </div>
  );
}
