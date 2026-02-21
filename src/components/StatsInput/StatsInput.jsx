import SkillRow from "./SkillRow.jsx";
import UsernameLookup from "./UsernameLookup.jsx";
import "./StatsInput.css";

const SKILLS = [
  { skill: "attack", label: "Attack", color: "var(--skill-attack)" },
  { skill: "strength", label: "Strength", color: "var(--skill-strength)" },
  { skill: "defence", label: "Defence", color: "var(--skill-defence)" },
];

export default function StatsInput({
  currentLevels,
  goalLevels,
  onCurrentChange,
  onGoalChange,
  onImportLevels,
}) {
  return (
    <div className="section-card">
      <h2>Combat Levels</h2>
      <UsernameLookup onImport={onImportLevels} />
      <div className="skills-grid">
        {SKILLS.map(({ skill, label, color }) => (
          <SkillRow
            key={skill}
            skill={skill}
            label={label}
            color={color}
            current={currentLevels[skill]}
            goal={goalLevels[skill]}
            onCurrentChange={onCurrentChange}
            onGoalChange={onGoalChange}
          />
        ))}
      </div>
    </div>
  );
}
