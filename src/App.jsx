import { useState, useCallback, useMemo } from "react";
import Header from "./components/Header/Header.jsx";
import StatsInput from "./components/StatsInput/StatsInput.jsx";
import EquipmentSelect from "./components/EquipmentSelect/EquipmentSelect.jsx";
import Results from "./components/Results/Results.jsx";
import { useUrlState, getInitialStateFromUrl } from "./hooks/useUrlState.js";
import { optimize } from "./engine/optimizer.js";
import "./App.css";

const initialState = getInitialStateFromUrl();

function App() {
  const [currentLevels, setCurrentLevels] = useState(
    initialState.currentLevels,
  );
  const [goalLevels, setGoalLevels] = useState(initialState.goalLevels);
  const [selectedEquipment, setSelectedEquipment] = useState(
    () => new Set(initialState.equipment),
  );
  const [result, setResult] = useState(null);
  const [calculating, setCalculating] = useState(false);

  const equipmentArray = useMemo(
    () => [...selectedEquipment],
    [selectedEquipment],
  );

  useUrlState({
    currentLevels,
    goalLevels,
    equipment: equipmentArray,
  });

  const handleCurrentChange = useCallback((skill, value) => {
    setCurrentLevels((prev) => ({ ...prev, [skill]: value }));
  }, []);

  const handleGoalChange = useCallback((skill, value) => {
    setGoalLevels((prev) => ({ ...prev, [skill]: value }));
  }, []);

  const handleToggleEquipment = useCallback((name) => {
    setSelectedEquipment((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const handleImportLevels = useCallback((levels) => {
    setCurrentLevels({
      attack: levels.attack,
      strength: levels.strength,
      defence: levels.defence,
    });
  }, []);

  const handleCalculate = useCallback(() => {
    // Validate inputs
    const cLevels = {
      attack: Math.max(1, Math.min(99, parseInt(currentLevels.attack) || 1)),
      strength: Math.max(
        1,
        Math.min(99, parseInt(currentLevels.strength) || 1),
      ),
      defence: Math.max(1, Math.min(99, parseInt(currentLevels.defence) || 1)),
    };
    const gLevels = {
      attack: Math.max(1, Math.min(99, parseInt(goalLevels.attack) || 99)),
      strength: Math.max(1, Math.min(99, parseInt(goalLevels.strength) || 99)),
      defence: Math.max(1, Math.min(99, parseInt(goalLevels.defence) || 99)),
    };

    // Ensure goals >= current
    gLevels.attack = Math.max(gLevels.attack, cLevels.attack);
    gLevels.strength = Math.max(gLevels.strength, cLevels.strength);
    gLevels.defence = Math.max(gLevels.defence, cLevels.defence);

    if (selectedEquipment.size === 0) {
      setResult({
        error:
          "Please select at least one piece of equipment (including a weapon).",
        steps: [],
      });
      return;
    }

    setCalculating(true);

    // Use setTimeout to let the UI update before the expensive calculation
    setTimeout(() => {
      const optimizationResult = optimize({
        currentLevels: cLevels,
        goalLevels: gLevels,
        availableEquipment: equipmentArray,
      });
      setResult(optimizationResult);
      setCalculating(false);
    }, 10);
  }, [currentLevels, goalLevels, equipmentArray, selectedEquipment.size]);

  const goalsAlreadyMet =
    parseInt(currentLevels.attack) >= parseInt(goalLevels.attack) &&
    parseInt(currentLevels.strength) >= parseInt(goalLevels.strength) &&
    parseInt(currentLevels.defence) >= parseInt(goalLevels.defence);

  return (
    <>
      <Header />
      <div className="app-layout">
        <div className="app-inputs">
          <StatsInput
            currentLevels={currentLevels}
            goalLevels={goalLevels}
            onCurrentChange={handleCurrentChange}
            onGoalChange={handleGoalChange}
            onImportLevels={handleImportLevels}
          />
          <EquipmentSelect
            selectedEquipment={selectedEquipment}
            onToggle={handleToggleEquipment}
          />
        </div>
        <div className="app-results">
          <Results
            result={result}
            onCalculate={handleCalculate}
            calculating={calculating}
            disabled={goalsAlreadyMet}
          />
        </div>
      </div>
    </>
  );
}

export default App;
