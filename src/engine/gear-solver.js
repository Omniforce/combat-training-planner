import armorData from "../data/armor.json";
import { calculateCombatStats } from "./combat.js";

const SLOTS = [
  "head",
  "body",
  "legs",
  "boots",
  "gloves",
  "cape",
  "neck",
  "ring",
  "shield",
];

/**
 * Filter items in a slot by level requirements and available equipment.
 */
function getAvailableItems(slot, levels, availableEquipment) {
  const items = armorData[slot] || [];
  return items.filter((item) => {
    if (!availableEquipment.has(item.name)) return false;
    const reqs = item.requirements || {};
    for (const [skill, reqLevel] of Object.entries(reqs)) {
      if ((levels[skill] || 1) < reqLevel) return false;
    }
    return true;
  });
}

/**
 * Check if a weapon is equippable at given levels.
 */
export function canEquipWeapon(weapon, levels) {
  const reqs = weapon.requirements || {};
  for (const [skill, reqLevel] of Object.entries(reqs)) {
    if ((levels[skill] || 1) < reqLevel) return false;
  }
  return true;
}

/**
 * Count how many obsidian armor pieces are equipped.
 */
function countObsidianPieces(gear) {
  let count = 0;
  for (const item of Object.values(gear)) {
    if (item && item.isObsidian) count++;
  }
  return count;
}

/**
 * Sum up equipment bonuses from gear.
 */
export function sumGearBonuses(gear, attackType) {
  let attackBonus = 0;
  let strengthBonus = 0;

  for (const item of Object.values(gear)) {
    if (!item) continue;
    if (attackType === "stab") attackBonus += item.attackStab || 0;
    else if (attackType === "slash") attackBonus += item.attackSlash || 0;
    else if (attackType === "crush") attackBonus += item.attackCrush || 0;
    strengthBonus += item.strengthBonus || 0;
  }

  return { attackBonus, strengthBonus };
}

/**
 * Find the best-in-slot gear for a given weapon, style, and levels.
 * Greedy approach: for each slot, pick the item that maximizes XP/hr.
 */
export function solveBestGear({
  weapon,
  style,
  levels,
  monster,
  availableEquipment,
}) {
  const attackType = style.type;
  const gear = {};

  // First pass: pick best item per slot independently based on offensive contribution
  for (const slot of SLOTS) {
    if (slot === "shield" && weapon.twoHanded) {
      gear[slot] = null;
      continue;
    }

    const candidates = getAvailableItems(slot, levels, availableEquipment);
    if (candidates.length === 0) {
      gear[slot] = null;
      continue;
    }

    let bestItem = null;
    let bestXphr = -1;

    for (const item of candidates) {
      const testGear = { ...gear, [slot]: item };
      const bonuses = sumGearBonuses(testGear, attackType);

      // Add weapon bonuses
      let weaponAttackBonus = 0;
      if (attackType === "stab") weaponAttackBonus = weapon.attackStab || 0;
      else if (attackType === "slash")
        weaponAttackBonus = weapon.attackSlash || 0;
      else if (attackType === "crush")
        weaponAttackBonus = weapon.attackCrush || 0;

      const totalAttack = bonuses.attackBonus + weaponAttackBonus;
      const totalStrength = bonuses.strengthBonus + (weapon.strengthBonus || 0);

      // Check obsidian set bonus (3 armor pieces)
      const obsidianArmorCount = countObsidianPieces(testGear);
      const isObsidianSet = obsidianArmorCount >= 3;
      const hasBerserkerNecklace = testGear.neck && testGear.neck.isObsidian;

      const stats = calculateCombatStats({
        attackLevel: levels.attack || 1,
        strengthLevel: levels.strength || 1,
        stance: style.stance,
        equipAttackBonus: totalAttack,
        equipStrengthBonus: totalStrength,
        attackSpeed: weapon.attackSpeed,
        monster,
        attackType,
        isObsidianSet,
        hasBerserkerNecklace,
        isObsidianWeapon: weapon.isObsidian || false,
      });

      if (stats.xpPerHour > bestXphr) {
        bestXphr = stats.xpPerHour;
        bestItem = item;
      }
    }

    gear[slot] = bestItem;
  }

  return gear;
}

/**
 * Evaluate a full weapon + style + gear + monster setup.
 */
export function evaluateSetup({ weapon, style, gear, levels, monster }) {
  const attackType = style.type;
  const bonuses = sumGearBonuses(gear, attackType);

  let weaponAttackBonus = 0;
  if (attackType === "stab") weaponAttackBonus = weapon.attackStab || 0;
  else if (attackType === "slash") weaponAttackBonus = weapon.attackSlash || 0;
  else if (attackType === "crush") weaponAttackBonus = weapon.attackCrush || 0;

  const totalAttack = bonuses.attackBonus + weaponAttackBonus;
  const totalStrength = bonuses.strengthBonus + (weapon.strengthBonus || 0);

  const obsidianArmorCount = countObsidianPieces(gear);
  const isObsidianSet = obsidianArmorCount >= 3;
  const hasBerserkerNecklace = gear.neck && gear.neck.isObsidian;

  return calculateCombatStats({
    attackLevel: levels.attack || 1,
    strengthLevel: levels.strength || 1,
    stance: style.stance,
    equipAttackBonus: totalAttack,
    equipStrengthBonus: totalStrength,
    attackSpeed: weapon.attackSpeed,
    monster,
    attackType,
    isObsidianSet,
    hasBerserkerNecklace,
    isObsidianWeapon: weapon.isObsidian || false,
  });
}
