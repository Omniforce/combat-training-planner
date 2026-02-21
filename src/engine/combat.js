/**
 * OSRS combat formulas for melee DPS calculation.
 */

export function effectiveLevel(baseLevel, stance) {
  let stanceBonus = 0;
  if (stance === "accurate") stanceBonus = 3;
  else if (stance === "controlled") stanceBonus = 1;
  else if (stance === "aggressive") stanceBonus = 3;

  return Math.floor(baseLevel * 1.0) + stanceBonus + 8;
}

export function effectiveStrength(baseLevel, stance) {
  let stanceBonus = 0;
  if (stance === "aggressive") stanceBonus = 3;
  else if (stance === "controlled") stanceBonus = 1;

  return Math.floor(baseLevel * 1.0) + stanceBonus + 8;
}

export function maxAttackRoll(effAttack, equipAttackBonus) {
  return effAttack * (equipAttackBonus + 64);
}

export function maxDefenceRoll(monsterDefLevel, monsterDefBonus) {
  return (monsterDefLevel + 9) * (monsterDefBonus + 64);
}

export function accuracy(attackRoll, defenceRoll) {
  if (attackRoll > defenceRoll) {
    return 1 - (defenceRoll + 2) / (2 * (attackRoll + 1));
  }
  return attackRoll / (2 * (defenceRoll + 1));
}

export function maxHit(effStrength, equipStrengthBonus) {
  return Math.floor(0.5 + (effStrength * (equipStrengthBonus + 64)) / 640);
}

export function dps(hitAccuracy, maxHitValue, attackSpeed) {
  const tickSeconds = attackSpeed * 0.6;
  return (hitAccuracy * (maxHitValue / 2)) / tickSeconds;
}

/**
 * Calculate overkill-adjusted XP per hour.
 * Accounts for wasted damage on low-HP monsters.
 * If monsterHp is null (infinite), uses pure DPS with no overkill waste.
 */
export function xpPerHour(hitAccuracy, maxHitValue, attackSpeed, monsterHp) {
  const tickSeconds = attackSpeed * 0.6;
  const avgHit = maxHitValue / 2;
  const avgDmgPerAttack = hitAccuracy * avgHit;

  // Infinite HP (e.g. Gemstone Crab) — every point of damage is XP, no overkill
  if (monsterHp == null) {
    const dpsValue = avgDmgPerAttack / tickSeconds;
    return dpsValue * 4 * 3600;
  }

  const avgAttacksToKill =
    avgDmgPerAttack > 0 ? Math.ceil(monsterHp / avgDmgPerAttack) : Infinity;

  const killsPerHour =
    avgAttacksToKill > 0 ? 3600 / (avgAttacksToKill * tickSeconds) : 0;

  const xpPerKill = monsterHp * 4;

  return killsPerHour * xpPerKill;
}

/**
 * Full DPS calculation given all inputs.
 */
export function calculateCombatStats({
  attackLevel,
  strengthLevel,
  stance,
  equipAttackBonus,
  equipStrengthBonus,
  attackSpeed,
  monster,
  attackType,
  isObsidianSet = false,
  hasBerserkerNecklace = false,
  isObsidianWeapon = false,
}) {
  const effAtk = effectiveLevel(attackLevel, stance);
  const effStr = effectiveStrength(strengthLevel, stance);

  let mh = maxHit(effStr, equipStrengthBonus);
  let atkRoll = maxAttackRoll(effAtk, equipAttackBonus);

  // Obsidian set bonus: +10% accuracy and damage with obsidian weapons
  if (isObsidianSet && isObsidianWeapon) {
    atkRoll = Math.floor(atkRoll * 1.1);
    mh = Math.floor(mh * 1.1);
  }

  // Berserker necklace: +20% damage with obsidian weapons
  if (hasBerserkerNecklace && isObsidianWeapon) {
    mh = Math.floor(mh * 1.2);
  }

  // Select the correct monster defence bonus based on attack type
  let monsterDefBonus = 0;
  if (attackType === "stab") monsterDefBonus = monster.defenceStab;
  else if (attackType === "slash") monsterDefBonus = monster.defenceSlash;
  else if (attackType === "crush") monsterDefBonus = monster.defenceCrush;

  const defRoll = maxDefenceRoll(monster.defenceLevel, monsterDefBonus);
  const acc = accuracy(atkRoll, defRoll);
  const dpsValue = dps(acc, mh, attackSpeed);
  const xphr = xpPerHour(acc, mh, attackSpeed, monster.hitpoints);

  return {
    effectiveAttack: effAtk,
    effectiveStrength: effStr,
    maxHit: mh,
    attackRoll: atkRoll,
    defenceRoll: defRoll,
    accuracy: acc,
    dps: dpsValue,
    xpPerHour: xphr,
  };
}
