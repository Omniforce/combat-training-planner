import weapons from '../data/weapons.json';
import armorData from '../data/armor.json';
import monsters from '../data/monsters.json';
import { xpForLevel, levelForXp } from './xp.js';
import { canEquipWeapon, solveBestGear, sumGearBonuses } from './gear-solver.js';
import { calculateCombatStats } from './combat.js';

const SKILLS = ['attack', 'strength', 'defence'];
const DEFAULT_MONSTER = monsters.find(m => m.name === 'Gemstone Crab') || monsters[0];

/* ─── MinHeap ─── */

class MinHeap {
  constructor() { this.data = []; }

  push(item) {
    this.data.push(item);
    this._up(this.data.length - 1);
  }

  pop() {
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = last;
      this._down(0);
    }
    return top;
  }

  get size() { return this.data.length; }

  _up(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.data[p].cost <= this.data[i].cost) break;
      [this.data[p], this.data[i]] = [this.data[i], this.data[p]];
      i = p;
    }
  }

  _down(i) {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.data[l].cost < this.data[smallest].cost) smallest = l;
      if (r < n && this.data[r].cost < this.data[smallest].cost) smallest = r;
      if (smallest === i) break;
      [this.data[smallest], this.data[i]] = [this.data[i], this.data[smallest]];
      i = smallest;
    }
  }
}

/* ─── Gear Precomputation Cache ─── */

function collectThresholds(equipSet) {
  const atkSet = new Set();
  const defSet = new Set();

  for (const w of weapons) {
    if (!equipSet.has(w.name)) continue;
    atkSet.add(w.requirements?.attack || 1);
  }

  for (const slot of Object.values(armorData)) {
    for (const item of slot) {
      if (!equipSet.has(item.name)) continue;
      defSet.add(item.requirements?.defence || 1);
    }
  }

  atkSet.add(1);
  defSet.add(1);

  return {
    atkThresholds: [...atkSet].sort((a, b) => a - b),
    defThresholds: [...defSet].sort((a, b) => a - b),
  };
}

function getThresholdLevel(level, thresholds) {
  let best = thresholds[0];
  for (const t of thresholds) {
    if (t <= level) best = t;
    else break;
  }
  return best;
}

function buildGearCache(equipSet, availableWeapons) {
  const { atkThresholds, defThresholds } = collectThresholds(equipSet);
  const cache = new Map();

  for (const atkT of atkThresholds) {
    for (const defT of defThresholds) {
      const key = `${atkT},${defT}`;
      const entries = [];
      const levels = { attack: atkT, strength: 1, defence: defT };

      for (const weapon of availableWeapons) {
        if (!canEquipWeapon(weapon, levels)) continue;

        for (const style of weapon.styles) {
          const gear = solveBestGear({
            weapon, style, levels,
            monster: DEFAULT_MONSTER,
            availableEquipment: equipSet,
          });

          const attackType = style.type;
          const bonuses = sumGearBonuses(gear, attackType);

          let weaponAttackBonus = 0;
          if (attackType === 'stab') weaponAttackBonus = weapon.attackStab || 0;
          else if (attackType === 'slash') weaponAttackBonus = weapon.attackSlash || 0;
          else if (attackType === 'crush') weaponAttackBonus = weapon.attackCrush || 0;

          const countObs = Object.values(gear).filter(g => g && g.isObsidian).length;

          entries.push({
            weapon,
            style,
            gear,
            equipAttackBonus: bonuses.attackBonus + weaponAttackBonus,
            equipStrengthBonus: bonuses.strengthBonus + (weapon.strengthBonus || 0),
            attackSpeed: weapon.attackSpeed,
            attackType,
            isObsidianSet: countObs >= 3,
            hasBerserkerNecklace: !!(gear.neck && gear.neck.isObsidian),
            isObsidianWeapon: weapon.isObsidian || false,
          });
        }
      }

      cache.set(key, entries);
    }
  }

  return { cache, atkThresholds, defThresholds };
}

/* ─── Fast Cached DPS Evaluation ─── */

function findBestSetupCached(skill, levels, gearCache) {
  const atkT = getThresholdLevel(levels.attack, gearCache.atkThresholds);
  const defT = getThresholdLevel(levels.defence, gearCache.defThresholds);
  const entries = gearCache.cache.get(`${atkT},${defT}`) || [];

  let bestXphr = 0;
  let bestEntry = null;

  for (const entry of entries) {
    if (entry.style.skill !== skill && entry.style.skill !== 'shared') continue;
    if (!canEquipWeapon(entry.weapon, levels)) continue;

    const stats = calculateCombatStats({
      attackLevel: levels.attack,
      strengthLevel: levels.strength,
      stance: entry.style.stance,
      equipAttackBonus: entry.equipAttackBonus,
      equipStrengthBonus: entry.equipStrengthBonus,
      attackSpeed: entry.attackSpeed,
      monster: DEFAULT_MONSTER,
      attackType: entry.attackType,
      isObsidianSet: entry.isObsidianSet,
      hasBerserkerNecklace: entry.hasBerserkerNecklace,
      isObsidianWeapon: entry.isObsidianWeapon,
    });

    const effectiveXphr = entry.style.skill === 'shared'
      ? stats.xpPerHour / 3
      : stats.xpPerHour;

    if (effectiveXphr > bestXphr) {
      bestXphr = effectiveXphr;
      bestEntry = { ...entry, stats, xpPerHour: effectiveXphr, isShared: entry.style.skill === 'shared' };
    }
  }

  return bestEntry;
}

function findBestControlledCached(levels, gearCache) {
  const atkT = getThresholdLevel(levels.attack, gearCache.atkThresholds);
  const defT = getThresholdLevel(levels.defence, gearCache.defThresholds);
  const entries = gearCache.cache.get(`${atkT},${defT}`) || [];

  let bestXphr = 0;
  let bestEntry = null;

  for (const entry of entries) {
    if (entry.style.skill !== 'shared') continue;
    if (!canEquipWeapon(entry.weapon, levels)) continue;

    const stats = calculateCombatStats({
      attackLevel: levels.attack,
      strengthLevel: levels.strength,
      stance: entry.style.stance,
      equipAttackBonus: entry.equipAttackBonus,
      equipStrengthBonus: entry.equipStrengthBonus,
      attackSpeed: entry.attackSpeed,
      monster: DEFAULT_MONSTER,
      attackType: entry.attackType,
      isObsidianSet: entry.isObsidianSet,
      hasBerserkerNecklace: entry.hasBerserkerNecklace,
      isObsidianWeapon: entry.isObsidianWeapon,
    });

    const perSkillXphr = stats.xpPerHour / 3;
    if (perSkillXphr > bestXphr) {
      bestXphr = perSkillXphr;
      bestEntry = { ...entry, stats, xpPerHour: perSkillXphr, totalXpPerHour: stats.xpPerHour };
    }
  }

  return bestEntry;
}

/* ─── Controlled Block Simulation ─── */

/**
 * Simulate controlled training from a starting state with proper XP carry-over.
 * Advances all below-goal skills equally until fewer than 2 skills remain below goal.
 * Returns the accurate final levels and total training hours.
 */
function simulateControlledBlock(startA, startS, startD, goalA, goalS, goalD, gearCache) {
  const simXp = {
    attack: xpForLevel(startA),
    strength: xpForLevel(startS),
    defence: xpForLevel(startD),
  };
  const goals = { attack: goalA, strength: goalS, defence: goalD };
  let totalHours = 0;

  while (true) {
    const simLevels = {
      attack: levelForXp(simXp.attack),
      strength: levelForXp(simXp.strength),
      defence: levelForXp(simXp.defence),
    };

    const advancing = SKILLS.filter(sk => simLevels[sk] < goals[sk]);
    if (advancing.length < 2) break;

    // Bottleneck: skill needing the most XP to reach its next level from current XP
    let maxXpNeeded = 0;
    for (const sk of advancing) {
      const needed = xpForLevel(simLevels[sk] + 1) - simXp[sk];
      if (needed > maxXpNeeded) maxXpNeeded = needed;
    }

    const controlled = findBestControlledCached(simLevels, gearCache);
    if (!controlled || controlled.xpPerHour <= 0) break;

    totalHours += maxXpNeeded / controlled.xpPerHour;

    for (const sk of advancing) {
      simXp[sk] += maxXpNeeded;
    }
  }

  const finalLevels = {
    attack: Math.min(levelForXp(simXp.attack), goalA),
    strength: Math.min(levelForXp(simXp.strength), goalS),
    defence: Math.min(levelForXp(simXp.defence), goalD),
  };

  return { finalLevels, totalHours };
}

/* ─── 3D Dijkstra ─── */

function dijkstra(startLevels, goalLevels, gearCache) {
  const sa = startLevels.attack, ss = startLevels.strength, sd = startLevels.defence;
  const ga = goalLevels.attack, gs = goalLevels.strength, gd = goalLevels.defence;

  const sizeA = ga - sa + 1;
  const sizeS = gs - ss + 1;
  const sizeD = gd - sd + 1;
  const totalStates = sizeA * sizeS * sizeD;

  const idx = (a, s, d) => (a - sa) * sizeS * sizeD + (s - ss) * sizeD + (d - sd);

  const dist = new Float64Array(totalStates);
  dist.fill(Infinity);

  // prev stores: [fromA, fromS, fromD, transitionType]
  // transitionType: 0=attack, 1=strength, 2=defence, 3=controlled block
  const prev = new Array(totalStates).fill(null);

  const startIdx = idx(sa, ss, sd);
  dist[startIdx] = 0;

  const heap = new MinHeap();
  heap.push({ cost: 0, a: sa, s: ss, d: sd });

  const goalIdx = idx(ga, gs, gd);

  while (heap.size > 0) {
    const { cost, a, s, d } = heap.pop();
    const ci = idx(a, s, d);

    if (ci === goalIdx) break;
    if (cost > dist[ci]) continue;

    const levels = { attack: a, strength: s, defence: d };

    // Transition 1: Train attack (a -> a+1)
    if (a < ga) {
      const setup = findBestSetupCached('attack', levels, gearCache);
      if (setup && setup.xpPerHour > 0) {
        const xpNeeded = xpForLevel(a + 1) - xpForLevel(a);
        const edgeCost = xpNeeded / setup.xpPerHour;
        const ni = idx(a + 1, s, d);
        const newCost = cost + edgeCost;
        if (newCost < dist[ni]) {
          dist[ni] = newCost;
          prev[ni] = [a, s, d, 0];
          heap.push({ cost: newCost, a: a + 1, s, d });
        }
      }
    }

    // Transition 2: Train strength (s -> s+1)
    if (s < gs) {
      const setup = findBestSetupCached('strength', levels, gearCache);
      if (setup && setup.xpPerHour > 0) {
        const xpNeeded = xpForLevel(s + 1) - xpForLevel(s);
        const edgeCost = xpNeeded / setup.xpPerHour;
        const ni = idx(a, s + 1, d);
        const newCost = cost + edgeCost;
        if (newCost < dist[ni]) {
          dist[ni] = newCost;
          prev[ni] = [a, s, d, 1];
          heap.push({ cost: newCost, a, s: s + 1, d });
        }
      }
    }

    // Transition 3: Train defence (d -> d+1)
    if (d < gd) {
      const setup = findBestSetupCached('defence', levels, gearCache);
      if (setup && setup.xpPerHour > 0) {
        const xpNeeded = xpForLevel(d + 1) - xpForLevel(d);
        const edgeCost = xpNeeded / setup.xpPerHour;
        const ni = idx(a, s, d + 1);
        const newCost = cost + edgeCost;
        if (newCost < dist[ni]) {
          dist[ni] = newCost;
          prev[ni] = [a, s, d, 2];
          heap.push({ cost: newCost, a, s, d: d + 1 });
        }
      }
    }

    // Transition 4: Controlled block — simulate full controlled training with XP carry-over
    // This avoids the cumulative carry-over loss that per-step controlled transitions suffer.
    const advancing = [];
    if (a < ga) advancing.push('attack');
    if (s < gs) advancing.push('strength');
    if (d < gd) advancing.push('defence');

    if (advancing.length >= 2) {
      const block = simulateControlledBlock(a, s, d, ga, gs, gd, gearCache);
      if (block.totalHours > 0) {
        const { attack: fa, strength: fs, defence: fd } = block.finalLevels;
        if (fa > a || fs > s || fd > d) {
          const ni = idx(fa, fs, fd);
          const newCost = cost + block.totalHours;
          if (newCost < dist[ni]) {
            dist[ni] = newCost;
            prev[ni] = [a, s, d, 3];
            heap.push({ cost: newCost, a: fa, s: fs, d: fd });
          }
        }
      }
    }
  }

  // Reconstruct path
  if (dist[goalIdx] === Infinity) return null;

  const path = [];
  let ca = ga, cs = gs, cd = gd;

  while (ca !== sa || cs !== ss || cd !== sd) {
    const ci = idx(ca, cs, cd);
    const [pa, ps, pd, type] = prev[ci];
    path.push({ fromA: pa, fromS: ps, fromD: pd, toA: ca, toS: cs, toD: cd, type });
    ca = pa;
    cs = ps;
    cd = pd;
  }

  path.reverse();
  return { path, totalCost: dist[goalIdx] };
}

/* ─── Path to Steps ─── */

function pathToSteps(path, startLevels, goalLevels, gearCache) {
  const simXp = {
    attack: xpForLevel(startLevels.attack),
    strength: xpForLevel(startLevels.strength),
    defence: xpForLevel(startLevels.defence),
  };
  const simLevels = { ...startLevels };
  const rawSteps = [];
  const TRANSITION_SKILLS = ['attack', 'strength', 'defence'];

  for (const edge of path) {
    if (edge.type === 3) {
      // Controlled block — expand into per-bottleneck-level steps with XP carry-over
      const goals = { attack: edge.toA, strength: edge.toS, defence: edge.toD };

      while (true) {
        const advancing = SKILLS.filter(sk => simLevels[sk] < goals[sk]);
        if (advancing.length < 2) break;

        const levels = { ...simLevels };
        const controlled = findBestControlledCached(levels, gearCache);
        if (!controlled) break;

        // Bottleneck: skill needing the most XP from its current actual XP
        let maxXpNeeded = 0;
        for (const sk of advancing) {
          const needed = xpForLevel(simLevels[sk] + 1) - simXp[sk];
          if (needed > maxXpNeeded) maxXpNeeded = needed;
        }

        const hours = maxXpNeeded / controlled.xpPerHour;

        const fromLevels = {};
        for (const sk of advancing) fromLevels[sk] = simLevels[sk];

        // Advance XP equally with carry-over
        for (const sk of advancing) {
          simXp[sk] += maxXpNeeded;
          simLevels[sk] = levelForXp(simXp[sk]);
        }

        const toLevels = {};
        for (const sk of advancing) toLevels[sk] = simLevels[sk];

        // Primary skill = the bottleneck (highest level)
        let primarySkill = advancing[0];
        let primaryLvl = 0;
        for (const sk of advancing) {
          if (levels[sk] > primaryLvl) {
            primaryLvl = levels[sk];
            primarySkill = sk;
          }
        }

        rawSteps.push({
          skill: 'shared',
          fromLevel: fromLevels[primarySkill],
          toLevel: toLevels[primarySkill],
          fromLevels,
          toLevels,
          advancingSkills: advancing,
          xpNeeded: maxXpNeeded,
          xpPerHour: controlled.xpPerHour,
          hours,
          weapon: controlled.weapon.name,
          style: controlled.style.name,
          stance: controlled.style.stance,
          gear: formatGear(controlled.gear),
          maxHit: controlled.stats.maxHit,
          accuracy: controlled.stats.accuracy,
          dps: controlled.stats.dps,
          _key: setupKey('shared', controlled),
        });
      }
    } else {
      // Single-skill transition
      const levels = { attack: edge.fromA, strength: edge.fromS, defence: edge.fromD };
      const skill = TRANSITION_SKILLS[edge.type];
      const setup = findBestSetupCached(skill, levels, gearCache);
      if (!setup) continue;

      const fromLevel = simLevels[skill];
      const toLevel = fromLevel + 1;
      const xpNeeded = xpForLevel(toLevel) - simXp[skill];
      const hours = xpNeeded / setup.xpPerHour;

      rawSteps.push({
        skill,
        fromLevel,
        toLevel,
        xpNeeded,
        xpPerHour: setup.xpPerHour,
        hours,
        weapon: setup.weapon.name,
        style: setup.style.name,
        stance: setup.style.stance,
        gear: formatGear(setup.gear),
        maxHit: setup.stats.maxHit,
        accuracy: setup.stats.accuracy,
        dps: setup.stats.dps,
        _key: setupKey(skill, setup),
      });

      if (setup.isShared) {
        const xpEach = xpNeeded;
        for (const s of SKILLS) {
          simXp[s] += xpEach;
          simLevels[s] = levelForXp(simXp[s]);
        }
      } else {
        simXp[skill] += xpNeeded;
        simLevels[skill] = toLevel;
      }
    }
  }

  return { rawSteps, simXp, simLevels };
}

/* ─── Main Optimizer ─── */

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

  // Clamp: if any goal <= current, set goal = current (no training needed)
  const effectiveGoals = {
    attack: Math.max(goalLevels.attack, currentLevels.attack),
    strength: Math.max(goalLevels.strength, currentLevels.strength),
    defence: Math.max(goalLevels.defence, currentLevels.defence),
  };

  // Nothing to train
  if (effectiveGoals.attack === currentLevels.attack &&
      effectiveGoals.strength === currentLevels.strength &&
      effectiveGoals.defence === currentLevels.defence) {
    return { steps: [], totalHours: 0, totalXp: { attack: 0, strength: 0, defence: 0 }, finalLevels: { ...currentLevels }, error: null };
  }

  const gearCache = buildGearCache(equipSet, availableWeapons);
  const result = dijkstra(currentLevels, effectiveGoals, gearCache);

  if (!result) {
    return {
      steps: [],
      error: 'Cannot find any valid training setup. Make sure you have selected at least one weapon with a style that trains your remaining skills.',
    };
  }

  const { rawSteps, simXp, simLevels } = pathToSteps(result.path, currentLevels, effectiveGoals, gearCache);
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

/* ─── Utilities ─── */

function formatGear(gear) {
  const result = {};
  for (const [slot, item] of Object.entries(gear)) {
    result[slot] = item ? item.name : null;
  }
  return result;
}

function setupKey(skill, setup) {
  const gearNames = Object.values(setup.gear)
    .map(item => item ? (item.name || item) : '')
    .join(',');
  return `${skill}|${setup.weapon.name || setup.weapon}|${setup.style.name || setup.style}|${gearNames}`;
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
      if (curr.toLevels) {
        prev.toLevels = { ...curr.toLevels };
      }
    } else {
      merged.push({ ...curr });
    }
  }

  for (const step of merged) {
    delete step._key;
  }

  return merged;
}
