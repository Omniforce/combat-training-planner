import xpTable from "../data/xp-table.json";

export function xpForLevel(level) {
  if (level < 1) return 0;
  if (level > 99) return xpTable[99];
  return xpTable[level];
}

export function levelForXp(xp) {
  for (let level = 99; level >= 1; level--) {
    if (xp >= xpTable[level]) return level;
  }
  return 1;
}

export function xpBetweenLevels(fromLevel, toLevel) {
  return xpForLevel(toLevel) - xpForLevel(fromLevel);
}

export function xpToNextLevel(currentLevel) {
  if (currentLevel >= 99) return 0;
  return xpForLevel(currentLevel + 1) - xpForLevel(currentLevel);
}

export function xpRemaining(currentXp, goalLevel) {
  const goalXp = xpForLevel(goalLevel);
  return Math.max(0, goalXp - currentXp);
}
