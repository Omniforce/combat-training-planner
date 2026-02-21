import { formatTime, formatNumber } from "../../utils/format.js";

export default function Summary({ result }) {
  const { totalHours, totalXp, steps } = result;

  return (
    <div className="summary">
      <div className="summary-stat">
        <span className="summary-value">{formatTime(totalHours)}</span>
        <span className="summary-label">Total Time</span>
      </div>
      <div className="summary-stat">
        <span className="summary-value">{steps.length}</span>
        <span className="summary-label">Steps</span>
      </div>
      <div className="summary-stat">
        <span className="summary-value summary-atk">
          {formatNumber(totalXp.attack)}
        </span>
        <span className="summary-label">Attack XP</span>
      </div>
      <div className="summary-stat">
        <span className="summary-value summary-str">
          {formatNumber(totalXp.strength)}
        </span>
        <span className="summary-label">Strength XP</span>
      </div>
      <div className="summary-stat">
        <span className="summary-value summary-def">
          {formatNumber(totalXp.defence)}
        </span>
        <span className="summary-label">Defence XP</span>
      </div>
    </div>
  );
}
