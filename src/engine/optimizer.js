import weapons from '../data/weapons.json';
import monsters from '../data/monsters.json';
import { xpForLevel, levelForXp } from './xp.js';
import { canEquipWeapon, solveBestGear, evaluateSetup } from './gear-solver.js';

const SKILLS = ['attack', 'strength', 'defence'];
const DEFAULT_MONSTER = monsters.find(m => m.name === 'Gemstone Crab') || monsters[0];

/**
 * Find the best weapon + style + gear for training a given skill at current levels.
 * Returns the setup with highest effective XP/hr for that skill.
 */
function findBestSetup(skill, levels, equipSet, availableWeapons) {
  let bestResult = null;

  for (const weapon of availableWeapons) {
    if (!canEquipWeapon(weapon, levels)) continue;
    if (!equipSet.has(weapon.name)) continue;

    const validStyles = weapon.styles.filter(s =>
      s.skill === skill || s.skill === 'shared'
    );

    for (const style of validStyles) {
      const gear = solveBestGear({
        weapon,
        style,
        levels,
        monster: DEFAULT_MONSTER,
        availableEquipment: equipSet,
      });

      const stats = evaluateSetup({
        weapon,
        style,
        gear,
        levels,
        monster: DEFAULT_MONSTER,
      });

      // Shared (controlled) splits XP 3 ways
      const effectiveXphr = style.skill === 'shared'
        ? stats.xpPerHour / 3
        : stats.xpPerHour;

      if (!bestResult || effectiveXphr > bestResult.xpPerHour) {
        bestResult = {
          weapon,
          style,
          gear,
          stats,
          xpPerHour: effectiveXphr,
          isShared: style.skill === 'shared',
        };
      }
    }
  }

  return bestResult;
}

/**
 * Compute the best possible DPS at given levels (using any weapon/style combo).
 * Used by the lookahead to evaluate which skill level-up helps future training most.
 */
function bestDpsAtLevels(levels, equipSet, availableWeapons) {
  let best = 0;

  for (const weapon of availableWeapons) {
    if (!canEquipWeapon(weapon, levels)) continue;
    if (!equipSet.has(weapon.name)) continue;

    for (const style of weapon.styles) {
      const gear = solveBestGear({
        weapon,
        style,
        levels,
        monster: DEFAULT_MONSTER,
        availableEquipment: equipSet,
      });

      const stats = evaluateSetup({
        weapon,
        style,
        gear,
        levels,
        monster: DEFAULT_MONSTER,
      });

      if (stats.dps > best) {
        best = stats.dps;
      }
    }
  }

  return best;
}

/**
 * Create a key for detecting when gear/style changes between steps.
 */
function setupKey(skill, setup) {
  const gearNames = Object.values(setup.gear)
    .map(item => item ? item.name : '')
    .join(',');
  return `${skill}|${setup.weapon.name}|${setup.style.name}|${gearNames}`;
}

/**
 * Main optimizer: compute the optimal training path.
 *
 * Lookahead greedy approach:
 * 1. Separate offensive skills (Attack, Strength) from Defence.
 * 2. Train Attack/Strength first using DPS lookahead:
 *    - For each, simulate gaining 1 level and compute resulting best DPS.
 *    - Pick the skill whose level-up yields the highest future DPS.
 *    - Ties broken: Strength > Attack (str affects max hit more directly).
 * 3. Once Attack and Strength goals are met, train Defence.
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

  const rawSteps = [];
  const MAX_ITERATIONS = 300;
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const remainingSkills = SKILLS.filter(s => simLevels[s] < goalLevels[s]);
    if (remainingSkills.length === 0) break;

    // Offensive skills still needing training
    const offensiveRemaining = remainingSkills.filter(s => s !== 'defence');
    // Only consider defence once attack and strength goals are met
    const candidates = offensiveRemaining.length > 0 ? offensiveRemaining : remainingSkills;

    let bestSkill = null;
    let bestSetup = null;

    if (candidates.length === 1) {
      // Only one skill left to train — no choice needed
      bestSkill = candidates[0];
      bestSetup = findBestSetup(bestSkill, simLevels, equipSet, availableWeapons);
    } else {
      // Lookahead: which level-up improves future DPS the most?
      let bestFutureDps = -1;

      for (const skill of candidates) {
        const hypotheticalLevels = { ...simLevels, [skill]: simLevels[skill] + 1 };
        const futureDps = bestDpsAtLevels(hypotheticalLevels, equipSet, availableWeapons);

        // Tie-break: prefer Strength > Attack (str more directly affects max hit)
        const tieBreaker = skill === 'strength' ? 0.0001 : 0;

        if (futureDps + tieBreaker > bestFutureDps) {
          bestFutureDps = futureDps + tieBreaker;
          bestSkill = skill;
        }
      }

      bestSetup = findBestSetup(bestSkill, simLevels, equipSet, availableWeapons);
    }

    if (!bestSkill || !bestSetup) {
      return {
        steps: [],
        error: 'Cannot find any valid training setup. Make sure you have selected at least one weapon with a style that trains your remaining skills.',
      };
    }

    // Train this skill by 1 level
    const nextLevel = simLevels[bestSkill] + 1;
    const xpNeeded = xpForLevel(nextLevel) - simXp[bestSkill];
    const hours = xpNeeded / bestSetup.xpPerHour;

    rawSteps.push({
      skill: bestSkill,
      fromLevel: simLevels[bestSkill],
      toLevel: nextLevel,
      xpNeeded,
      xpPerHour: bestSetup.xpPerHour,
      hours,
      weapon: bestSetup.weapon.name,
      style: bestSetup.style.name,
      stance: bestSetup.style.stance,
      gear: formatGear(bestSetup.gear),
      maxHit: bestSetup.stats.maxHit,
      accuracy: bestSetup.stats.accuracy,
      dps: bestSetup.stats.dps,
      _key: setupKey(bestSkill, bestSetup),
    });

    // Advance simulation
    if (bestSetup.isShared) {
      const xpEach = xpNeeded;
      for (const s of SKILLS) {
        simXp[s] += xpEach;
        simLevels[s] = levelForXp(simXp[s]);
      }
    } else {
      simXp[bestSkill] += xpNeeded;
      simLevels[bestSkill] = nextLevel;
    }
  }

  // Merge consecutive steps with same skill + weapon + style + gear
  const steps = mergeSteps(rawSteps);

  const totalHours = steps.reduce((sum, s) => sum + s.hours, 0);
  const totalXp = {
    attack: simXp.attack - xpForLevel(currentLevels.attack),
    strength: simXp.strength - xpForLevel(currentLevels.strength),
    defence: simXp.defence - xpForLevel(currentLevels.defence),
  };

  return {
    steps,
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

    if (prev._key === curr._key) {
      prev.toLevel = curr.toLevel;
      prev.xpNeeded += curr.xpNeeded;
      prev.hours += curr.hours;
      prev.maxHit = curr.maxHit;
      prev.accuracy = curr.accuracy;
      prev.dps = curr.dps;
      prev.xpPerHour = curr.xpPerHour;
    } else {
      merged.push({ ...curr });
    }
  }

  for (const step of merged) {
    delete step._key;
  }

  return merged;
}
