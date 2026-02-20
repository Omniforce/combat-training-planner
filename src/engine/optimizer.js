import weapons from '../data/weapons.json';
import monsters from '../data/monsters.json';
import { xpForLevel, levelForXp } from './xp.js';
import { canEquipWeapon, solveBestGear, evaluateSetup } from './gear-solver.js';

const SKILLS = ['attack', 'strength', 'defence'];
const DEFAULT_MONSTER = monsters.find(m => m.name === 'Gemstone Crab') || monsters[0];

/**
 * Find the next milestone level for a skill — either a gear unlock or the goal.
 * This determines optimal "chunk" sizes for training.
 */
function findNextMilestone(skill, currentLevel, goalLevel, availableWeapons) {
  const milestones = new Set();
  milestones.add(goalLevel);

  // Weapon requirement milestones
  for (const weapon of availableWeapons) {
    const reqs = weapon.requirements || {};
    for (const [reqSkill, reqLevel] of Object.entries(reqs)) {
      if (reqSkill === skill && reqLevel > currentLevel && reqLevel <= goalLevel) {
        milestones.add(reqLevel);
      }
    }
  }

  // Common breakpoint levels for gear unlocks
  const gearBreakpoints = [5, 10, 20, 30, 40, 45, 50, 55, 60, 65, 70];
  for (const bp of gearBreakpoints) {
    if (bp > currentLevel && bp <= goalLevel) {
      milestones.add(bp);
    }
  }

  return Math.min(...milestones);
}

/**
 * Find the best weapon, style, gear, and monster for training a given skill.
 */
function findBestSetup(skill, levels, availableEquipment, availableWeapons) {
  let bestResult = null;

  for (const weapon of availableWeapons) {
    if (!canEquipWeapon(weapon, levels)) continue;
    if (!availableEquipment.has(weapon.name)) continue;

    // Find styles that train the target skill
    const validStyles = weapon.styles.filter(s => {
      if (skill === 'attack') return s.skill === 'attack' || s.skill === 'shared';
      if (skill === 'strength') return s.skill === 'strength' || s.skill === 'shared';
      if (skill === 'defence') return s.skill === 'defence' || s.skill === 'shared';
      return false;
    });

    for (const style of validStyles) {
      const monster = DEFAULT_MONSTER;
      const gear = solveBestGear({
        weapon,
        style,
        levels,
        monster,
        availableEquipment,
      });

      const stats = evaluateSetup({
        weapon,
        style,
        gear,
        levels,
        monster,
      });

      // For shared (controlled) styles, XP is split 3 ways
      let effectiveXphr = stats.xpPerHour;
      if (style.skill === 'shared') {
        effectiveXphr = stats.xpPerHour / 3;
      }

      if (!bestResult || effectiveXphr > bestResult.effectiveXphr) {
        bestResult = {
          weapon,
          style,
          gear,
          monster,
          stats,
          effectiveXphr,
          xpPerHour: stats.xpPerHour,
        };
      }
    }
  }

  return bestResult;
}

/**
 * Main optimizer: compute the optimal training path.
 *
 * Greedy approach:
 * 1. At each step, evaluate training each remaining skill to its next milestone.
 * 2. Pick the skill with the highest XP/hr.
 * 3. Record the step, update simulated levels, repeat.
 * 4. Merge consecutive identical steps.
 */
export function optimize({
  currentLevels,
  goalLevels,
  availableEquipment,
}) {
  const equipSet = new Set(availableEquipment);
  const availableWeapons = weapons.filter(w => equipSet.has(w.name));

  if (availableWeapons.length === 0) {
    return { steps: [], error: 'No weapons selected. Please select at least one weapon.' };
  }

  const simLevels = { ...currentLevels };
  const simXp = {
    attack: xpForLevel(simLevels.attack),
    strength: xpForLevel(simLevels.strength),
    defence: xpForLevel(simLevels.defence),
  };

  const steps = [];
  let iterations = 0;
  const MAX_ITERATIONS = 200;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    // Check which skills still need training
    const remainingSkills = SKILLS.filter(s => simLevels[s] < goalLevels[s]);
    if (remainingSkills.length === 0) break;

    // Evaluate each skill
    let bestSkill = null;
    let bestSetup = null;

    for (const skill of remainingSkills) {
      const setup = findBestSetup(skill, simLevels, equipSet, availableWeapons);
      if (!setup) continue;

      if (!bestSetup || setup.effectiveXphr > bestSetup.effectiveXphr) {
        bestSkill = skill;
        bestSetup = setup;
      }
    }

    if (!bestSkill || !bestSetup) {
      return {
        steps,
        error: 'Cannot find any valid training setup. Check your equipment selections.',
      };
    }

    // Determine the milestone
    const milestone = findNextMilestone(bestSkill, simLevels[bestSkill], goalLevels[bestSkill], availableWeapons);
    const xpNeeded = xpForLevel(milestone) - simXp[bestSkill];
    const hoursNeeded = xpNeeded / bestSetup.effectiveXphr;

    // Record this step
    const step = {
      skill: bestSkill,
      fromLevel: simLevels[bestSkill],
      toLevel: milestone,
      xpNeeded,
      xpPerHour: bestSetup.effectiveXphr,
      totalXpPerHour: bestSetup.xpPerHour,
      hours: hoursNeeded,
      weapon: bestSetup.weapon.name,
      style: bestSetup.style.name,
      stance: bestSetup.style.stance,
      monster: bestSetup.monster.name,
      gear: formatGear(bestSetup.gear),
      maxHit: bestSetup.stats.maxHit,
      accuracy: bestSetup.stats.accuracy,
      dps: bestSetup.stats.dps,
    };

    steps.push(step);

    // Update simulated state
    if (bestSetup.style.skill === 'shared') {
      // Controlled: split XP evenly among atk/str/def
      const totalXp = xpNeeded * 3; // need xpNeeded in the target skill, which is 1/3 of total
      const xpEach = totalXp / 3;
      simXp.attack += xpEach;
      simXp.strength += xpEach;
      simXp.defence += xpEach;
      simLevels.attack = levelForXp(simXp.attack);
      simLevels.strength = levelForXp(simXp.strength);
      simLevels.defence = levelForXp(simXp.defence);
    } else {
      simXp[bestSkill] += xpNeeded;
      simLevels[bestSkill] = levelForXp(simXp[bestSkill]);
    }
  }

  // Merge consecutive identical steps (same weapon/style/monster/skill)
  const mergedSteps = mergeSteps(steps);

  // Calculate totals
  const totalHours = mergedSteps.reduce((sum, s) => sum + s.hours, 0);
  const totalXp = {
    attack: simXp.attack - xpForLevel(currentLevels.attack),
    strength: simXp.strength - xpForLevel(currentLevels.strength),
    defence: simXp.defence - xpForLevel(currentLevels.defence),
  };

  return {
    steps: mergedSteps,
    totalHours,
    totalXp,
    finalLevels: { ...simLevels },
    error: null,
  };
}

function formatGear(gear) {
  const result = {};
  for (const [slot, item] of Object.entries(gear)) {
    result[slot] = item ? item.name : null;
  }
  return result;
}

function mergeSteps(steps) {
  if (steps.length === 0) return [];

  const merged = [{ ...steps[0] }];

  for (let i = 1; i < steps.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = steps[i];

    if (
      prev.skill === curr.skill &&
      prev.weapon === curr.weapon &&
      prev.style === curr.style &&
      prev.monster === curr.monster
    ) {
      prev.toLevel = curr.toLevel;
      prev.xpNeeded += curr.xpNeeded;
      prev.hours += curr.hours;
    } else {
      merged.push({ ...curr });
    }
  }

  return merged;
}
