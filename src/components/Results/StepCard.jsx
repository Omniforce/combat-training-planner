import { formatTime, formatNumber, formatPercent, capitalize } from '../../utils/format.js';
import GearLoadout from './GearLoadout.jsx';

const SKILL_COLORS = {
  attack: 'var(--skill-attack)',
  strength: 'var(--skill-strength)',
  defence: 'var(--skill-defence)',
};

export default function StepCard({ step, index }) {
  return (
    <div className="step-card">
      <div className="step-header">
        <span className="step-number">Step {index + 1}</span>
        <span className="step-skill" style={{ color: SKILL_COLORS[step.skill] }}>
          {capitalize(step.skill)}
        </span>
        <span className="step-levels">
          {step.fromLevel} &rarr; {step.toLevel}
        </span>
        <span className="step-time">{formatTime(step.hours)}</span>
      </div>
      <div className="step-details">
        <div className="step-info">
          <div className="step-row">
            <span className="detail-label">Weapon:</span>
            <span>{step.weapon}</span>
          </div>
          <div className="step-row">
            <span className="detail-label">Style:</span>
            <span>{step.style} ({capitalize(step.stance)})</span>
          </div>
          <div className="step-row">
            <span className="detail-label">Monster:</span>
            <span>{step.monster}</span>
          </div>
          <div className="step-row">
            <span className="detail-label">XP/hr:</span>
            <span>{formatNumber(step.xpPerHour)}</span>
          </div>
          <div className="step-row">
            <span className="detail-label">Max Hit:</span>
            <span>{step.maxHit}</span>
          </div>
          <div className="step-row">
            <span className="detail-label">Accuracy:</span>
            <span>{formatPercent(step.accuracy)}</span>
          </div>
          <div className="step-row">
            <span className="detail-label">XP needed:</span>
            <span>{formatNumber(step.xpNeeded)}</span>
          </div>
        </div>
        <GearLoadout gear={step.gear} />
      </div>
    </div>
  );
}
