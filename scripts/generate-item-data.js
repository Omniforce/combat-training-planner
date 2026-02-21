#!/usr/bin/env node
/**
 * Build-time script that downloads item data from osrsreboxed-db,
 * filters to melee-relevant equipment, and writes weapons.json and armor.json.
 *
 * Usage: node scripts/generate-item-data.js
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { COMBAT_STYLE_MAP, MELEE_WEAPON_TYPES } from './combat-style-map.js';

// Items not yet in osrsreboxed-db (new releases, etc.)
const CUSTOM_ITEMS = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'custom-items.json'), 'utf-8')
);

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CACHE_DIR = join(ROOT, '.cache');
const CACHE_FILE = join(CACHE_DIR, 'items-complete.json');
const WEAPONS_OUT = join(ROOT, 'src', 'data', 'weapons.json');
const ARMOR_OUT = join(ROOT, 'src', 'data', 'armor.json');

const ITEMS_URL =
  'https://raw.githubusercontent.com/0xNeffarion/osrsreboxed-db/master/docs/items-complete.json';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function downloadItems() {
  if (existsSync(CACHE_FILE)) {
    console.log('Using cached items-complete.json');
    return JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
  }

  console.log('Downloading items-complete.json (~50 MB) …');
  const res = await fetch(ITEMS_URL);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const text = await res.text();

  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE_FILE, text);
  console.log('Cached to .cache/items-complete.json');

  return JSON.parse(text);
}

/** True for items we should skip entirely. */
function isJunk(item) {
  if (!item.equipable_by_player) return true;
  if (item.duplicate) return true;
  if (item.noted) return true;
  if (item.placeholder) return true;
  if (!item.equipment) return true;
  // Skip items with variant/state suffixes indicating non-standard versions
  if (/\((broken|damaged|deadman|lms|last man standing|historical|beta|bounty hunter)\)/i.test(item.name)) return true;
  return false;
}

/** Detect obsidian items by name. */
function isObsidian(name) {
  return /\b(obsidian|toktz|tzhaar|berserker necklace)\b/i.test(name);
}

/**
 * Strip variant suffixes to get a base name for deduplication.
 * e.g. "Dragon scimitar (or)" → "Dragon scimitar"
 */
function baseName(name) {
  return name
    .replace(/\s*\((p|p\+|p\+\+|or|cr|u|t|l|nz|bh|inactive|basic|attuned|perfected)\)\s*$/i, '')
    .replace(/\s*\((last man standing|deadman|tournament|beta|historical|cosmetic)\)\s*$/i, '')
    .trim();
}

/**
 * Pick the best variant among duplicates sharing the same base name.
 * Prefers the plain base-name version, falls back to highest strength bonus.
 */
function dedup(items) {
  const groups = new Map();
  for (const item of items) {
    const base = baseName(item.name);
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base).push(item);
  }

  const result = [];
  for (const [base, variants] of groups) {
    // Prefer the exact base name match
    const exact = variants.find(v => v.name === base);
    if (exact) {
      result.push(exact);
    } else {
      // Pick highest strength bonus
      variants.sort((a, b) =>
        (b.equipment.requirements?.strength || 0) - (a.equipment.requirements?.strength || 0)
      );
      result.push(variants[0]);
    }
  }
  return result;
}

// ─── Wiki Requirement Fetching ──────────────────────────────────────────────

const WIKI_API = 'https://oldschool.runescape.wiki/api.php';
const WIKI_USER_AGENT = 'osrs-optimal-training/1.0 (item-data-generator)';
const WIKI_BATCH_SIZE = 50;
const WIKI_DELAY_MS = 50;

/**
 * Hardcoded fallback requirements for items where wiki parsing fails or
 * the wiki page doesn't exist / has unusual formatting.
 */
const FALLBACK_REQUIREMENTS = {
  // Weapons
  'Soulreaper axe':       { attack: 80, strength: 80 },
  "Osmumten's fang":      { attack: 82 },
  'Voidwaker':            { attack: 75 },
  'Ancient godsword':     { attack: 75 },
  'Dual macuahuitl':      { attack: 80 },
  'Elder maul':           { attack: 75, strength: 75 },
  'Ghrazi rapier':        { attack: 75 },
  'Inquisitor\'s mace':   { attack: 75, strength: 25 },
  'Blade of saeldor':     { attack: 75 },
  'Scythe of vitur':      { attack: 75, strength: 75 },
  'Dragon hunter lance':  { attack: 70 },
  'Abyssal bludgeon':     { attack: 70 },
  'Abyssal dagger':       { attack: 70 },
  'Abyssal whip':         { attack: 70 },
  'Saradomin sword':      { attack: 70 },
  'Zamorakian hasta':     { attack: 70 },
  'Zamorakian spear':     { attack: 70 },
  "Viggora's chainmace":  { attack: 60 },
  'Dragon scimitar':      { attack: 60 },
  'Dragon longsword':     { attack: 60 },
  'Dragon mace':          { attack: 60 },
  'Dragon dagger':        { attack: 60 },
  'Dragon sword':         { attack: 60 },
  'Dragon halberd':       { attack: 60 },
  'Dragon 2h sword':      { attack: 60 },
  'Dragon battleaxe':     { attack: 60 },
  'Dragon warhammer':     { attack: 60 },
  'Dragon claws':         { attack: 60 },
  'Granite maul':         { attack: 50, strength: 50 },
  'Granite hammer':       { attack: 50, strength: 50 },
  'Granite longsword':    { attack: 50, strength: 50 },
  'Leaf-bladed sword':    { attack: 50 },
  'Leaf-bladed battleaxe':{ attack: 65 },
  'Sarachnis cudgel':     { attack: 65 },
  'Barrelchest anchor':   { attack: 60, strength: 40 },
  'Arclight':             { attack: 75 },
  'Darklight':            { attack: 1 },
  'Ham joint':            { attack: 1 },
  'Wolfbane':             { attack: 1 },
  // Cosmetic weapon variants
  'Holy ghrazi rapier':   { attack: 75 },
  'Holy scythe of vitur': { attack: 75, strength: 75 },
  'Holy scythe of vitur (uncharged)': { attack: 75, strength: 75 },
  'Sanguine scythe of vitur':       { attack: 75, strength: 75 },
  'Sanguine scythe of vitur (uncharged)': { attack: 75, strength: 75 },
  'Corrupted scythe of vitur (uncharged)': { attack: 75, strength: 75 },
  // Parenthesized variants
  'Dragon dagger (p)(cr)':    { attack: 60 },
  'Dragon dagger (p+)(cr)':   { attack: 60 },
  'Dragon dagger (p++)(cr)':  { attack: 60 },
  'Dragon spear (p)(cr)':     { attack: 60 },
  'Dragon spear (p+)(cr)':    { attack: 60 },
  'Dragon spear (p++)(cr)':   { attack: 60 },
  'Abyssal dagger (bh)(p)':   { attack: 70 },
  // Newer/special weapons
  'Sunlight spear':       { attack: 80, strength: 80 },
  'Thunder khopesh':      { attack: 80, strength: 80 },
  'Ursine chainmace':     { attack: 70 },
  "Dinh's blazing bulwark": { attack: 75, defence: 75 },
  'Crystal dagger (perfected)': { attack: 70 },
  'Blisterwood sickle':   { attack: 1 },
  'Corrupted halberd (basic)': { attack: 70 },
  'Crystal sceptre':      { attack: 70 },
  'Corrupted sceptre':    { attack: 70 },
  // Felling axes (same req as base axe)
  '3rd age felling axe':  { attack: 65 },
  'Dragon felling axe':   { attack: 60 },
  'Rune felling axe':     { attack: 40 },
  'Adamant felling axe':  { attack: 30 },
  'Mithril felling axe':  { attack: 20 },
  'Black felling axe':    { attack: 10 },
  'Steel felling axe':    { attack: 5 },
  'Iron felling axe':     { attack: 1 },
  'Bronze felling axe':   { attack: 1 },
  // Sanguine torva variants
  'Sanguine torva full helm': { defence: 80 },
  'Sanguine torva platebody': { defence: 80 },
  'Sanguine torva platelegs': { defence: 80 },
  // Masori (f) variants
  'Masori mask (f)':      { defence: 80 },
  'Masori body (f)':      { defence: 80 },
  'Masori chaps (f)':     { defence: 80 },
  // Armor - Head
  'Torva full helm':      { defence: 80 },
  'Justiciar faceguard':  { defence: 75 },
  'Neitiznot faceguard':  { defence: 70 },
  'Helm of neitiznot':    { defence: 55 },
  'Serpentine helm':      { defence: 75 },
  'Inquisitor\'s great helm': { defence: 30, strength: 70 },
  'Berserker helm':       { defence: 45 },
  'Fighter hat':          { defence: 45 },
  // Armor - Body
  'Torva platebody':      { defence: 80 },
  'Justiciar chestguard': { defence: 75 },
  'Bandos chestplate':    { defence: 65 },
  'Fighter torso':        { defence: 40 },
  'Inquisitor\'s hauberk':{ defence: 30, strength: 70 },
  // Armor - Legs
  'Torva platelegs':      { defence: 80 },
  'Justiciar legguards':  { defence: 75 },
  'Bandos tassets':       { defence: 65 },
  'Inquisitor\'s plateskirt': { defence: 30, strength: 70 },
  // Armor - Boots
  'Primordial boots':     { defence: 75 },
  'Guardian boots':       { defence: 75 },
  'Dragon boots':         { defence: 60 },
  // Armor - Gloves
  'Ferocious gloves':     { attack: 80, defence: 80 },
  'Barrows gloves':       { defence: 41 },
  'Dragon gloves':        { defence: 1 },
  'Rune gloves':          { defence: 1 },
  // Armor - Cape
  'Infernal cape':        { defence: 1 },
  'Fire cape':            { defence: 1 },
  'Mythical cape':        { defence: 1 },
  // Armor - Neck
  'Amulet of torture':    { defence: 1 },
  'Amulet of fury':       { defence: 1 },
  'Amulet of glory':      { defence: 1 },
  // Armor - Ring
  'Bellator ring':        { defence: 1 },
  'Berserker ring':       { defence: 1 },
  'Warrior ring':         { defence: 1 },
  'Brimstone ring':       { defence: 1 },
  // Armor - Shield
  'Avernic defender':     { attack: 70, defence: 70 },
  'Dragon defender':      { attack: 60, defence: 60 },
  'Rune defender':        { attack: 40, defence: 40 },
  'Dragonfire shield':    { defence: 75 },
  'Toktz-ket-xil':       { defence: 60 },
  "Ghommal's avernic defender 5": { attack: 70, defence: 70 },
  "Ghommal's avernic defender 6": { attack: 70, defence: 70 },
  'Dragon defender (l)(t)': { attack: 60, defence: 60 },
  'Rune defender (l)(t)':   { attack: 40, defence: 40 },
  // Wrapped glove variants (same reqs as base)
  'Barrows gloves (wrapped)': { defence: 41 },
  'Rune gloves (wrapped)':    { defence: 1 },
  'Mithril gloves (wrapped)': { defence: 1 },
  // Rings
  'Ultor ring':           { defence: 1 },
  'Emperor ring':         { defence: 1 },
};

const MELEE_SKILLS = new Set(['attack', 'strength', 'defence']);

/**
 * Fetch wikitext for a batch of page titles from the OSRS Wiki.
 * Returns a Map of title → wikitext.
 */
async function fetchWikiPages(titles) {
  const params = new URLSearchParams({
    action: 'query',
    prop: 'revisions',
    rvprop: 'content',
    format: 'json',
    titles: titles.join('|'),
  });

  const res = await fetch(`${WIKI_API}?${params}`, {
    headers: { 'User-Agent': WIKI_USER_AGENT },
  });
  if (!res.ok) return new Map();

  const data = await res.json();
  const pages = data.query?.pages || {};
  const result = new Map();

  for (const page of Object.values(pages)) {
    if (page.missing !== undefined) continue;
    const text = page.revisions?.[0]?.['*'];
    if (text) {
      result.set(page.title, text);
    }
  }

  return result;
}

/**
 * Parse wikitext to extract combat level requirements.
 * Looks for patterns like:
 *   "requires 80 [[Attack]] and [[Strength]] to wield"
 *   "requires 70 [[Attack]] to wield"
 *   "requires an Attack level of 70"
 *   "requires level 60 [[Attack]]"
 *   "requires 60 [[Attack]] and 50 [[Strength]]"
 */
function parseRequirementsFromWikitext(wikitext) {
  // Only look at the first ~2000 chars (intro paragraph area)
  const intro = wikitext.slice(0, 2000);
  const reqs = {};

  // Pattern 1: "requires X [[Skill]] and [[Skill2]]" (same level for both)
  const sameLevel = intro.match(/requires?\s+(\d+)\s+\[\[(\w+)\]\]\s+and\s+\[\[(\w+)\]\]/i);
  if (sameLevel) {
    const level = parseInt(sameLevel[1]);
    const skill1 = sameLevel[2].toLowerCase();
    const skill2 = sameLevel[3].toLowerCase();
    if (MELEE_SKILLS.has(skill1)) reqs[skill1] = level;
    if (MELEE_SKILLS.has(skill2)) reqs[skill2] = level;
  }

  // Pattern 2: "requires X [[Skill]] and Y [[Skill2]]" (different levels)
  if (Object.keys(reqs).length === 0) {
    const diffLevel = intro.match(/requires?\s+(\d+)\s+\[\[(\w+)\]\]\s+and\s+(\d+)\s+\[\[(\w+)\]\]/i);
    if (diffLevel) {
      const level1 = parseInt(diffLevel[1]);
      const skill1 = diffLevel[2].toLowerCase();
      const level2 = parseInt(diffLevel[3]);
      const skill2 = diffLevel[4].toLowerCase();
      if (MELEE_SKILLS.has(skill1)) reqs[skill1] = level1;
      if (MELEE_SKILLS.has(skill2)) reqs[skill2] = level2;
    }
  }

  // Pattern 3: "requires X [[Skill]]" (single skill)
  if (Object.keys(reqs).length === 0) {
    const single = intro.match(/requires?\s+(?:an?\s+)?(\d+)\s+\[\[(\w+)\]\]/i);
    if (single) {
      const level = parseInt(single[1]);
      const skill = single[2].toLowerCase();
      if (MELEE_SKILLS.has(skill)) reqs[skill] = level;
    }
  }

  // Pattern 4: "requires a/an Skill level of X"
  if (Object.keys(reqs).length === 0) {
    const levelOf = intro.match(/requires?\s+(?:an?\s+)?(\w+)\s+level\s+of\s+(\d+)/i);
    if (levelOf) {
      const skill = levelOf[1].toLowerCase();
      const level = parseInt(levelOf[2]);
      if (MELEE_SKILLS.has(skill)) reqs[skill] = level;
    }
  }

  // Pattern 5: "requires level X [[Skill]]"
  if (Object.keys(reqs).length === 0) {
    const levelSkill = intro.match(/requires?\s+level\s+(\d+)\s+\[\[(\w+)\]\]/i);
    if (levelSkill) {
      const level = parseInt(levelSkill[1]);
      const skill = levelSkill[2].toLowerCase();
      if (MELEE_SKILLS.has(skill)) reqs[skill] = level;
    }
  }

  // Also scan for additional individual skill mentions (e.g. "X [[Attack]]...Y [[Strength]]")
  const allMentions = [...intro.matchAll(/(\d+)\s+\[\[(Attack|Strength|Defence)\]\]/gi)];
  for (const match of allMentions) {
    const level = parseInt(match[1]);
    const skill = match[2].toLowerCase();
    if (MELEE_SKILLS.has(skill) && !reqs[skill] && level > 1) {
      reqs[skill] = level;
    }
  }

  return reqs;
}

/**
 * Fill in missing requirements for items by querying the OSRS Wiki.
 * Modifies items in-place.
 */
async function fillMissingRequirements(weaponsList, armorBySlotMap) {
  // Collect all items
  const allItems = [...weaponsList];
  for (const items of Object.values(armorBySlotMap)) {
    allItems.push(...items);
  }

  // First pass: merge fallback requirements into ALL items (fills partial gaps too)
  let fallbackCount = 0;
  for (const item of allItems) {
    const fb = FALLBACK_REQUIREMENTS[item.name];
    if (!fb) continue;
    let merged = false;
    for (const [skill, level] of Object.entries(fb)) {
      if (level > 1 && !item.requirements[skill]) {
        item.requirements[skill] = level;
        merged = true;
      }
    }
    if (merged) fallbackCount++;
  }

  // Collect items still completely empty after fallback
  const itemsToFix = allItems.filter(item => Object.keys(item.requirements).length === 0);

  if (itemsToFix.length === 0 && fallbackCount === 0) {
    console.log('\nNo items with missing requirements.');
    return;
  }

  console.log(`\nFilling missing requirements…`);
  console.log(`  Applied fallback requirements to ${fallbackCount} items`);

  if (itemsToFix.length === 0) {
    console.log('  No items need wiki lookup.');
    return;
  }

  const stillMissing = itemsToFix;

  console.log(`  Applied ${fallbackCount} fallback requirements`);

  if (stillMissing.length === 0) {
    console.log('  No items need wiki lookup.');
    return;
  }

  console.log(`  Querying OSRS Wiki for ${stillMissing.length} items…`);

  // Build name → item(s) map (multiple items can share a name across slots)
  const nameToItems = new Map();
  for (const item of stillMissing) {
    if (!nameToItems.has(item.name)) nameToItems.set(item.name, []);
    nameToItems.get(item.name).push(item);
  }

  // Wiki page titles: replace spaces with underscores
  const allNames = [...nameToItems.keys()];
  let wikiFound = 0;
  let wikiFailed = 0;

  for (let i = 0; i < allNames.length; i += WIKI_BATCH_SIZE) {
    const batch = allNames.slice(i, i + WIKI_BATCH_SIZE);
    const titles = batch.map(n => n.replace(/ /g, '_'));

    try {
      const pages = await fetchWikiPages(titles);

      for (const name of batch) {
        const wikiTitle = name.replace(/ /g, '_');
        const wikitext = pages.get(name) || pages.get(wikiTitle);
        if (!wikitext) {
          wikiFailed++;
          continue;
        }

        const reqs = parseRequirementsFromWikitext(wikitext);
        if (Object.keys(reqs).length > 0) {
          for (const item of nameToItems.get(name)) {
            Object.assign(item.requirements, reqs);
          }
          wikiFound++;
        } else {
          wikiFailed++;
        }
      }
    } catch (err) {
      console.warn(`  Wiki batch fetch failed: ${err.message}`);
      wikiFailed += batch.length;
    }

    // Rate limit between batches
    if (i + WIKI_BATCH_SIZE < allNames.length) {
      await new Promise(r => setTimeout(r, WIKI_DELAY_MS));
    }
  }

  console.log(`  Wiki: found ${wikiFound}, failed/no-data ${wikiFailed}`);

  // Log items still missing requirements
  const finalMissing = stillMissing.filter(item => Object.keys(item.requirements).length === 0);
  if (finalMissing.length > 0) {
    console.log(`  Still missing requirements (${finalMissing.length}):`);
    for (const item of finalMissing) {
      console.log(`    - ${item.name}`);
    }
  }
}

// ─── Armor slot mapping ─────────────────────────────────────────────────────

const EQUIP_SLOT_TO_ARMOR_SLOT = {
  head: 'head',
  body: 'body',
  legs: 'legs',
  feet: 'boots',
  hands: 'gloves',
  cape: 'cape',
  neck: 'neck',
  ring: 'ring',
  shield: 'shield',
};

const ARMOR_SLOTS = new Set(Object.keys(EQUIP_SLOT_TO_ARMOR_SLOT));

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const allItems = await downloadItems();
  const items = Object.values(allItems);
  console.log(`Loaded ${items.length} total items`);

  const weapons = [];
  const armorBySlot = {
    head: [], body: [], legs: [], boots: [],
    gloves: [], cape: [], neck: [], ring: [], shield: [],
  };

  // ── Pass 1: Weapons ─────────────────────────────────────────────────────
  const weaponCandidates = [];

  for (const item of items) {
    if (isJunk(item)) continue;

    const slot = item.equipment.slot;
    if (slot !== 'weapon' && slot !== '2h') continue;
    if (!item.weapon) continue;

    const wtype = item.weapon.weapon_type;
    if (!MELEE_WEAPON_TYPES.has(wtype)) continue;

    // Skip novelty/cosmetic weapons with negative strength or no offensive stats
    const eq = item.equipment;
    const str = eq.melee_strength || 0;
    const totalAtk = (eq.attack_stab || 0) + (eq.attack_slash || 0) + (eq.attack_crush || 0);
    if (str < 0) continue;
    if (str === 0 && totalAtk <= 0) continue;

    weaponCandidates.push(item);
  }

  for (const item of dedup(weaponCandidates)) {
    const eq = item.equipment;
    const styles = COMBAT_STYLE_MAP[item.weapon.weapon_type];
    if (!styles) continue;

    // Build requirements from equipment requirements (attack, strength, etc.)
    const reqs = {};
    if (eq.requirements) {
      for (const [skill, level] of Object.entries(eq.requirements)) {
        if (level > 1) reqs[skill] = level;
      }
    }

    weapons.push({
      name: item.name,
      attackSpeed: item.weapon.attack_speed,
      requirements: reqs,
      attackStab: eq.attack_stab || 0,
      attackSlash: eq.attack_slash || 0,
      attackCrush: eq.attack_crush || 0,
      strengthBonus: eq.melee_strength || 0,
      twoHanded: eq.slot === '2h',
      styles,
      ...(isObsidian(item.name) ? { isObsidian: true } : {}),
    });
  }

  // Sort weapons by attack requirement then name
  weapons.sort((a, b) => {
    const aReq = a.requirements.attack || 0;
    const bReq = b.requirements.attack || 0;
    if (aReq !== bReq) return aReq - bReq;
    return a.name.localeCompare(b.name);
  });

  // ── Pass 2: Armor ───────────────────────────────────────────────────────
  const armorCandidates = { head: [], body: [], legs: [], boots: [], gloves: [], cape: [], neck: [], ring: [], shield: [] };

  for (const item of items) {
    if (isJunk(item)) continue;

    const slot = item.equipment.slot;
    if (!ARMOR_SLOTS.has(slot)) continue;

    const eq = item.equipment;
    const str = eq.melee_strength || 0;
    const defStab = eq.defence_stab || 0;
    const defSlash = eq.defence_slash || 0;
    const defCrush = eq.defence_crush || 0;
    const totalDef = defStab + defSlash + defCrush;

    // Skip items with no melee relevance
    // Keep if: has strength bonus, OR has significant melee defence (>= 5 total)
    if (str <= 0 && totalDef < 5) continue;

    // Skip magic/ranged-only gear: negative melee attack bonuses with no str bonus
    const atkStab = eq.attack_stab || 0;
    const atkSlash = eq.attack_slash || 0;
    const atkCrush = eq.attack_crush || 0;
    const totalMeleeAtk = atkStab + atkSlash + atkCrush;
    if (str <= 0 && totalMeleeAtk < -15 && totalDef < 30) continue;

    const armorSlot = EQUIP_SLOT_TO_ARMOR_SLOT[slot];
    armorCandidates[armorSlot].push(item);
  }

  for (const [armorSlot, candidates] of Object.entries(armorCandidates)) {
    for (const item of dedup(candidates)) {
      const eq = item.equipment;

      const reqs = {};
      if (eq.requirements) {
        for (const [skill, level] of Object.entries(eq.requirements)) {
          if (level > 1) reqs[skill] = level;
        }
      }

      const piece = {
        name: item.name,
        slot: armorSlot,
        requirements: reqs,
        attackStab: eq.attack_stab || 0,
        attackSlash: eq.attack_slash || 0,
        attackCrush: eq.attack_crush || 0,
        strengthBonus: eq.melee_strength || 0,
        defenceStab: eq.defence_stab || 0,
        defenceSlash: eq.defence_slash || 0,
        defenceCrush: eq.defence_crush || 0,
        ...(isObsidian(item.name) ? { isObsidian: true } : {}),
      };

      armorBySlot[armorSlot].push(piece);
    }

    // Sort each slot by defence requirement then name
    armorBySlot[armorSlot].sort((a, b) => {
      const aReq = a.requirements.defence || 0;
      const bReq = b.requirements.defence || 0;
      if (aReq !== bReq) return aReq - bReq;
      return a.name.localeCompare(b.name);
    });
  }

  // ── Merge custom items ──────────────────────────────────────────────────
  let customArmorCount = 0;
  for (const piece of CUSTOM_ITEMS.armor || []) {
    const slot = piece.slot;
    if (!armorBySlot[slot]) continue;
    if (armorBySlot[slot].some(a => a.name === piece.name)) continue; // skip if upstream added it
    armorBySlot[slot].push(piece);
    customArmorCount++;
  }
  if (customArmorCount > 0) {
    for (const arr of Object.values(armorBySlot)) {
      arr.sort((a, b) => {
        const aReq = a.requirements.defence || 0;
        const bReq = b.requirements.defence || 0;
        if (aReq !== bReq) return aReq - bReq;
        return a.name.localeCompare(b.name);
      });
    }
    console.log(`  Merged ${customArmorCount} custom armor pieces`);
  }

  let customWeaponCount = 0;
  for (const weapon of CUSTOM_ITEMS.weapons || []) {
    if (weapons.some(w => w.name === weapon.name)) continue;
    weapons.push(weapon);
    customWeaponCount++;
  }
  if (customWeaponCount > 0) {
    weapons.sort((a, b) => {
      const aReq = a.requirements.attack || 0;
      const bReq = b.requirements.attack || 0;
      if (aReq !== bReq) return aReq - bReq;
      return a.name.localeCompare(b.name);
    });
    console.log(`  Merged ${customWeaponCount} custom weapons`);
  }

  // ── Fill missing requirements from OSRS Wiki ──────────────────────────
  await fillMissingRequirements(weapons, armorBySlot);

  // ── Write output ────────────────────────────────────────────────────────
  writeFileSync(WEAPONS_OUT, JSON.stringify(weapons, null, 2) + '\n');
  writeFileSync(ARMOR_OUT, JSON.stringify(armorBySlot, null, 2) + '\n');

  const totalArmor = Object.values(armorBySlot).reduce((s, arr) => s + arr.length, 0);
  console.log(`\nGenerated:`);
  console.log(`  ${WEAPONS_OUT} — ${weapons.length} weapons`);
  console.log(`  ${ARMOR_OUT} — ${totalArmor} armor pieces`);
  for (const [slot, arr] of Object.entries(armorBySlot)) {
    console.log(`    ${slot}: ${arr.length}`);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
