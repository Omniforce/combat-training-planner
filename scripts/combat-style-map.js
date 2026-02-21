/**
 * Static mapping of osrsreboxed-db weapon_type → combat style arrays.
 * Sourced from OSRS Wiki Module:CombatStyles.
 *
 * Each style: { name, type (stab/slash/crush), stance (accurate/aggressive/controlled/defensive), skill }
 * "skill" is the primary skill trained: attack, strength, defence, or shared (controlled).
 */

export const COMBAT_STYLE_MAP = {
  // Slash swords (scimitars, longswords, etc.)
  'slash_sword': [
    { name: 'Chop', type: 'slash', stance: 'accurate', skill: 'attack' },
    { name: 'Slash', type: 'slash', stance: 'aggressive', skill: 'strength' },
    { name: 'Lunge', type: 'stab', stance: 'controlled', skill: 'shared' },
    { name: 'Block', type: 'slash', stance: 'defensive', skill: 'defence' },
  ],
  // Stab swords (daggers, rapiers, swords)
  'stab_sword': [
    { name: 'Stab', type: 'stab', stance: 'accurate', skill: 'attack' },
    { name: 'Lunge', type: 'stab', stance: 'aggressive', skill: 'strength' },
    { name: 'Slash', type: 'slash', stance: 'controlled', skill: 'shared' },
    { name: 'Block', type: 'stab', stance: 'defensive', skill: 'defence' },
  ],
  // Blunt (maces, hammers)
  'blunt': [
    { name: 'Pound', type: 'crush', stance: 'accurate', skill: 'attack' },
    { name: 'Pummel', type: 'crush', stance: 'aggressive', skill: 'strength' },
    { name: 'Block', type: 'crush', stance: 'defensive', skill: 'defence' },
  ],
  // Axes (battleaxes, etc.)
  'axe': [
    { name: 'Chop', type: 'slash', stance: 'accurate', skill: 'attack' },
    { name: 'Hack', type: 'slash', stance: 'aggressive', skill: 'strength' },
    { name: 'Smash', type: 'crush', stance: 'aggressive', skill: 'strength' },
    { name: 'Block', type: 'slash', stance: 'defensive', skill: 'defence' },
  ],
  // 2h swords
  '2h_sword': [
    { name: 'Chop', type: 'slash', stance: 'accurate', skill: 'attack' },
    { name: 'Slash', type: 'slash', stance: 'aggressive', skill: 'strength' },
    { name: 'Smash', type: 'crush', stance: 'aggressive', skill: 'strength' },
    { name: 'Block', type: 'slash', stance: 'defensive', skill: 'defence' },
  ],
  // Pickaxes
  'pickaxe': [
    { name: 'Spike', type: 'stab', stance: 'accurate', skill: 'attack' },
    { name: 'Impale', type: 'stab', stance: 'aggressive', skill: 'strength' },
    { name: 'Smash', type: 'crush', stance: 'aggressive', skill: 'strength' },
    { name: 'Block', type: 'stab', stance: 'defensive', skill: 'defence' },
  ],
  // Claws
  'claw': [
    { name: 'Chop', type: 'slash', stance: 'accurate', skill: 'attack' },
    { name: 'Slash', type: 'slash', stance: 'aggressive', skill: 'strength' },
    { name: 'Lunge', type: 'stab', stance: 'controlled', skill: 'shared' },
    { name: 'Block', type: 'slash', stance: 'defensive', skill: 'defence' },
  ],
  // Polearms (halberds)
  'polearm': [
    { name: 'Jab', type: 'stab', stance: 'controlled', skill: 'shared' },
    { name: 'Swipe', type: 'slash', stance: 'aggressive', skill: 'strength' },
    { name: 'Fend', type: 'stab', stance: 'defensive', skill: 'defence' },
  ],
  // Spears
  'spear': [
    { name: 'Lunge', type: 'stab', stance: 'controlled', skill: 'shared' },
    { name: 'Swipe', type: 'slash', stance: 'controlled', skill: 'shared' },
    { name: 'Pound', type: 'crush', stance: 'controlled', skill: 'shared' },
    { name: 'Block', type: 'stab', stance: 'defensive', skill: 'defence' },
  ],
  // Spiked (e.g. Inquisitor's mace)
  'spiked': [
    { name: 'Pound', type: 'crush', stance: 'accurate', skill: 'attack' },
    { name: 'Pummel', type: 'crush', stance: 'aggressive', skill: 'strength' },
    { name: 'Spike', type: 'stab', stance: 'controlled', skill: 'shared' },
    { name: 'Block', type: 'crush', stance: 'defensive', skill: 'defence' },
  ],
  // Scythes
  'scythe': [
    { name: 'Reap', type: 'slash', stance: 'accurate', skill: 'attack' },
    { name: 'Chop', type: 'slash', stance: 'aggressive', skill: 'strength' },
    { name: 'Jab', type: 'crush', stance: 'aggressive', skill: 'strength' },
    { name: 'Block', type: 'slash', stance: 'defensive', skill: 'defence' },
  ],
  // Whips
  'whip': [
    { name: 'Flick', type: 'slash', stance: 'accurate', skill: 'attack' },
    { name: 'Lash', type: 'slash', stance: 'controlled', skill: 'shared' },
    { name: 'Deflect', type: 'slash', stance: 'defensive', skill: 'defence' },
  ],
  // Bludgeons
  'bludgeon': [
    { name: 'Pound', type: 'crush', stance: 'aggressive', skill: 'strength' },
    { name: 'Pummel', type: 'crush', stance: 'aggressive', skill: 'strength' },
    { name: 'Block', type: 'crush', stance: 'aggressive', skill: 'strength' },
  ],
  // Bulwarks
  'bulwark': [
    { name: 'Pummel', type: 'crush', stance: 'accurate', skill: 'attack' },
  ],
  // Partisans
  'partisan': [
    { name: 'Stab', type: 'stab', stance: 'accurate', skill: 'attack' },
    { name: 'Lunge', type: 'stab', stance: 'aggressive', skill: 'strength' },
    { name: 'Pound', type: 'crush', stance: 'aggressive', skill: 'strength' },
    { name: 'Block', type: 'stab', stance: 'defensive', skill: 'defence' },
  ],
};

/**
 * Weapon types considered melee (used to filter items from osrsreboxed-db).
 */
export const MELEE_WEAPON_TYPES = new Set(Object.keys(COMBAT_STYLE_MAP));
