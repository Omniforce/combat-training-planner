export default function SkillRow({
  skill,
  label,
  color,
  current,
  goal,
  onCurrentChange,
  onGoalChange,
}) {
  const clamp = (val) => {
    const n = parseInt(val);
    if (isNaN(n)) return "";
    return Math.min(99, Math.max(1, n));
  };

  return (
    <div className="skill-row">
      <span className="skill-label" style={{ color }}>
        {label}
      </span>
      <div className="skill-inputs">
        <label className="skill-input-group">
          <span className="input-label">Current</span>
          <input
            type="number"
            min="1"
            max="99"
            value={current}
            onChange={(e) =>
              onCurrentChange(
                skill,
                e.target.value === "" ? "" : clamp(e.target.value),
              )
            }
            onBlur={(e) => {
              if (e.target.value === "" || parseInt(e.target.value) < 1) {
                onCurrentChange(skill, 1);
              }
            }}
          />
        </label>
        <span className="skill-arrow">&rarr;</span>
        <label className="skill-input-group">
          <span className="input-label">Goal</span>
          <input
            type="number"
            min="1"
            max="99"
            value={goal}
            onChange={(e) =>
              onGoalChange(
                skill,
                e.target.value === "" ? "" : clamp(e.target.value),
              )
            }
            onBlur={(e) => {
              if (e.target.value === "" || parseInt(e.target.value) < 1) {
                onGoalChange(skill, 99);
              }
            }}
          />
        </label>
      </div>
    </div>
  );
}
